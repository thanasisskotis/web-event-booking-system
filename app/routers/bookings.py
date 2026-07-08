from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import require_approved
from app.database import get_db
from app.models.models_booking import Booking, BookingStatus, TicketType
from app.models.models_event import Event, EventStatus
from app.models.models_user import User
from app.schemas.booking import BookingCreate, BookingOut

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved),
):
    if payload.number_of_tickets <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="number_of_tickets must be positive")

    ticket_type = (
        db.query(TicketType)
        .options(joinedload(TicketType.event))
        .filter(TicketType.ticket_type_id == payload.ticket_type_id)
        .first()
    )
    if ticket_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket type not found")

    if ticket_type.event.status != EventStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is not open for booking")

    # --- Atomic reservation ---
    # UPDATE ... WHERE available >= requested, all in one statement.
    # Postgres guarantees this single statement is atomic per row: two
    # concurrent requests cannot both "win" the same remaining seats.
    result = db.query(TicketType).filter(
        TicketType.ticket_type_id == payload.ticket_type_id,
        TicketType.available >= payload.number_of_tickets,
    ).update(
        {TicketType.available: TicketType.available - payload.number_of_tickets},
        synchronize_session=False,
    )

    if result == 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not enough tickets available",
        )

    booking = Booking(
        user_id=user.user_id,
        ticket_type_id=ticket_type.ticket_type_id,
        number_of_tickets=payload.number_of_tickets,
        total_cost=ticket_type.price * payload.number_of_tickets,
        booking_status=BookingStatus.CONFIRMED,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/mine", response_model=list[BookingOut])
def list_my_bookings(db: Session = Depends(get_db), user: User = Depends(require_approved)):
    return db.query(Booking).filter(Booking.user_id == user.user_id).all()


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved),
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your booking")
    if booking.booking_status != BookingStatus.CONFIRMED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is not active")

    booking.booking_status = BookingStatus.CANCELLED
    db.query(TicketType).filter(TicketType.ticket_type_id == booking.ticket_type_id).update(
        {TicketType.available: TicketType.available + booking.number_of_tickets},
        synchronize_session=False,
    )
    db.commit()
    db.refresh(booking)
    return booking
