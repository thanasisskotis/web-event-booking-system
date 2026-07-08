from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import require_approved
from app.database import get_db
from app.models.models_booking import Booking, TicketType
from app.models.models_event import Category, Event, EventStatus
from app.models.models_user import User
from app.schemas.event import EventCreate, EventOut, EventUpdate

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
    return (
        db.query(Event)
        .options(joinedload(Event.ticket_types))
        .filter(Event.organizer_id == user.user_id)
        .all()
    )


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
