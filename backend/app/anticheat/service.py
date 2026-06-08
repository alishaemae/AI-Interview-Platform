"""Anti-cheat detection service."""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.models import AnticheatEvent

logger = logging.getLogger(__name__)

# Severity weights
SEVERITY = {
    "paste": 0.5,
    "tab_switch": 0.2,
    "devtools": 0.7,
    "rapid_code": 0.8,
    "copy": 0.15,
    "focus_lost": 0.15,
}


class AnticheatEventIn(BaseModel):
    interview_id: int
    event_type: str
    details: Optional[dict] = None


class AnticheatService:
    """Tracks and scores suspicious candidate behavior."""

    async def record_event(
        self, db: AsyncSession, interview_id: int, event_type: str, details: dict = None
    ) -> AnticheatEvent:
        """Record a suspicious event."""
        severity = SEVERITY.get(event_type, 0.1)

        event = AnticheatEvent(
            interview_id=interview_id,
            event_type=event_type,
            severity=severity,
            details=details or {},
        )
        db.add(event)
        await db.flush()
        logger.info(f"Anticheat event: {event_type} (severity={severity}) for interview {interview_id}")
        return event

    async def get_suspicion_score(self, db: AsyncSession, interview_id: int) -> float:
        """Calculate aggregate suspicion score for an interview (0.0 - 1.0)."""
        from sqlalchemy import select, func
        # Sum of severities
        result = await db.execute(
            select(func.sum(AnticheatEvent.severity))
            .where(AnticheatEvent.interview_id == interview_id)
        )
        total_severity = result.scalar() or 0.0
        # Count of events
        count_result = await db.execute(
            select(func.count(AnticheatEvent.id))
            .where(AnticheatEvent.interview_id == interview_id)
        )
        event_count = count_result.scalar() or 0
        
        # Formula: base from severity sum + bonus for repeated events
        # 1 paste = 0.5, 3 pastes = 1.5 -> ~50%, 5 pastes = 2.5 -> ~75%, 10 pastes -> ~95%
        base = min(total_severity / 3.0, 0.8)
        # Extra penalty for many events (each event beyond 2 adds 5%)
        repeat_penalty = max(0, (event_count - 2) * 0.05)
        return min(base + repeat_penalty, 1.0)


anticheat_service = AnticheatService()
