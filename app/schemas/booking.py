from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.models_booking import BookingStatus
from app.models.models_event import EventStatus


class BookingCreate(BaseModel):
    ticket_type_id: int
    number_of_tickets: int


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: int
    user_id: int
    ticket_type_id: int
    booking_time: datetime
    number_of_tickets: int
    total_cost: Decimal
    booking_status: BookingStatus


class BookingForOrganizer(BookingOut):
    attendee_username: str
    attendee_email: str
    ticket_type_name: str


class MyBookingOut(BookingOut):
    # Enriched with the event/organizer context so "My bookings" can name the
    # event and offer to message its organizer (post-booking messaging).
    event_id: int
    event_title: str
    event_status: EventStatus
    organizer_id: int
    ticket_type_name: str
