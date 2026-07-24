from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MessageCreate(BaseModel):
    recipient_id: int
    event_id: int
    subject: str | None = None
    body: str


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    message_id: int
    sender_id: int
    sender_username: str | None = None
    recipient_id: int
    recipient_username: str | None = None
    event_id: int | None
    event_title: str | None = None
    subject: str | None
    body: str
    sent_at: datetime
    is_read: bool


class BroadcastCreate(BaseModel):
    subject: str | None = None
    body: str
