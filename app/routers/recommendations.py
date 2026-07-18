from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.core.security import require_approved
from app.database import get_db
from app.models.models_event import Event
from app.models.models_user import User
from app.schemas.event import EventOut
from app.services.recommendations import get_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=list[EventOut])
def recommend(
    top_n: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(require_approved),
):
    events = get_recommendations(db, user.user_id, top_n=top_n)
    if not events:
        return []

    event_ids = [e.event_id for e in events]
    events_with_relations = {
        e.event_id: e
        for e in db.query(Event)
        .options(joinedload(Event.ticket_types), joinedload(Event.categories))
        .filter(Event.event_id.in_(event_ids))
        .all()
    }
    return [events_with_relations[eid] for eid in event_ids if eid in events_with_relations]
