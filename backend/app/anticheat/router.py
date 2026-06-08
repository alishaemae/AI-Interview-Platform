"""Anticheat event endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, UserRole
from app.auth.dependencies import require_role
from app.anticheat.service import anticheat_service, AnticheatEventIn

router = APIRouter(prefix="/api/anticheat", tags=["Anticheat"])


@router.post("/event")
async def report_event(
    data: AnticheatEventIn,
    current_user: User = Depends(require_role([UserRole.CANDIDATE])),
    db: AsyncSession = Depends(get_db),
):
    """Report a client-side anticheat event."""
    event = await anticheat_service.record_event(
        db, data.interview_id, data.event_type, data.details
    )
    return {"status": "recorded", "event_id": event.id}
