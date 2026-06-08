"""Interview Orchestrator — state machine managing the interview flow."""

import logging
import random
from datetime import datetime
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import (
    Interview, InterviewStatus, Task, Submission, DifficultyLevel, TaskDomain
)
from app.tasks.generator import task_generator
from app.code_executor import code_executor

logger = logging.getLogger(__name__)

TASKS_PER_INTERVIEW = 5

# Map specialty to task domains
SPECIALTY_DOMAINS = {
    "developer": [TaskDomain.ARRAYS, TaskDomain.STRINGS, TaskDomain.SORTING, TaskDomain.HASH_TABLES,
                  TaskDomain.TREES, TaskDomain.GRAPHS, TaskDomain.DYNAMIC_PROGRAMMING, TaskDomain.OOP,
                  TaskDomain.API, TaskDomain.MATH],
    "analyst": [TaskDomain.SQL, TaskDomain.PANDAS, TaskDomain.METRICS, TaskDomain.DATA_PROCESSING, TaskDomain.MATH],
    "devops": [TaskDomain.DOCKER, TaskDomain.BASH, TaskDomain.LINUX, TaskDomain.YAML_CONFIG, TaskDomain.CI_CD],
    "qa": [TaskDomain.PYTEST, TaskDomain.SELENIUM, TaskDomain.TESTING, TaskDomain.STRINGS],
    "data_science": [TaskDomain.SKLEARN, TaskDomain.DATA_PROCESSING, TaskDomain.PANDAS, TaskDomain.METRICS, TaskDomain.MATH],
}



class InterviewOrchestrator:
    """Manages interview session state and flow."""

    async def create_interview(
        self, db: AsyncSession, user_id: int, level: DifficultyLevel, specialty: str = 'developer'
    ) -> Interview:
        """Create new interview session."""
        interview = Interview(
            user_id=user_id,
            status=InterviewStatus.CREATED,
            level=level,
            specialty=specialty,
            total_tasks=TASKS_PER_INTERVIEW,
        )
        db.add(interview)
        await db.flush()
        return interview

    async def start_interview(self, db: AsyncSession, interview: Interview) -> Task:
        """Start interview: generate first task."""
        domains = SPECIALTY_DOMAINS.get(interview.specialty, None)
        domain = random.choice(domains) if domains else None
        task = await task_generator.get_task(
            db=db,
            interview_id=interview.id,
            level=interview.level,
            domain=domain,
            order_number=1,
        )
        interview.status = InterviewStatus.TASK_ACTIVE
        await db.flush()
        return task

    async def submit_solution(
        self,
        db: AsyncSession,
        interview: Interview,
        task: Task,
        code: str,
        language: str = "python",
        is_final: bool = False,
    ) -> Submission:
        """Run code against tests and record submission."""
        # Detect text-based tasks (SQL, Docker, YAML, pytest descriptions, pandas, sklearn, etc.)
        all_tests = (task.visible_tests or []) + (task.hidden_tests or [])
        is_text_task = all(
            len(str(tc.get("input", "")).strip()) <= 10 and
            str(tc.get("input", "")).strip().lower() in ("", "c", "c2", "q", "f", "example", "check", "url", "sql", "python", "bash", "yaml", "dockerfile")
            for tc in all_tests
        ) if all_tests else False
        
        if is_text_task:
            # Text-based scoring: check if answer contains key concepts
            all_keywords = []
            for tc in all_tests:
                exp = str(tc.get("expected", "")).strip()
                # Split multi-line expected into individual keywords
                for line in exp.split("\n"):
                    for word in line.split():
                        w = word.strip("(){}[],.;:").lower()
                        if len(w) >= 3:
                            all_keywords.append(w)
            
            # Deduplicate
            all_keywords = list(set(all_keywords))
            code_lower = code.lower()
            matched = sum(1 for kw in all_keywords if kw in code_lower)
            total_kw = max(len(all_keywords), 1)
            
            # Score: percentage of keywords found, min 40% for any substantial answer
            raw_score = (matched / total_kw * 100)
            if len(code.strip()) > 30 and matched > 0:
                score = max(raw_score, 40)
            elif len(code.strip()) > 50:
                score = max(raw_score, 30)
            else:
                score = raw_score
            score = min(score, 100)
            
            visible_result = {"passed": matched, "total": total_kw, "results": [], "execution_time_ms": 0}
            hidden_result = {"passed": 0, "total": 0, "results": [], "execution_time_ms": 0}
            total_tests = total_kw
            passed_tests = matched
        else:
            # Standard code execution for algorithmic tasks
            visible_result = await code_executor.run_tests(code, language, task.visible_tests)
            hidden_result = await code_executor.run_tests(code, language, task.hidden_tests)
            total_tests = visible_result["total"] + hidden_result["total"]
            passed_tests = visible_result["passed"] + hidden_result["passed"]
            score = (passed_tests / total_tests * 100) if total_tests > 0 else 0

        submission = Submission(
            task_id=task.id,
            code=code,
            language=language,
            passed_visible=visible_result["passed"],
            total_visible=visible_result["total"],
            passed_hidden=hidden_result["passed"],
            total_hidden=hidden_result["total"],
            score=round(score, 2),
            execution_time_ms=visible_result["execution_time_ms"] + hidden_result["execution_time_ms"],
            stdout=str(visible_result.get("results", [])),
            stderr=visible_result.get("error"),
            is_final=is_final,
        )
        db.add(submission)
        await db.flush()

        if is_final:
            await self._handle_final_submission(db, interview, task, submission)

        return submission

    async def _handle_final_submission(
        self, db: AsyncSession, interview: Interview, task: Task, submission: Submission
    ):
        """After final submission, adapt difficulty and generate next task or complete."""
        interview.completed_tasks += 1
        interview.total_score += submission.score

        if interview.completed_tasks >= interview.total_tasks:
            interview.status = InterviewStatus.COMPLETED
            interview.finished_at = datetime.utcnow()
            interview.total_score = round(
                interview.total_score / interview.completed_tasks, 2
            )
        else:
            # Adapt difficulty for next task
            interview.status = InterviewStatus.ADAPTING
            next_level = self._adapt_level(interview.level, submission.score, submission.execution_time_ms)

            # Get domains already used
            existing_tasks = await db.execute(
                select(Task).where(Task.interview_id == interview.id)
            )
            used_template_ids = [t.template_id for t in existing_tasks.scalars().all() if t.template_id]
            used_domains = [t.domain for t in existing_tasks.scalars().all()]

            # Pick a new domain
            all_domains = list(TaskDomain)
            available = [d for d in all_domains if d not in used_domains]
            next_domain = available[0] if available else None

            next_task = await task_generator.get_task(
                db=db,
                interview_id=interview.id,
                level=next_level,
                domain=next_domain,
                exclude_template_ids=used_template_ids,
                order_number=interview.completed_tasks + 1,
            )
            interview.status = InterviewStatus.TASK_ACTIVE

        await db.flush()

    def _adapt_level(
        self, current_level: DifficultyLevel, score: float, time_ms: Optional[int]
    ) -> DifficultyLevel:
        """Adapt difficulty based on performance."""
        levels = [DifficultyLevel.JUNIOR, DifficultyLevel.MIDDLE, DifficultyLevel.SENIOR]
        current_idx = levels.index(current_level)

        if score >= 90 and (time_ms is None or time_ms < 300000):  # < 5 min
            new_idx = min(current_idx + 1, 2)
        elif score < 40:
            new_idx = max(current_idx - 1, 0)
        else:
            new_idx = current_idx

        return levels[new_idx]

    async def get_current_task(self, db: AsyncSession, interview_id: int) -> Optional[Task]:
        """Get the current active task for an interview."""
        result = await db.execute(
            select(Task)
            .where(Task.interview_id == interview_id)
            .order_by(Task.order_number.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()


orchestrator = InterviewOrchestrator()
