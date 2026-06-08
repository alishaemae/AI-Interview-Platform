"""Vacancies — CRUD for HR, list for candidates."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Vacancy, Company, User, UserRole
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/vacancies", tags=["Vacancies"])

class VacancyIn(BaseModel):
    title: str; specialty: str; level: str; description: str = ""
    salary_from: Optional[int] = None; salary_to: Optional[int] = None

@router.get("/")
async def list_vacancies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vacancy, Company).join(Company).where(Vacancy.is_active == True))
    return [{"id": v.id, "title": v.title, "specialty": v.specialty, "level": v.level,
             "description": v.description, "salary_from": v.salary_from, "salary_to": v.salary_to,
             "company_id": v.company_id, "company_name": c.name, "company_desc": c.description} for v, c in result.all()]

@router.post("/")
async def create_vacancy(data: VacancyIn, current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    if not current_user.company_id:
        raise HTTPException(400, "HR не привязан к компании")
    v = Vacancy(company_id=current_user.company_id, title=data.title, specialty=data.specialty, level=data.level,
                description=data.description, salary_from=data.salary_from, salary_to=data.salary_to)
    db.add(v); await db.flush()
    return {"id": v.id, "status": "created"}

@router.put("/{vid}")
async def update_vacancy(vid: int, data: VacancyIn, current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    v = (await db.execute(select(Vacancy).where(Vacancy.id == vid))).scalar_one_or_none()
    if not v: raise HTTPException(404)
    if v.company_id != current_user.company_id: raise HTTPException(403, "Нет доступа")
    v.title = data.title; v.specialty = data.specialty; v.level = data.level
    v.description = data.description; v.salary_from = data.salary_from; v.salary_to = data.salary_to
    await db.flush()
    return {"status": "updated"}

@router.delete("/{vid}")
async def delete_vacancy(vid: int, current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    v = (await db.execute(select(Vacancy).where(Vacancy.id == vid))).scalar_one_or_none()
    if not v: raise HTTPException(404)
    if v.company_id != current_user.company_id: raise HTTPException(403, "Нет доступа")
    v.is_active = False; await db.flush()
    return {"status": "deleted"}

@router.get("/my")
async def my_company_vacancies(current_user: User = Depends(require_role([UserRole.HR])), db: AsyncSession = Depends(get_db)):
    """Get vacancies for HR's own company only."""
    if not current_user.company_id:
        return []
    result = await db.execute(select(Vacancy, Company).join(Company).where(Vacancy.is_active == True, Vacancy.company_id == current_user.company_id))
    return [{"id": v.id, "title": v.title, "specialty": v.specialty, "level": v.level,
             "description": v.description, "salary_from": v.salary_from, "salary_to": v.salary_to,
             "company_id": v.company_id, "company_name": c.name} for v, c in result.all()]

@router.get("/{vid}")
async def get_vacancy(vid: int, db: AsyncSession = Depends(get_db)):
    """Get single vacancy with full details."""
    result = await db.execute(select(Vacancy, Company).join(Company).where(Vacancy.id == vid))
    row = result.first()
    if not row: raise HTTPException(404, "Vacancy not found")
    v, c = row
    return {"id": v.id, "title": v.title, "specialty": v.specialty, "level": v.level,
            "description": v.description, "salary_from": v.salary_from, "salary_to": v.salary_to,
            "company_id": v.company_id, "company_name": c.name, "company_description": c.description,
            "company_website": c.website, "is_active": v.is_active}
