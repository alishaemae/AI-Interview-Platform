"""Pydantic schemas for tasks."""

from pydantic import BaseModel
from typing import Optional, List, Any


class TestCase(BaseModel):
    input: str
    expected: str


class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    domain: str
    level: str
    visible_tests: List[dict]
    order_number: int

    class Config:
        from_attributes = True


class SubmissionCreate(BaseModel):
    code: str
    language: str = "python"
    is_final: bool = False


class SubmissionOut(BaseModel):
    id: int
    code: str
    language: str
    passed_visible: int
    total_visible: int
    passed_hidden: int
    total_hidden: int
    score: float
    execution_time_ms: Optional[int] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    is_final: bool

    class Config:
        from_attributes = True
