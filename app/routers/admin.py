from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import require_role
from app.database import get_db
from app.models.models_user import User, UserPrivilege, UserStatus
from app.schemas.user import UserOut

from app.models.models_booking import Booking, TicketType
from app.models.models_event import Event

from lxml import etree

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(UserPrivilege.ADMIN))])


@router.get("/users", response_model=list[UserOut])
def list_users(status_filter: UserStatus | None = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if status_filter is not None:
        query = query.filter(User.status == status_filter)
    return query.all()


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/users/{user_id}/approve", response_model=UserOut)
def approve_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.status = UserStatus.APPROVED
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reject", response_model=UserOut)
def reject_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.status = UserStatus.REJECTED
    db.commit()
    db.refresh(user)
    return user


def _events_to_xml(events: list[Event]) -> bytes:
    root = etree.Element("Events")

    for event in events:
        event_el = etree.SubElement(root, "Event")
        event_el.set("EventID", str(event.event_id))

        etree.SubElement(event_el, "Title").text = event.title
        for category in event.categories:
            etree.SubElement(event_el, "Category").text = category.name
        etree.SubElement(event_el, "EventType").text = event.event_type
        etree.SubElement(event_el, "Venue").text = event.venue
        etree.SubElement(event_el, "Address").text = event.address
        etree.SubElement(event_el, "City").text = event.city
        etree.SubElement(event_el, "Country").text = event.country

        if event.latitude is not None and event.longitude is not None:
            geo_el = etree.SubElement(event_el, "GeoLocation")
            geo_el.set("Latitude", str(event.latitude))
            geo_el.set("Longitude", str(event.longitude))

        etree.SubElement(event_el, "StartDateTime").text = event.start_datetime.isoformat()
        etree.SubElement(event_el, "EndDateTime").text = event.end_datetime.isoformat()
        etree.SubElement(event_el, "Capacity").text = str(event.capacity)

        ticket_types_el = etree.SubElement(event_el, "TicketTypes")
        for tt in event.ticket_types:
            tt_el = etree.SubElement(ticket_types_el, "TicketType")
            tt_el.set("TicketTypeID", str(tt.ticket_type_id))
            etree.SubElement(tt_el, "Name").text = tt.name
            etree.SubElement(tt_el, "Price").text = str(tt.price)
            etree.SubElement(tt_el, "Quantity").text = str(tt.quantity)
            etree.SubElement(tt_el, "Available").text = str(tt.available)

        bookings_el = etree.SubElement(event_el, "Bookings")
        for tt in event.ticket_types:
            for booking in tt.bookings:
                b_el = etree.SubElement(bookings_el, "Booking")
                b_el.set("BookingID", str(booking.booking_id))
                attendee_el = etree.SubElement(b_el, "Attendee")
                attendee_el.set("UserID", booking.user.username)
                etree.SubElement(b_el, "Time").text = booking.booking_time.isoformat()
                etree.SubElement(b_el, "TicketTypeRef").text = str(tt.ticket_type_id)
                etree.SubElement(b_el, "NumberOfTickets").text = str(booking.number_of_tickets)
                etree.SubElement(b_el, "TotalCost").text = str(booking.total_cost)
                etree.SubElement(b_el, "BookingStatus").text = booking.booking_status.value

        organizer_el = etree.SubElement(event_el, "Organizer")
        organizer_el.set("UserID", event.organizer.username)

        etree.SubElement(event_el, "Status").text = event.status.value
        etree.SubElement(event_el, "Description").text = event.description or ""

        if event.photos:
            media_el = etree.SubElement(event_el, "Media")
            for photo in event.photos:
                etree.SubElement(media_el, "Photo").text = photo.file_path

    return etree.tostring(root, pretty_print=True, xml_declaration=True, encoding="UTF-8")


def _events_to_dict(events: list[Event]) -> list[dict]:
    result = []
    for event in events:
        bookings = [
            {
                "booking_id": b.booking_id,
                "attendee_user_id": b.user.username,
                "time": b.booking_time.isoformat(),
                "ticket_type_ref": tt.ticket_type_id,
                "number_of_tickets": b.number_of_tickets,
                "total_cost": str(b.total_cost),
                "booking_status": b.booking_status.value,
            }
            for tt in event.ticket_types
            for b in tt.bookings
        ]
        result.append({
            "event_id": event.event_id,
            "title": event.title,
            "categories": [c.name for c in event.categories],
            "event_type": event.event_type,
            "venue": event.venue,
            "address": event.address,
            "city": event.city,
            "country": event.country,
            "geo_location": (
                {"latitude": event.latitude, "longitude": event.longitude}
                if event.latitude is not None else None
            ),
            "start_datetime": event.start_datetime.isoformat(),
            "end_datetime": event.end_datetime.isoformat(),
            "capacity": event.capacity,
            "ticket_types": [
                {
                    "ticket_type_id": tt.ticket_type_id,
                    "name": tt.name,
                    "price": str(tt.price),
                    "quantity": tt.quantity,
                    "available": tt.available,
                }
                for tt in event.ticket_types
            ],
            "bookings": bookings,
            "organizer_user_id": event.organizer.username,
            "status": event.status.value,
            "description": event.description,
            "media": [p.file_path for p in event.photos],
        })
    return result


@router.get("/export/events")
def export_events(format: str = "json", db: Session = Depends(get_db)):
    events = (
        db.query(Event)
        .options(
            joinedload(Event.categories),
            joinedload(Event.ticket_types).joinedload(TicketType.bookings).joinedload(Booking.user),
            joinedload(Event.photos),
            joinedload(Event.organizer),
        )
        .all()
    )

    if format == "xml":
        xml_bytes = _events_to_xml(events)
        return Response(content=xml_bytes, media_type="application/xml")

    return _events_to_dict(events)
