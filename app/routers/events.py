from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_optional_user, require_approved
from app.database import get_db
from app.models.models_booking import Booking, BookingStatus, TicketType
from app.models.models_event import Category, Event, EventStatus
from app.models.models_message import Message, EventView
from app.models.models_user import User, UserPrivilege
from app.schemas.booking import BookingForOrganizer
from app.schemas.event import EventCreate, EventOut, EventUpdate
from app.schemas.message import BroadcastCreate, MessageOut
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import UploadFile, File
from app.models.models_event import EventPhoto
from app.services.uploads import save_event_photo, delete_event_photo_file

from fastapi import Query
from sqlalchemy import text, func

router = APIRouter(prefix="/events", tags=["events"])


def _get_or_create_categories(names: list[str], db: Session) -> list[Category]:
    categories = []
    for name in names:
        category = db.query(Category).filter(Category.name == name).first()
        if category is None:
            category = Category(name=name)
            db.add(category)
            db.flush()
        categories.append(category)
    return categories


def _complete_past_events(db: Session) -> None:
    """Lazily move PUBLISHED events whose EndDateTime has passed to COMPLETED.

    There's no scheduler in this deployment, so we do it on the read paths:
    the lifecycle status stays correct without a background job. COMPLETED
    events are non-bookable (booking requires PUBLISHED) and drop out of the
    public browse, but remain visible to their organizer for history.
    """
    now = datetime.now(timezone.utc)
    updated = (
        db.query(Event)
        .filter(Event.status == EventStatus.PUBLISHED, Event.end_datetime < now)
        .update({Event.status: EventStatus.COMPLETED}, synchronize_session=False)
    )
    if updated:
        db.commit()


def _check_capacity(capacity: int, ticket_types: list) -> None:
    total = sum(t.quantity if hasattr(t, "quantity") else t["quantity"] for t in ticket_types)
    if total > capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"sum of ticket quantities ({total}) exceeds capacity ({capacity})",
        )


def _get_owned_event(event_id: int, user: User, db: Session) -> Event:
    event = db.query(Event).options(joinedload(Event.ticket_types)).filter(Event.event_id == event_id).first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.organizer_id != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the organizer of this event")
    return event


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, db: Session = Depends(get_db), user: User = Depends(require_approved)):
    # Same reasoning as the booking block: the admin role is purely
    # administrative, it does not organize events.
    if user.priviledge == UserPrivilege.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The administrator account cannot organize events",
        )

    _check_capacity(payload.capacity, payload.ticket_types)

    event = Event(
        title=payload.title,
        event_type=payload.event_type,
        venue=payload.venue,
        address=payload.address,
        city=payload.city,
        country=payload.country,
        latitude=payload.latitude,
        longitude=payload.longitude,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        capacity=payload.capacity,
        organizer_id=user.user_id,
        status=EventStatus.DRAFT,
        description=payload.description,
    )
    event.categories = _get_or_create_categories(payload.categories, db)
    event.ticket_types = [
        TicketType(name=t.name, price=t.price, quantity=t.quantity, available=t.quantity)
        for t in payload.ticket_types
    ]
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/mine", response_model=list[EventOut])
def list_my_events(db: Session = Depends(get_db), user: User = Depends(require_approved)):
    _complete_past_events(db)
    return (
        db.query(Event)
        .options(joinedload(Event.ticket_types))
        .filter(Event.organizer_id == user.user_id)
        .all()
    )


@router.get("/{event_id}/bookings", response_model=list[BookingForOrganizer])
def list_event_bookings(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_approved)):
    event = _get_owned_event(event_id, user, db)

    bookings = (
        db.query(Booking)
        .join(TicketType, Booking.ticket_type_id == TicketType.ticket_type_id)
        .filter(TicketType.event_id == event.event_id)
        .options(joinedload(Booking.user), joinedload(Booking.ticket_type))
        .order_by(Booking.booking_time)
        .all()
    )

    return [
        BookingForOrganizer(
            booking_id=b.booking_id,
            user_id=b.user_id,
            ticket_type_id=b.ticket_type_id,
            booking_time=b.booking_time,
            number_of_tickets=b.number_of_tickets,
            total_cost=b.total_cost,
            booking_status=b.booking_status,
            attendee_username=b.user.username,
            attendee_email=b.user.email,
            ticket_type_name=b.ticket_type.name,
        )
        for b in bookings
    ]


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved),
):
    event = _get_owned_event(event_id, user, db)

    has_bookings = db.query(Booking).join(TicketType).filter(TicketType.event_id == event.event_id).first() is not None
    if has_bookings and payload.ticket_types is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change ticket types after the first booking",
        )

    data = payload.model_dump(exclude_unset=True, exclude={"categories", "ticket_types"})
    for field, value in data.items():
        setattr(event, field, value)

    new_capacity = payload.capacity if payload.capacity is not None else event.capacity
    new_ticket_types = payload.ticket_types if payload.ticket_types is not None else event.ticket_types
    _check_capacity(new_capacity, new_ticket_types)

    if payload.categories is not None:
        event.categories = _get_or_create_categories(payload.categories, db)

    if payload.ticket_types is not None:
        event.ticket_types = [
            TicketType(name=t.name, price=t.price, quantity=t.quantity, available=t.quantity)
            for t in payload.ticket_types
        ]

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_approved)):
    event = _get_owned_event(event_id, user, db)

    if event.status != EventStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only unpublished events can be deleted")

    has_bookings = db.query(Booking).join(TicketType).filter(TicketType.event_id == event.event_id).first() is not None
    if has_bookings:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete an event with bookings")

    db.delete(event)
    db.commit()


@router.post("/{event_id}/publish", response_model=EventOut)
def publish_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_approved)):
    event = _get_owned_event(event_id, user, db)
    if event.status != EventStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft events can be published")
    event.status = EventStatus.PUBLISHED
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/cancel", response_model=EventOut)
def cancel_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_approved)):
    event = _get_owned_event(event_id, user, db)
    if event.status != EventStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only published events can be cancelled")
    event.status = EventStatus.CANCELLED
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/notify-cancellation", response_model=list[MessageOut])
def notify_cancellation(
    event_id: int,
    payload: BroadcastCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved),
):
    event = _get_owned_event(event_id, user, db)
    if event.status != EventStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event must be cancelled before broadcasting a cancellation notice",
        )

    attendee_ids = (
        db.query(Booking.user_id)
        .join(TicketType, Booking.ticket_type_id == TicketType.ticket_type_id)
        .filter(TicketType.event_id == event.event_id, Booking.booking_status == BookingStatus.CONFIRMED)
        .distinct()
        .all()
    )

    messages = [
        Message(
            sender_id=user.user_id,
            recipient_id=user_id,
            event_id=event.event_id,
            subject=payload.subject or f"Event cancelled: {event.title}",
            body=payload.body,
        )
        for (user_id,) in attendee_ids
    ]
    db.add_all(messages)
    db.commit()
    for message in messages:
        db.refresh(message)
    return messages


@router.get("", response_model=list[EventOut])
def list_events(
    db: Session = Depends(get_db),
    category: str | None = Query(None, description="Category name"),
    q: str | None = Query(None, description="Free-text search in title/description"),
    city: str | None = None,
    country: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    # Keep the lifecycle current before filtering: past events become COMPLETED
    # and therefore drop out of the PUBLISHED-only browse below.
    _complete_past_events(db)

    # Phase 1: find matching event_ids (select start_datetime too,
    # required by Postgres when combining DISTINCT with ORDER BY).
    # Sold-out events (no ticket type with availability left) are hidden from
    # browse -- there's nothing to book, so they only add noise.
    base = (
        db.query(Event.event_id, Event.start_datetime)
        .filter(
            Event.status == EventStatus.PUBLISHED,
            Event.ticket_types.any(TicketType.available > 0),
        )
    )

    if city:
        base = base.filter(Event.city.ilike(city))
    if country:
        base = base.filter(Event.country.ilike(country))
    if date_from:
        base = base.filter(Event.start_datetime >= date_from)
    if date_to:
        base = base.filter(Event.start_datetime <= date_to)
    if category:
        base = base.join(Event.categories).filter(Category.name == category)
    if min_price is not None or max_price is not None:
        # Filter on each event's cheapest ("from") ticket price -- the value the
        # cards display -- so min/max bound what the user actually sees, and an
        # event can't slip through by matching min on one ticket and max on
        # another (e.g. a 25/60 event showing up under a min_price of 30).
        cheapest = (
            db.query(TicketType.event_id, func.min(TicketType.price).label("from_price"))
            .group_by(TicketType.event_id)
            .subquery()
        )
        base = base.join(cheapest, cheapest.c.event_id == Event.event_id)
        if min_price is not None:
            base = base.filter(cheapest.c.from_price >= min_price)
        if max_price is not None:
            base = base.filter(cheapest.c.from_price <= max_price)
    if q:
        base = base.filter(text("events.search_vector @@ plainto_tsquery('greek', :q)")).params(q=q)

    rows = (
        base.distinct()
        .order_by(Event.start_datetime)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    event_ids = [r[0] for r in rows]
    if not event_ids:
        return []

    # Phase 2: fetch full objects with eager-loaded relationships, no LIMIT here
    events = (
        db.query(Event)
        .options(joinedload(Event.ticket_types), joinedload(Event.categories))
        .filter(Event.event_id.in_(event_ids))
        .all()
    )
    order = {eid: i for i, eid in enumerate(event_ids)}
    events.sort(key=lambda e: order[e.event_id])
    return events


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    _complete_past_events(db)
    event = (
        db.query(Event)
        .options(joinedload(Event.ticket_types), joinedload(Event.categories))
        .filter(Event.event_id == event_id, Event.status == EventStatus.PUBLISHED)
        .first()
    )
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if user is not None:
        db.add(EventView(user_id=user.user_id, event_id=event.event_id))
        db.commit()

    return event


@router.post("/{event_id}/photos", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def upload_event_photo(
    event_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_approved),
):
    event = _get_owned_event(event_id, user, db)
    filename = save_event_photo(file)
    photo = EventPhoto(event_id=event.event_id, file_path=filename)
    db.add(photo)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_photo(
    event_id: int,
    photo_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved),
):
    event = _get_owned_event(event_id, user, db)
    photo = (
        db.query(EventPhoto)
        .filter(EventPhoto.photo_id == photo_id, EventPhoto.event_id == event.event_id)
        .first()
    )
    if photo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    delete_event_photo_file(photo.file_path)
    db.delete(photo)
    db.commit()
