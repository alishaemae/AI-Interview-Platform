"""Task generation: hybrid approach (bank + AI modification)."""

import json
import random
import logging
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import TaskTemplate, Task, DifficultyLevel, TaskDomain
from app.scibox import scibox_client

logger = logging.getLogger(__name__)


class TaskGenerator:
    """Generates interview tasks using template bank + AI modification."""

    async def get_task(
        self,
        db: AsyncSession,
        interview_id: int,
        level: DifficultyLevel,
        domain: Optional[TaskDomain] = None,
        exclude_template_ids: Optional[List[int]] = None,
        order_number: int = 1,
    ) -> Task:
        """
        Select template from bank and optionally modify via AI.
        Falls back to unmodified template if AI is unavailable.
        """
        template = await self._select_template(db, level, domain, exclude_template_ids)

        # Try AI modification
        modified = await self._modify_with_ai(template, level.value)

        if modified:
            task = Task(
                interview_id=interview_id,
                template_id=template.id,
                title=modified.get("title", template.title),
                description=modified.get("description", template.description),
                domain=template.domain,
                level=template.level,
                visible_tests=modified.get("visible_tests", template.visible_tests),
                hidden_tests=modified.get("hidden_tests", template.hidden_tests),
                reference_solution=template.reference_solution,
                order_number=order_number,
            )
        else:
            # Fallback: use template as-is
            task = Task(
                interview_id=interview_id,
                template_id=template.id,
                title=template.title,
                description=template.description,
                domain=template.domain,
                level=template.level,
                visible_tests=template.visible_tests,
                hidden_tests=template.hidden_tests,
                reference_solution=template.reference_solution,
                order_number=order_number,
            )

        db.add(task)
        await db.flush()
        return task

    async def _select_template(
        self,
        db: AsyncSession,
        level: DifficultyLevel,
        domain: Optional[TaskDomain],
        exclude_ids: Optional[List[int]],
    ) -> TaskTemplate:
        """Select a suitable template from the bank."""
        query = select(TaskTemplate).where(TaskTemplate.level == level)

        if domain:
            query = query.where(TaskTemplate.domain == domain)

        if exclude_ids:
            query = query.where(TaskTemplate.id.notin_(exclude_ids))

        result = await db.execute(query)
        templates = result.scalars().all()

        if not templates:
            # Fallback: any template of this level
            result = await db.execute(
                select(TaskTemplate).where(TaskTemplate.level == level)
            )
            templates = result.scalars().all()

        if not templates:
            # Last resort: any template
            result = await db.execute(select(TaskTemplate))
            templates = result.scalars().all()

        return random.choice(templates)

    async def _modify_with_ai(self, template: TaskTemplate, level: str) -> Optional[dict]:
        """Attempt AI modification of the template."""
        try:
            template_data = {
                "title": template.title,
                "description": template.description,
                "domain": template.domain.value,
                "input_format": template.input_format,
                "output_format": template.output_format,
                "visible_tests": template.visible_tests,
                "constraints": template.constraints,
            }

            prompt = f"Modify this coding task to create a unique variation. Change variable names, test values, and slightly rephrase the description. Keep the same difficulty level ({level}). Return ONLY valid JSON with same keys.\n\nOriginal task:\n{json.dumps(template_data, ensure_ascii=False)}"
            result = await scibox_client.chat(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="You are a task generator. Return ONLY valid JSON, no explanations.",
                temperature=0.8, max_tokens=800
            )

            if result:
                try:
                    modified = json.loads(result)
                    return modified
                except json.JSONDecodeError:
                    import re
                    match = re.search(r'\{[\s\S]*\}', result)
                    if match:
                        return json.loads(match.group())
            return None
        except Exception as e:
            logger.warning(f"AI modification failed, using fallback: {e}")
            return None


task_generator = TaskGenerator()
