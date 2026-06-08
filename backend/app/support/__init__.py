"""Support system — tickets, chat, auto-distribution max 5 per agent."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import User, UserRole, SupportTicket, TicketReply
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/support", tags=["Support"])

MAX_TICKETS_PER_AGENT = 5

class TicketIn(BaseModel):
    subject: str; message: str; category: str = "general"

CATEGORY_PRIORITY = {"bug": "high", "account": "medium", "general": "medium", "question": "low", "feature": "low"}

class ReplyIn(BaseModel):
    message: str

async def _auto_assign(db: AsyncSession, priority: str = "medium") -> Optional[int]:
    """Smart distribution: if agent has 2+ high-priority tickets, route to another agent."""
    agents = (await db.execute(select(User).where(User.role == UserRole.SUPPORT, User.is_active == True))).scalars().all()
    if not agents:
        return None
    agent_stats = []
    for a in agents:
        total = (await db.execute(select(func.count(SupportTicket.id)).where(
            SupportTicket.assigned_to == a.id, SupportTicket.status.in_(["open", "in_progress"])))).scalar() or 0
        high_count = (await db.execute(select(func.count(SupportTicket.id)).where(
            SupportTicket.assigned_to == a.id, SupportTicket.status.in_(["open", "in_progress"]),
            SupportTicket.priority.in_(["high", "critical"])))).scalar() or 0
        agent_stats.append({"id": a.id, "total": total, "high": high_count})
    # Filter: skip agents at max capacity
    available = [a for a in agent_stats if a["total"] < MAX_TICKETS_PER_AGENT]
    if not available:
        return None
    # For high/critical tickets: prefer agent with fewer high-priority tickets
    if priority in ("high", "critical"):
        available.sort(key=lambda a: (a["high"], a["total"]))
    else:
        # For normal tickets: if agent has 2+ high tickets, prefer the other
        available.sort(key=lambda a: (1 if a["high"] >= 2 else 0, a["total"]))
    return available[0]["id"]

@router.post("/tickets")
async def create_ticket(data: TicketIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    priority = CATEGORY_PRIORITY.get(data.category, "medium")
    assigned = await _auto_assign(db, priority)
    t = SupportTicket(user_id=current_user.id, subject=data.subject, message=data.message,
                       category=data.category, priority=priority, assigned_to=assigned)
    db.add(t); await db.flush()
    return {"id": t.id, "status": "created", "assigned_to": assigned, "priority": priority}

@router.get("/tickets")
async def list_tickets(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role == UserRole.ADMIN:
        tickets = (await db.execute(select(SupportTicket).order_by(SupportTicket.created_at.desc()))).scalars().all()
    elif current_user.role == UserRole.SUPPORT:
        tickets = (await db.execute(select(SupportTicket).where(SupportTicket.assigned_to == current_user.id).order_by(SupportTicket.created_at.desc()))).scalars().all()
    else:
        tickets = (await db.execute(select(SupportTicket).where(SupportTicket.user_id == current_user.id).order_by(SupportTicket.created_at.desc()))).scalars().all()
    result = []
    for t in tickets:
        u = (await db.execute(select(User).where(User.id == t.user_id))).scalar_one_or_none()
        assigned_name = None
        if t.assigned_to:
            a = (await db.execute(select(User).where(User.id == t.assigned_to))).scalar_one_or_none()
            if a: assigned_name = a.full_name
        replies = (await db.execute(select(TicketReply).where(TicketReply.ticket_id == t.id).order_by(TicketReply.created_at))).scalars().all()
        reply_list = []
        for r in replies:
            ru = (await db.execute(select(User).where(User.id == r.user_id))).scalar_one_or_none()
            reply_list.append({"id": r.id, "user_id": r.user_id, "user_name": ru.full_name if ru else "?", "user_role": ru.role.value if ru else "", "message": r.message, "created_at": r.created_at.isoformat()})
        result.append({"id": t.id, "user_name": u.full_name if u else "?", "user_id": t.user_id, "subject": t.subject,
                        "message": t.message, "category": t.category, "priority": t.priority, "status": t.status,
                        "assigned_to": t.assigned_to, "assigned_name": assigned_name,
                        "created_at": t.created_at.isoformat(), "replies": reply_list})
    return result

@router.post("/tickets/{tid}/reply")
async def reply_ticket(tid: int, data: ReplyIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    t = (await db.execute(select(SupportTicket).where(SupportTicket.id == tid))).scalar_one_or_none()
    if not t: raise HTTPException(404)
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPPORT) and t.user_id != current_user.id:
        raise HTTPException(403)
    r = TicketReply(ticket_id=tid, user_id=current_user.id, message=data.message)
    db.add(r)
    if current_user.role in (UserRole.ADMIN, UserRole.SUPPORT):
        t.status = "in_progress"
    await db.flush()
    return {"status": "replied"}

@router.post("/tickets/{tid}/close")
async def close_ticket(tid: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    t = (await db.execute(select(SupportTicket).where(SupportTicket.id == tid))).scalar_one_or_none()
    if not t: raise HTTPException(404)
    t.status = "closed"; await db.flush()
    return {"status": "closed"}

@router.get("/my-stats")
async def support_stats(current_user: User = Depends(require_role([UserRole.SUPPORT])), db: AsyncSession = Depends(get_db)):
    """Stats for support agent dashboard."""
    open_count = (await db.execute(select(func.count(SupportTicket.id)).where(
        SupportTicket.assigned_to == current_user.id, SupportTicket.status.in_(["open", "in_progress"])))).scalar() or 0
    total = (await db.execute(select(func.count(SupportTicket.id)).where(SupportTicket.assigned_to == current_user.id))).scalar() or 0
    closed = (await db.execute(select(func.count(SupportTicket.id)).where(
        SupportTicket.assigned_to == current_user.id, SupportTicket.status == "closed"))).scalar() or 0
    return {"open_tickets": open_count, "total_tickets": total, "closed_tickets": closed, "max_per_agent": MAX_TICKETS_PER_AGENT}


@router.post("/tickets/{ticket_id}/escalate")
async def escalate_ticket(ticket_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Escalate ticket to admin."""
    if current_user.role not in [UserRole.SUPPORT, UserRole.ADMIN]:
        raise HTTPException(403, "Not authorized")
    ticket = (await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))).scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    # Find admin user
    admin = (await db.execute(select(User).where(User.role == UserRole.ADMIN).limit(1))).scalar_one_or_none()
    if not admin:
        raise HTTPException(404, "No admin found")
    ticket.assigned_to = admin.id
    ticket.priority = "critical"
    # Add reply noting escalation
    db.add(TicketReply(ticket_id=ticket_id, user_id=current_user.id, message=f"⬆️ Тикет передан администратору ({current_user.full_name})"))
    # Create notification for admin
    from app.models import Notification
    db.add(Notification(user_id=admin.id, type="ticket_escalated", title="Эскалация тикета", message=f"Тикет #{ticket_id}: {ticket.subject}", link="/admin"))
    await db.flush()
    return {"status": "escalated", "assigned_to": admin.id}
