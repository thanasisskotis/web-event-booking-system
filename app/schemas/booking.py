from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.models_booking import BookingStatus


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
