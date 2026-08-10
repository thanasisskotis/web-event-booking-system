import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models_booking import Booking, BookingStatus, TicketType
from app.models.models_event import Event, EventStatus
from app.models.models_message import EventView
from app.recommender.bmf import BiasedMatrixFactorization, Interaction

BOOKING_WEIGHT = 5.0
VIEW_WEIGHT = 1.0

# Retrain on a fixed time cadence rather than per request or per N new rows:
# the model is fit at most once per interval and served from cache in between.
# (Periodic retraining is the standard recommender-refresh strategy.)
RETRAIN_INTERVAL_SECONDS = 3600  # 1 hour


@dataclass
class _TrainedModel:
    model: BiasedMatrixFactorization
    user_index: dict[int, int]
    event_index: dict[int, int]
    event_ids: list[int]
    signals: dict[tuple[int, int], float]
    trained_at: float  # time.monotonic() at the moment this model was fit


_cache: _TrainedModel | None = None
_cache_lock = threading.Lock()


def _train(db: Session, signals: dict[tuple[int, int], float]) -> _TrainedModel:
    user_ids = sorted({u for u, _ in signals})
    event_ids = sorted({e for _, e in signals})
    user_index = {u: idx for idx, u in enumerate(user_ids)}
    event_index = {e: idx for idx, e in enumerate(event_ids)}

    interactions = [
        Interaction(user_index[u], event_index[e], rating) for (u, e), rating in signals.items()
    ]

    model = BiasedMatrixFactorization(
        n_users=len(user_ids),
        n_items=len(event_ids),
        n_factors=min(10, max(2, len(event_ids) - 1)),
        n_epochs=100,
    )
    model.fit(interactions)

    return _TrainedModel(
        model=model,
        user_index=user_index,
        event_index=event_index,
        event_ids=event_ids,
        signals=signals,
        trained_at=time.monotonic(),
    )


def _get_or_train_model(db: Session) -> _TrainedModel | None:
    global _cache

    signals = _collect_signals(db)
    if not signals:
        return None

    now = time.monotonic()
    needs_training = _cache is None or (now - _cache.trained_at) >= RETRAIN_INTERVAL_SECONDS
    if not needs_training:
        return _cache

    with _cache_lock:
        # Re-check inside the lock: another request may have already retrained
        # while we were waiting.
        if _cache is not None and (time.monotonic() - _cache.trained_at) < RETRAIN_INTERVAL_SECONDS:
            return _cache
        _cache = _train(db, signals)
        return _cache


def _collect_signals(db: Session) -> dict[tuple[int, int], float]:
    """user_id, event_id -> implicit rating. A booking outweighs a view;
    multiple views/bookings on the same event don't stack further."""
    signals: dict[tuple[int, int], float] = {}

    views = db.query(EventView.user_id, EventView.event_id).distinct().all()
    for user_id, event_id in views:
        signals[(user_id, event_id)] = VIEW_WEIGHT

    bookings = (
        db.query(Booking.user_id, TicketType.event_id)
        .join(TicketType, Booking.ticket_type_id == TicketType.ticket_type_id)
        .filter(Booking.booking_status == BookingStatus.CONFIRMED)
        .distinct()
        .all()
    )
    for user_id, event_id in bookings:
        signals[(user_id, event_id)] = BOOKING_WEIGHT

    return signals


def _candidate_event_ids(db: Session, user_id: int) -> set[int]:
    """Events eligible to be recommended to this user: PUBLISHED, not yet ended,
    with at least one ticket still available, and NOT organized by the user
    themselves. Sold-out / past / own events are never recommended."""
    now = datetime.now(timezone.utc)
    rows = (
        db.query(Event.event_id)
        .filter(
            Event.status == EventStatus.PUBLISHED,
            Event.end_datetime > now,
            Event.organizer_id != user_id,
            Event.ticket_types.any(TicketType.available > 0),
        )
        .all()
    )
    return {r[0] for r in rows}


def _seen_event_ids(db: Session, user_id: int) -> set[int]:
    """Events this user has already viewed or confirmed-booked, computed LIVE
    (not from the cached training snapshot) so we never recommend something the
    user has just interacted with, even between periodic retrains."""
    views = db.query(EventView.event_id).filter(EventView.user_id == user_id)
    booked = (
        db.query(TicketType.event_id)
        .join(Booking, Booking.ticket_type_id == TicketType.ticket_type_id)
        .filter(Booking.user_id == user_id, Booking.booking_status == BookingStatus.CONFIRMED)
    )
    return {r[0] for r in views.all()} | {r[0] for r in booked.all()}


def get_recommendations(db: Session, user_id: int, top_n: int = 10) -> list[Event]:
    # Recommendable set is recomputed live every request, independent of the
    # cached model: excludes sold-out, ended, own, and already-seen events.
    recommendable = _candidate_event_ids(db, user_id) - _seen_event_ids(db, user_id)

    trained = _get_or_train_model(db)
    if trained is None or user_id not in trained.user_index:
        return _fallback_popular(db, allowed_event_ids=recommendable, top_n=top_n)

    scores = trained.model.predict_all_for_user(trained.user_index[user_id])
    ranked_item_indices = sorted(
        (idx for idx in range(len(trained.event_ids)) if trained.event_ids[idx] in recommendable),
        key=lambda idx: scores[idx],
        reverse=True,
    )
    top_event_ids = [trained.event_ids[idx] for idx in ranked_item_indices[:top_n]]

    if not top_event_ids:
        return _fallback_popular(db, allowed_event_ids=recommendable, top_n=top_n)

    events_by_id = {
        e.event_id: e for e in db.query(Event).filter(Event.event_id.in_(top_event_ids)).all()
    }
    return [events_by_id[eid] for eid in top_event_ids if eid in events_by_id]


def _fallback_popular(db: Session, allowed_event_ids: set[int], top_n: int) -> list[Event]:
    """Cold start / empty model result: recommend the most-viewed events among
    the already-filtered recommendable set (published, upcoming, available, not
    the user's own, not already seen)."""
    if not allowed_event_ids:
        return []
    rows = (
        db.query(Event, func.count(EventView.view_id).label("view_count"))
        .outerjoin(EventView, EventView.event_id == Event.event_id)
        .filter(Event.event_id.in_(allowed_event_ids))
        .group_by(Event.event_id)
        .order_by(func.count(EventView.view_id).desc(), Event.start_datetime)
        .limit(top_n)
        .all()
    )
    return [event for event, _ in rows]
