import enum

from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class EventStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class Category(Base):
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)


class Event(Base):
    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    event_type = Column(String(100), nullable=False)
    venue = Column(String(200), nullable=False)
    address = Column(String(300), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    country = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    start_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    capacity = Column(Integer, nullable=False)
    organizer_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    status = Column(SAEnum(EventStatus, name="event_status"), nullable=False, default=EventStatus.DRAFT, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organizer = relationship("User")
    ticket_types = relationship("TicketType", back_populates="event", cascade="all, delete-orphan")
    photos = relationship("EventPhoto", cascade="all, delete-orphan")
    categories = relationship("Category", secondary="eventcategories")


class EventCategory(Base):
    __tablename__ = "eventcategories"

    event_id = Column(Integer, ForeignKey("events.event_id", ondelete="CASCADE"), primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), primary_key=True)


class EventPhoto(Base):
    __tablename__ = "eventphotos"

    photo_id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(300), nullable=False)