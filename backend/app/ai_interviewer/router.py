"""Chat endpoints for AI interviewer."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models import User, UserRole
from app.auth.dependencies import require_role
from app.ai_interviewer.service import ai_interviewer

router = APIRouter(prefix="/api/chat", tags=["AI Chat"])


class ChatMessageIn(BaseModel):
    interview_id: int
    task_id: int
    message: str


class ChatMessageOut(BaseModel):
    sender: str
    content: str
    timestamp: str = ""


@router.post("/send", response_model=ChatMessageOut)
async def send_chat_message(
    data: ChatMessageIn,
    current_user: User = Depends(require_role([UserRole.CANDIDATE])),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI interviewer."""
    response = await ai_interviewer.send_message(
        db, data.interview_id, data.task_id, data.message
    )
    return ChatMessageOut(sender="ai", content=response)


@router.get("/{interview_id}/history", response_model=List[ChatMessageOut])
async def get_chat_history(
    interview_id: int,
    current_user: User = Depends(require_role([UserRole.CANDIDATE, UserRole.HR])),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for an interview."""
    messages = await ai_interviewer.get_chat_history(db, interview_id)
    return [ChatMessageOut(**m) for m in messages]
