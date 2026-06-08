"""Interview endpoints for candidates."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, UserRole, Interview, InterviewStatus, Task, DifficultyLevel
from app.auth.dependencies import require_role
from app.interviews.schemas import InterviewCreate, InterviewOut, InterviewListOut
from app.interviews.orchestrator import orchestrator
from app.tasks.schemas import TaskOut, SubmissionCreate, SubmissionOut

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])


@router.post("/", response_model=InterviewOut, status_code=status.HTTP_201_CREATED)
async def create_interview(
    data: InterviewCreate,
    current_user: User = Depends(require_role([UserRole.CANDIDATE])),
    db: AsyncSession = Depends(get_db),
):
    """Create a new interview session."""
    try:
        level = DifficultyLevel(data.level)
    except ValueError:
        raise HTTPException(400, "Невалидный уровень. Допустимые: junior, middle, senior")

    interview = await orchestrator.create_interview(db, current_user.id, level, data.specialty)
    return InterviewOut(
        id=interview.id,
        status=interview.status.value,
        level=interview.level.value,
        total_score=interview.total_score,
        total_tasks=interview.total_tasks,
        completed_tasks=interview.completed_tasks,
        started_at=interview.started_at,
    )


@router.post("/{interview_id}/start", response_model=TaskOut)
async def start_interview(
    interview_id: int,
    current_user: User = Depends(require_role([UserRole.CANDIDATE])),
    db: AsyncSession = Depends(get_db),
):
    """Start interview and get first task."""
    interview = await _get_user_interview(db, interview_id, current_user.id)

    if interview.status != InterviewStatus.CREATED:
        raise HTTPException(400, "Интервью уже начато или завершено")

    task = await orchestrator.start_interview(db, interview)
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        domain=task.domain.value,
        level=task.level.value,
        visible_tests=task.visible_tests,
        order_number=task.order_number,
    )


@router.get("/{interview_id}/current-task", response_model=TaskOut)
async def get_current_task(
    interview_id: int,
    current_user: User = Depends(require_role([UserRole.CANDIDATE])),
    db: AsyncSession = Depends(get_db),
):
    """Get the current active task."""
    await _get_user_interview(db, interview_id, current_user.id)
    task = await orchestrator.get_current_task(db, interview_id)
    if not task:
        raise HTTPException(404, "Активная задача не найдена")

    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        domain=task.domain.value,
        level=task.level.value,
        visible_tests=task.visible_tests,
        order_number=task.order_number,
    )


@router.post("/{interview_id}/tasks/{task_id}/submit", response_model=SubmissionOut)
async def submit_solution(
    interview_id: int,
    task_id: int,
    data: SubmissionCreate,
    current_user: User = Depends(require_role([UserRole.CANDIDATE])),
    db: AsyncSession = Depends(get_db),
):
    """Submit code solution for a task."""
    interview = await _get_user_interview(db, interview_id, current_user.id)

    if interview.status not in (InterviewStatus.TASK_ACTIVE, InterviewStatus.ADAPTING):
        raise HTTPException(400, "Интервью не в активном состоянии")

    task_result = await db.execute(
        select(Task).where(Task.id == task_id, Task.interview_id == interview_id)
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Задача не найдена")

    submission = await orchestrator.submit_solution(
        db, interview, task, data.code, data.language, data.is_final
    )

    return SubmissionOut(
        id=submission.id,
        code=submission.code,
        language=submission.language,
        passed_visible=submission.passed_visible,
        total_visible=submission.total_visible,
        passed_hidden=submission.passed_hidden,
        total_hidden=submission.total_hidden,
        score=submission.score,
        execution_time_ms=submission.execution_time_ms,
        stdout=submission.stdout,
        stderr=submission.stderr,
        is_final=submission.is_final,
    )



@router.get("/{interview_id}/report")
async def get_interview_report(
    interview_id: int,
    current_user: User = Depends(require_role([UserRole.CANDIDATE, UserRole.HR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed report with per-task results."""
    interview = (await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )).scalar_one_or_none()
    if not interview:
        raise HTTPException(404, "Интервью не найдено")
    
    tasks = (await db.execute(
        select(Task).where(Task.interview_id == interview_id).order_by(Task.id)
    )).scalars().all()
    
    task_results = []
    from app.models import Submission
    for task in tasks:
        try:
            sub = (await db.execute(
                select(Submission).where(Submission.task_id == task.id, Submission.is_final == True).order_by(Submission.id.desc()).limit(1)
            )).scalar_one_or_none()
            if not sub:
                sub = (await db.execute(
                    select(Submission).where(Submission.task_id == task.id).order_by(Submission.id.desc()).limit(1)
                )).scalar_one_or_none()
        except Exception:
            sub = None
        
        pv = (sub.passed_visible or 0) if sub else 0
        tv = (sub.total_visible or 0) if sub else 0
        ph = (sub.passed_hidden or 0) if sub else 0
        th = (sub.total_hidden or 0) if sub else 0
        score = (sub.score or 0) if sub else 0
        total = tv + th
        passed = pv + ph
        
        task_results.append({
            "id": task.id,
            "title": task.title,
            "description": (task.description or "")[:100],
            "domain": task.domain.value if task.domain else "",
            "level": task.level.value if task.level else "",
            "score": score,
            "passed_visible": pv,
            "total_visible": tv,
            "passed_hidden": ph,
            "total_hidden": th,
            "feedback": f"Пройдено тестов: {passed}/{total}" if sub else "Не отправлено",
        })
    
    return {
        "interview_id": interview.id,
        "status": interview.status.value,
        "total_score": interview.total_score,
        "total_tasks": interview.total_tasks,
        "completed_tasks": interview.completed_tasks,
        "started_at": interview.started_at.isoformat() if interview.started_at else None,
        "tasks": task_results,
    }

@router.get("/my", response_model=InterviewListOut)
async def my_interviews(
    current_user: User = Depends(require_role([UserRole.CANDIDATE])),
    db: AsyncSession = Depends(get_db),
):
    """Get all interviews for the current candidate."""
    result = await db.execute(
        select(Interview)
        .where(Interview.user_id == current_user.id)
        .order_by(Interview.started_at.desc())
    )
    interviews = result.scalars().all()
    return InterviewListOut(
        interviews=[
            InterviewOut(
                id=i.id, status=i.status.value, level=i.level.value,
                total_score=i.total_score, total_tasks=i.total_tasks,
                completed_tasks=i.completed_tasks, started_at=i.started_at,
                finished_at=i.finished_at, ai_summary=i.ai_summary,
                ai_recommendation=i.ai_recommendation,
            )
            for i in interviews
        ]
    )


@router.get("/{interview_id}", response_model=InterviewOut)
async def get_interview(
    interview_id: int,
    current_user: User = Depends(require_role([UserRole.CANDIDATE])),
    db: AsyncSession = Depends(get_db),
):
    """Get interview details."""
    interview = await _get_user_interview(db, interview_id, current_user.id)
    return InterviewOut(
        id=interview.id, status=interview.status.value, level=interview.level.value,
        total_score=interview.total_score, total_tasks=interview.total_tasks,
        completed_tasks=interview.completed_tasks, started_at=interview.started_at,
        finished_at=interview.finished_at, ai_summary=interview.ai_summary,
        ai_recommendation=interview.ai_recommendation,
    )


async def _get_user_interview(db: AsyncSession, interview_id: int, user_id: int) -> Interview:
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id, Interview.user_id == user_id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(404, "Интервью не найдено")
    return interview
