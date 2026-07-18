import enum

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class TicketType(Base):
    __tablename__ = "tickettypes"

    ticket_type_id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    available = Column(Integer, nullable=False)

    event = relationship("Event", back_populates="ticket_types")
    bookings = relationship("Booking", back_populates="ticket_type")


class Booking(Base):
    __tablename__ = "bookings"

    booking_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    ticket_type_id = Column(Integer, ForeignKey("tickettypes.ticket_type_id"), nullable=False, index=True)  # table is "tickettypes", not "ticket_types"
    booking_time = Column(DateTime(timezone=True), server_default=func.now())
    number_of_tickets = Column(Integer, nullable=False)
    total_cost = Column(Numeric(10, 2), nullable=False)
    booking_status = Column(SAEnum(BookingStatus, name="booking_status"), nullable=False, default=BookingStatus.PENDING)

    ticket_type = relationship("TicketType", back_populates="bookings")
    user = relationship("User")
