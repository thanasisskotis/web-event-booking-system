import threading
from dataclasses import dataclass

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models_booking import Booking, BookingStatus, TicketType
from app.models.models_event import Event, EventStatus
from app.models.models_message import EventView
from app.recommender.bmf import BiasedMatrixFactorization, Interaction

BOOKING_WEIGHT = 5.0
VIEW_WEIGHT = 1.0

# Retrain once at least this many new signal rows (views + confirmed bookings)
# have shown up since the last training run, instead of every request.
RETRAIN_THRESHOLD = 20


@dataclass
class _TrainedModel:
    model: BiasedMatrixFactorization
    user_index: dict[int, int]
    event_index: dict[int, int]
    event_ids: list[int]
    signals: dict[tuple[int, int], float]
    signal_count_at_train: int


_cache: _TrainedModel | None = None
_cache_lock = threading.Lock()


def _count_signal_rows(db: Session) -> int:
    view_count = db.query(func.count(EventView.view_id)).scalar()
    booking_count = (
        db.query(func.count(Booking.booking_id))
        .filter(Booking.booking_status == BookingStatus.CONFIRMED)
        .scalar()
    )
    return view_count + booking_count


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
        signal_count_at_train=_count_signal_rows(db),
    )


def _get_or_train_model(db: Session) -> _TrainedModel | None:
    global _cache

    signals = _collect_signals(db)
    if not signals:
        return None

    current_count = _count_signal_rows(db)
    needs_training = (
        _cache is None or current_count - _cache.signal_count_at_train >= RETRAIN_THRESHOLD
    )
    if not needs_training:
        return _cache

    with _cache_lock:
        # Re-check inside the lock: another request may have already retrained
        # while we were waiting.
        if _cache is not None and current_count - _cache.signal_count_at_train < RETRAIN_THRESHOLD:
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


def get_recommendations(db: Session, user_id: int, top_n: int = 10) -> list[Event]:
    trained = _get_or_train_model(db)
    if trained is None:
        return _fallback_popular(db, exclude_event_ids=set(), top_n=top_n)

    if user_id not in trained.user_index:
        seen_event_ids = {eid for (uid, eid) in trained.signals if uid == user_id}
        return _fallback_popular(db, exclude_event_ids=seen_event_ids, top_n=top_n)

    scores = trained.model.predict_all_for_user(trained.user_index[user_id])
    already_seen = {trained.event_index[e] for (u, e) in trained.signals if u == user_id}

    ranked_item_indices = sorted(
        (idx for idx in range(len(trained.event_ids)) if idx not in already_seen),
        key=lambda idx: scores[idx],
        reverse=True,
    )
    top_event_ids = [trained.event_ids[idx] for idx in ranked_item_indices[:top_n]]

    if not top_event_ids:
        seen_event_ids = {trained.event_ids[idx] for idx in already_seen}
        return _fallback_popular(db, exclude_event_ids=seen_event_ids, top_n=top_n)

    events_by_id = {
        e.event_id: e
        for e in db.query(Event)
        .filter(Event.event_id.in_(top_event_ids), Event.status == EventStatus.PUBLISHED)
        .all()
    }
    return [events_by_id[eid] for eid in top_event_ids if eid in events_by_id]


def _fallback_popular(db: Session, exclude_event_ids: set[int], top_n: int) -> list[Event]:
    """Cold start: no signal for this user yet. Recommend the most-viewed
    published events instead, per the "falls back to events viewed" rule."""
    query = (
        db.query(Event, func.count(EventView.view_id).label("view_count"))
        .outerjoin(EventView, EventView.event_id == Event.event_id)
        .filter(Event.status == EventStatus.PUBLISHED)
        .group_by(Event.event_id)
    )
    if exclude_event_ids:
        query = query.filter(~Event.event_id.in_(exclude_event_ids))

    rows = query.order_by(func.count(EventView.view_id).desc(), Event.start_datetime).limit(top_n).all()
    return [event for event, _ in rows]
