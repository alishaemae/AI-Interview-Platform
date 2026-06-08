"""HR Dashboard — candidates, sessions, analytics, compare, code export."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models import (User, UserRole, Interview, InterviewStatus, Task, Submission,
                         ChatMessage, Metric, AnticheatEvent, DifficultyLevel)
from app.auth.dependencies import require_role

router = APIRouter(prefix="/api/hr", tags=["HR"])


class CandidateOut(BaseModel):
    id: int; full_name: str; email: str; sessions_count: int; avg_score: float
    last_interview_date: Optional[datetime] = None
    last_level: Optional[str] = None; last_specialty: Optional[str] = None


class SessionOut(BaseModel):
    id: int; level: str; status: str; total_score: float; completed_tasks: int; total_tasks: int
    started_at: Optional[datetime] = None; finished_at: Optional[datetime] = None
    ai_recommendation: Optional[str] = None; suspicion_score: float = 0.0


class AnalyticsOut(BaseModel):
    total_candidates: int; total_interviews: int; completed_interviews: int; avg_score: float
    by_level: dict; by_recommendation: dict


DOMAIN_TO_SPEC = {"arrays":"developer","strings":"developer","sorting":"developer","graphs":"developer",
    "dynamic_programming":"developer","math":"developer","oop":"developer","system_design":"developer",
    "sql":"analyst","linux":"devops","docker":"devops","git":"devops","testing":"qa","data_science":"data_science"}

async def _get_specialty(db: AsyncSession, interview_id: int) -> str:
    from sqlalchemy import func as sqf
    tasks = (await db.execute(select(Task.domain).where(Task.interview_id == interview_id))).scalars().all()
    if not tasks:
        return "developer"
    specs = [DOMAIN_TO_SPEC.get(t.value, "developer") for t in tasks]
    from collections import Counter
    most = Counter(specs).most_common(1)
    return most[0][0] if most else "developer"


@router.get("/candidates", response_model=list[CandidateOut])
async def get_candidates(search: Optional[str] = "", current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    q = select(User).where(User.role == UserRole.CANDIDATE)
    if search:
        q = q.where(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    users = (await db.execute(q.order_by(User.created_at.desc()))).scalars().all()
    result = []
    for u in users:
        sr = await db.execute(select(func.count(Interview.id), func.avg(Interview.total_score), func.max(Interview.started_at)).where(Interview.user_id == u.id))
        s = sr.one()
        # Get last interview level
        last_iv = (await db.execute(select(Interview).where(Interview.user_id == u.id).order_by(Interview.started_at.desc()).limit(1))).scalar_one_or_none()
        result.append(CandidateOut(id=u.id, full_name=u.full_name, email=u.email, sessions_count=s[0] or 0,
            avg_score=round(float(s[1] or 0), 2), last_interview_date=s[2],
            last_level=last_iv.level.value if last_iv else None,
            last_specialty=last_iv.specialty if last_iv else None))
    return [r for r in result if r.sessions_count > 0]


@router.get("/candidate/{cid}/sessions", response_model=list[SessionOut])
async def get_sessions(cid: int, current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    ivs = (await db.execute(select(Interview).where(Interview.user_id == cid).order_by(Interview.started_at.desc()))).scalars().all()
    result = []
    for iv in ivs:
        ac_r = await db.execute(select(func.sum(AnticheatEvent.severity)).where(AnticheatEvent.interview_id == iv.id))
        susp = min((ac_r.scalar() or 0) / 5.0, 1.0)
        result.append(SessionOut(id=iv.id, level=iv.level.value, status=iv.status.value, total_score=iv.total_score,
            completed_tasks=iv.completed_tasks, total_tasks=iv.total_tasks, started_at=iv.started_at,
            finished_at=iv.finished_at, ai_recommendation=iv.ai_recommendation, suspicion_score=susp))
    return result


@router.get("/session/{sid}/tasks")
async def get_session_tasks(sid: int, current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    tasks = (await db.execute(select(Task).where(Task.interview_id == sid).order_by(Task.order_number))).scalars().all()
    result = []
    for t in tasks:
        sub_r = await db.execute(select(func.max(Submission.score), func.count(Submission.id)).where(Submission.task_id == t.id))
        s = sub_r.one()
        result.append({"id": t.id, "title": t.title, "domain": t.domain.value, "level": t.level.value,
                        "order_number": t.order_number, "best_score": round(float(s[0] or 0), 2), "submissions_count": s[1] or 0})
    return result


@router.get("/session/{sid}/replay")
async def get_replay(sid: int, current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    iv = (await db.execute(select(Interview).where(Interview.id == sid))).scalar_one_or_none()
    if not iv:
        raise HTTPException(404, "Session not found")
    chats = (await db.execute(select(ChatMessage).where(ChatMessage.interview_id == sid).order_by(ChatMessage.timestamp))).scalars().all()
    acs = (await db.execute(select(AnticheatEvent).where(AnticheatEvent.interview_id == sid))).scalars().all()
    candidate = (await db.execute(select(User).where(User.id == iv.user_id))).scalar_one_or_none()
    return {
        "candidate_name": candidate.full_name if candidate else "Неизвестный",
        "status": iv.status.value, "level": iv.level.value, "total_score": iv.total_score,
        "completed_tasks": iv.completed_tasks, "total_tasks": iv.total_tasks,
        "started_at": iv.started_at.isoformat() if iv.started_at else None,
        "finished_at": iv.finished_at.isoformat() if iv.finished_at else None,
        "ai_summary": iv.ai_summary, "ai_recommendation": iv.ai_recommendation,
        "chat_messages": [{"sender": m.sender, "content": m.content, "timestamp": m.timestamp.isoformat()} for m in chats],
        "anticheat_events": [{"event_type": e.event_type, "severity": e.severity, "timestamp": e.timestamp.isoformat()} for e in acs],
    }


@router.get("/analytics", response_model=AnalyticsOut)
async def get_analytics(current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    tc = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.CANDIDATE))).scalar()
    sr = await db.execute(select(func.count(Interview.id), func.count(Interview.id).filter(Interview.status == InterviewStatus.COMPLETED), func.avg(Interview.total_score)))
    s = sr.one()
    lvl_r = await db.execute(select(Interview.level, func.count(Interview.id)).group_by(Interview.level))
    by_lvl = {r[0].value: r[1] for r in lvl_r}
    rec_r = await db.execute(select(Interview.ai_recommendation, func.count(Interview.id)).where(Interview.ai_recommendation.isnot(None)).group_by(Interview.ai_recommendation))
    by_rec = {r[0]: r[1] for r in rec_r}
    return AnalyticsOut(total_candidates=tc, total_interviews=s[0] or 0, completed_interviews=s[1] or 0,
                         avg_score=round(float(s[2] or 0), 2), by_level=by_lvl, by_recommendation=by_rec)


class DecisionIn(BaseModel):
    decision: str

@router.post("/session/{sid}/decision")
async def set_decision(sid: int, data: DecisionIn, current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    iv = (await db.execute(select(Interview).where(Interview.id == sid))).scalar_one_or_none()
    if not iv:
        raise HTTPException(404)
    iv.ai_recommendation = data.decision
    await db.flush()
    return {"status": "ok", "decision": data.decision}


@router.get("/compare")
async def compare_candidates(ids: str = Query(...), current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    cids = [int(x) for x in ids.split(",")]
    results = []
    for cid in cids:
        u = (await db.execute(select(User).where(User.id == cid))).scalar_one_or_none()
        if not u:
            continue
        sr = await db.execute(select(func.count(Interview.id), func.avg(Interview.total_score), func.max(Interview.started_at)).where(Interview.user_id == cid))
        s = sr.one()
        best = (await db.execute(select(Interview).where(Interview.user_id == cid).order_by(Interview.total_score.desc()).limit(1))).scalar_one_or_none()
        susp = 0.0
        if best:
            sr2 = await db.execute(select(func.sum(AnticheatEvent.severity)).where(AnticheatEvent.interview_id == best.id))
            susp = min((sr2.scalar() or 0) / 5.0, 1.0)
        results.append({"id": u.id, "full_name": u.full_name, "email": u.email, "sessions": s[0] or 0,
                         "avg_score": round(float(s[1] or 0), 2), "best_score": round(best.total_score, 2) if best else 0,
                         "level": best.level.value if best else "", "recommendation": best.ai_recommendation if best else "",
                         "suspicion": round(susp, 2), "last_date": s[2].isoformat() if s[2] else ""})
    return results


@router.get("/session/{sid}/code")
async def export_code(sid: int, current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    tasks = (await db.execute(select(Task).where(Task.interview_id == sid).order_by(Task.order_number))).scalars().all()
    files = []
    for t in tasks:
        sub = (await db.execute(select(Submission).where(Submission.task_id == t.id).order_by(Submission.score.desc()).limit(1))).scalar_one_or_none()
        if sub:
            files.append({"task_title": t.title, "task_number": t.order_number, "language": sub.language, "code": sub.code, "score": sub.score})
    return files
