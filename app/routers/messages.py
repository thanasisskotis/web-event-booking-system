from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_approved
from app.database import get_db
from app.models.models_booking import Booking, TicketType
from app.models.models_event import Event
from app.models.models_message import Message
from app.models.models_user import User
from app.schemas.message import MessageCreate, MessageOut

router = APIRouter(prefix="/messages", tags=["messages"])


def _has_booking(db: Session, user_id: int, event_id: int) -> bool:
    return (
        db.query(Booking)
        .join(TicketType, Booking.ticket_type_id == TicketType.ticket_type_id)
        .filter(TicketType.event_id == event_id, Booking.user_id == user_id)
        .first()
        is not None
    )


def _enrich(db: Session, messages: list[Message]) -> list[MessageOut]:
    """Attach sender/recipient usernames and event title to a batch of messages,
    doing at most one extra query per lookup table instead of N+1 per message."""
    if not messages:
        return []

    user_ids = {m.sender_id for m in messages} | {m.recipient_id for m in messages}
    users = {u.user_id: u.username for u in db.query(User).filter(User.user_id.in_(user_ids)).all()}

    event_ids = {m.event_id for m in messages if m.event_id is not None}
    events = {}
    if event_ids:
        events = {e.event_id: e.title for e in db.query(Event).filter(Event.event_id.in_(event_ids)).all()}

    result = []
    for m in messages:
        result.append(
            MessageOut(
                message_id=m.message_id,
                sender_id=m.sender_id,
                sender_username=users.get(m.sender_id),
                recipient_id=m.recipient_id,
                recipient_username=users.get(m.recipient_id),
                event_id=m.event_id,
                event_title=events.get(m.event_id) if m.event_id else None,
                subject=m.subject,
                body=m.body,
                sent_at=m.sent_at,
                is_read=m.is_read,
            )
        )
    return result


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def send_message(payload: MessageCreate, db: Session = Depends(get_db), user: User = Depends(require_approved)):
    if payload.recipient_id == user.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot message yourself")

    event = db.query(Event).filter(Event.event_id == payload.event_id).first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if user.user_id == event.organizer_id:
        if not _has_booking(db, payload.recipient_id, event.event_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient has not booked this event",
            )
    elif _has_booking(db, user.user_id, event.event_id):
        if payload.recipient_id != event.organizer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You can only message the event's organizer",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have no booking or organizer relationship with this event",
        )

    message = Message(
        sender_id=user.user_id,
        recipient_id=payload.recipient_id,
        event_id=event.event_id,
        subject=payload.subject,
        body=payload.body,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _enrich(db, [message])[0]


@router.get("/inbox", response_model=list[MessageOut])
def inbox(db: Session = Depends(get_db), user: User = Depends(require_approved)):
    messages = (
        db.query(Message)
        .filter(Message.recipient_id == user.user_id, Message.deleted_by_recipient.is_(False))
        .order_by(Message.sent_at.desc())
        .all()
    )
    return _enrich(db, messages)


@router.get("/sent", response_model=list[MessageOut])
def sent(db: Session = Depends(get_db), user: User = Depends(require_approved)):
    messages = (
        db.query(Message)
        .filter(Message.sender_id == user.user_id, Message.deleted_by_sender.is_(False))
        .order_by(Message.sent_at.desc())
        .all()
    )
    return _enrich(db, messages)


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), user: User = Depends(require_approved)):
    count = (
        db.query(Message)
        .filter(
            Message.recipient_id == user.user_id,
            Message.is_read.is_(False),
            Message.deleted_by_recipient.is_(False),
        )
        .count()
    )
    return {"unread_count": count}


@router.post("/{message_id}/read", response_model=MessageOut)
def mark_read(message_id: int, db: Session = Depends(get_db), user: User = Depends(require_approved)):
    message = db.query(Message).filter(Message.message_id == message_id).first()
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if message.recipient_id != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your message")

    message.is_read = True
    db.commit()
    db.refresh(message)
    return _enrich(db, [message])[0]


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(message_id: int, db: Session = Depends(get_db), user: User = Depends(require_approved)):
    message = db.query(Message).filter(Message.message_id == message_id).first()
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if user.user_id not in (message.sender_id, message.recipient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your message")

    # Per-user soft delete: hide it only for the side that asked. If the user is
    # both sender and recipient it can't happen (send-to-self is blocked). Once
    # both sides have deleted, physically remove the row to reclaim storage.
    if user.user_id == message.sender_id:
        message.deleted_by_sender = True
    if user.user_id == message.recipient_id:
        message.deleted_by_recipient = True

    if message.deleted_by_sender and message.deleted_by_recipient:
        db.delete(message)
    db.commit()
