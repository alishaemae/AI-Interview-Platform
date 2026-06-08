"""Direct messaging between HR and Candidates."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import User, UserRole, DirectMessage
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/messages", tags=["Messages"])


class SendMessageIn(BaseModel):
    to_user_id: int
    content: str


class MessageOut(BaseModel):
    id: int
    from_user_id: int
    from_name: str
    to_user_id: int
    to_name: str
    content: str
    is_read: bool
    timestamp: str


class ConversationOut(BaseModel):
    user_id: int
    user_name: str
    user_role: str
    company_name: Optional[str] = None
    last_message: str
    last_time: str
    unread: int


@router.post("/send")
async def send_message(
    data: SendMessageIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a direct message to another user."""
    # Verify target exists
    result = await db.execute(select(User).where(User.id == data.to_user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Пользователь не найден")

    msg = DirectMessage(
        from_user_id=current_user.id,
        to_user_id=data.to_user_id,
        content=data.content,
    )
    db.add(msg)
    await db.flush()
    return {"status": "sent", "id": msg.id}


@router.get("/conversations", response_model=List[ConversationOut])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of conversations for current user."""
    # Get all users who have exchanged messages with current user
    result = await db.execute(
        select(DirectMessage).where(
            or_(
                DirectMessage.from_user_id == current_user.id,
                DirectMessage.to_user_id == current_user.id,
            )
        ).order_by(DirectMessage.timestamp.desc())
    )
    messages = result.scalars().all()

    # Group by conversation partner
    conversations = {}
    for m in messages:
        partner_id = m.to_user_id if m.from_user_id == current_user.id else m.from_user_id
        if partner_id not in conversations:
            is_mine = m.from_user_id == current_user.id
            conversations[partner_id] = {
                "last_message": ("Вы: " if is_mine else "") + m.content[:80],
                "last_time": m.timestamp.isoformat(),
                "unread": 0,
                "last_from": m.from_user_id,
            }
        if m.to_user_id == current_user.id and not m.is_read:
            conversations[partner_id]["unread"] += 1

    # Get user info for partners
    result_list = []
    for partner_id, conv in conversations.items():
        user_result = await db.execute(select(User).where(User.id == partner_id))
        partner = user_result.scalar_one_or_none()
        if partner:
            cname = None
            if partner.company_id:
                from app.models import Company
                comp = (await db.execute(select(Company).where(Company.id == partner.company_id))).scalar_one_or_none()
                if comp: cname = comp.name
            result_list.append(ConversationOut(
                user_id=partner.id,
                user_name=partner.full_name,
                user_role=partner.role.value,
                company_name=cname,
                last_message=conv["last_message"],
                last_time=conv["last_time"],
                unread=conv["unread"],
            ))

    return result_list


@router.get("/with/{user_id}", response_model=List[MessageOut])
async def get_messages_with_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get message history with a specific user."""
    result = await db.execute(
        select(DirectMessage).where(
            or_(
                and_(DirectMessage.from_user_id == current_user.id, DirectMessage.to_user_id == user_id),
                and_(DirectMessage.from_user_id == user_id, DirectMessage.to_user_id == current_user.id),
            )
        ).order_by(DirectMessage.timestamp.asc())
    )
    messages = result.scalars().all()

    # Mark received messages as read
    for m in messages:
        if m.to_user_id == current_user.id and not m.is_read:
            m.is_read = True
    await db.flush()

    # Get user names
    users_cache = {}

    async def get_name(uid):
        if uid not in users_cache:
            r = await db.execute(select(User).where(User.id == uid))
            u = r.scalar_one_or_none()
            users_cache[uid] = u.full_name if u else "Unknown"
        return users_cache[uid]

    return [
        MessageOut(
            id=m.id, from_user_id=m.from_user_id, from_name=await get_name(m.from_user_id),
            to_user_id=m.to_user_id, to_name=await get_name(m.to_user_id),
            content=m.content, is_read=m.is_read, timestamp=m.timestamp.isoformat(),
        )
        for m in messages
    ]


@router.get("/search")
async def search_users(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search users by name for starting new conversations."""
    if not q or len(q) < 2:
        return []
    result = await db.execute(
        select(User).where(
            User.full_name.ilike(f"%{q}%"),
            User.id != current_user.id,
            User.is_active == True,
        ).limit(10)
    )
    users = result.scalars().all()
    return [{"id": u.id, "full_name": u.full_name, "email": u.email, "role": u.role.value} for u in users]

@router.get("/unread-count")
async def get_unread_count(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get total unread messages count."""
    count = (await db.execute(select(func.count(DirectMessage.id)).where(
        DirectMessage.to_user_id == current_user.id, DirectMessage.is_read == False))).scalar() or 0
    return {"count": count}
