"""Pydantic schemas for interviews."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InterviewCreate(BaseModel):
    level: str  # junior / middle / senior
    specialty: str = "developer"  # developer / analyst / devops / qa / data_science


class InterviewOut(BaseModel):
    id: int
    status: str
    level: str
    total_score: float
    total_tasks: int
    completed_tasks: int
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    ai_summary: Optional[str] = None
    ai_recommendation: Optional[str] = None

    class Config:
        from_attributes = True


class InterviewListOut(BaseModel):
    interviews: List[InterviewOut]
