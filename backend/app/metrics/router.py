"""Metrics collection service — code snapshots, events, aggregation."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models import User, UserRole, Metric
from app.auth.dependencies import require_role

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])


class MetricEventIn(BaseModel):
    interview_id: int
    task_id: Optional[int] = None
    event_type: str  # code_snapshot, test_run, submit, etc.
    data: Optional[dict] = None


class MetricOut(BaseModel):
    id: int
    event_type: str
    data: Optional[dict] = None
    timestamp: datetime

    class Config:
        from_attributes = True


@router.post("/event")
async def record_metric(
    event: MetricEventIn,
    current_user: User = Depends(require_role([UserRole.CANDIDATE])),
    db: AsyncSession = Depends(get_db),
):
    """Record a metric event (code snapshot, test run, etc.)."""
    metric = Metric(
        interview_id=event.interview_id,
        task_id=event.task_id,
        event_type=event.event_type,
        data=event.data,
    )
    db.add(metric)
    await db.flush()
    return {"status": "recorded", "id": metric.id}


@router.get("/{interview_id}", response_model=List[MetricOut])
async def get_interview_metrics(
    interview_id: int,
    current_user: User = Depends(require_role([UserRole.CANDIDATE, UserRole.HR])),
    db: AsyncSession = Depends(get_db),
):
    """Get all metrics for an interview (for replay mode)."""
    result = await db.execute(
        select(Metric)
        .where(Metric.interview_id == interview_id)
        .order_by(Metric.timestamp.asc())
    )
    metrics = result.scalars().all()
    return [MetricOut(id=m.id, event_type=m.event_type, data=m.data, timestamp=m.timestamp) for m in metrics]
