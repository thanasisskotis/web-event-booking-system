from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    message_id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("events.event_id"), nullable=True)
    subject = Column(String(200), nullable=True)
    body = Column(Text, nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, nullable=False, default=False)


class EventView(Base):
    __tablename__ = "eventviews"

    view_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("events.event_id"), nullable=False, index=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())