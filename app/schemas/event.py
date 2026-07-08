from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.models_event import EventStatus


class TicketTypeIn(BaseModel):
    name: str
    price: Decimal
    quantity: int


class TicketTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_type_id: int
    name: str
    price: Decimal
    quantity: int
    available: int


class EventCreate(BaseModel):
    title: str
    categories: list[str]
    event_type: str
    venue: str
    address: str
    city: str
    country: str
    latitude: float | None = None
    longitude: float | None = None
    start_datetime: datetime
    end_datetime: datetime
    capacity: int
    description: str | None = None
    ticket_types: list[TicketTypeIn]

    @model_validator(mode="after")
    def check_capacity(self):
        total = sum(t.quantity for t in self.ticket_types)
        if total > self.capacity:
            raise ValueError(f"sum of ticket quantities ({total}) exceeds capacity ({self.capacity})")
        return self


class EventUpdate(BaseModel):
    title: str | None = None
    categories: list[str] | None = None
    event_type: str | None = None
    venue: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    capacity: int | None = None
    description: str | None = None
    ticket_types: list[TicketTypeIn] | None = None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: int
    title: str
    event_type: str
    venue: str
    address: str
    city: str
    country: str
    latitude: float | None
    longitude: float | None
    start_datetime: datetime
    end_datetime: datetime
    capacity: int
    organizer_id: int
    status: EventStatus
    description: str | None
    ticket_types: list[TicketTypeOut]

    @field_validator("categories", mode="before")
    @classmethod
    def extract_category_names(cls, v):
        return [c.name if hasattr(c, "name") else c for c in v]
