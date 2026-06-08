"""Admin panel — user management, audit, platform stats."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import User, UserRole, Interview, Company, AuditLog, SupportTicket
from app.auth.dependencies import require_role

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/users")
async def list_users(current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(User).order_by(User.created_at.desc()))).scalars().all()
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value,
             "is_active": u.is_active, "company_id": u.company_id,
             "created_at": u.created_at.isoformat() if u.created_at else None} for u in users]

@router.post("/users/{uid}/block")
async def block_user(uid: int, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not u: raise HTTPException(404)
    u.is_active = not u.is_active
    db.add(AuditLog(user_id=current_user.id, action=f"{'block' if not u.is_active else 'unblock'}_user", details={"target_id": uid, "target_name": u.full_name, "target_email": u.email, "description": f"{'Заблокирован' if not u.is_active else 'Разблокирован'} пользователь {u.full_name} ({u.email})"}))
    await db.flush()
    return {"status": "blocked" if not u.is_active else "unblocked", "user_id": uid}

@router.get("/stats")
async def platform_stats(current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(func.count(User.id)))).scalar()
    candidates = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.CANDIDATE))).scalar()
    hrs = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.HR))).scalar()
    interviews = (await db.execute(select(func.count(Interview.id)))).scalar()
    companies = (await db.execute(select(func.count(Company.id)))).scalar()
    tickets = (await db.execute(select(func.count(SupportTicket.id)).where(SupportTicket.status == "open"))).scalar()
    return {"total_users": users, "candidates": candidates, "hrs": hrs, "interviews": interviews, "companies": companies, "open_tickets": tickets}

@router.get("/audit")
async def audit_log(current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    logs = (await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100))).scalars().all()
    result = []
    for l in logs:
        u = (await db.execute(select(User).where(User.id == l.user_id))).scalar_one_or_none() if l.user_id else None
        result.append({"id": l.id, "user_name": u.full_name if u else "System", "action": l.action,
                        "details": l.details, "timestamp": l.timestamp.isoformat()})
    return result

@router.get("/companies")
async def list_companies(current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    comps = (await db.execute(select(Company))).scalars().all()
    return [{"id": c.id, "name": c.name, "description": c.description, "website": c.website} for c in comps]


@router.get("/ai-health")
async def ai_health_check(current_user: User = Depends(require_role([UserRole.ADMIN]))):
    """Check if AI/LLM provider is working — returns full error log."""
    import time, os, traceback
    start = time.time()
    try:
        from app.scibox.client import scibox_client
        response = await scibox_client.chat(
            messages=[{"role": "user", "content": "Say OK"}],
            system_prompt="Reply with exactly: OK",
            temperature=0, max_tokens=10
        )
        elapsed = int((time.time() - start) * 1000)
        if response:
            keys = {"Kimi": os.getenv("KIMI_KEY",""), "Groq": os.getenv("GROQ_KEY",""), "DeepSeek": os.getenv("DEEPSEEK_KEY",""), "OpenRouter": os.getenv("OPENROUTER_KEY","")}
            provider = next((k for k,v in keys.items() if v), "Unknown")
            return {"status": "ok", "provider": provider, "model": "llama-3.3-70b", "response_time": elapsed, "response": response[:100]}
        return {"status": "error", "message": "Пустой ответ от AI. Проверьте OPENROUTER_KEY в .env", "response_time": elapsed, "log": "AI provider returned empty response. Check API key configuration."}
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        full_trace = traceback.format_exc()
        return {"status": "error", "message": str(e)[:500], "response_time": elapsed, "log": full_trace}


@router.get("/db-health")
async def db_health_check(current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    """Check database health — expanded."""
    import os
    try:
        from sqlalchemy import text
        result = await db.execute(text("SELECT count(*) FROM sqlite_master WHERE type='table'"))
        tables = result.scalar()
        users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
        interviews_count = (await db.execute(text("SELECT count(*) FROM interviews"))).scalar() or 0
        tickets_count = (await db.execute(text("SELECT count(*) FROM support_tickets"))).scalar() or 0
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "interview_platform.db")
        size = "N/A"
        if os.path.exists(db_path):
            s = os.path.getsize(db_path)
            size = f"{s/1024:.0f} KB" if s < 1048576 else f"{s/1048576:.1f} MB"
        return {"status": "ok", "tables": tables, "size": size, "users_count": users_count, "interviews_count": interviews_count, "tickets_count": tickets_count}
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e)[:500], "log": traceback.format_exc()}


class PromoteIn(BaseModel):
    company_id: int

@router.post("/users/{uid}/promote-hr")
async def promote_to_hr(uid: int, data: PromoteIn, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not u: raise HTTPException(404)
    u.role = UserRole.HR
    u.company_id = data.company_id
    db.add(AuditLog(user_id=current_user.id, action="promote_to_hr", details={"target_id": uid, "target_name": target.full_name, "company_id": data.company_id, "description": f"Назначен HR: {target.full_name} в компанию #{data.company_id}"}))
    await db.flush()
    return {"status": "promoted", "user_id": uid}


@router.post("/users/{uid}/demote-hr")
async def demote_from_hr(uid: int, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not u: raise HTTPException(404)
    if u.role != UserRole.HR: raise HTTPException(400, "Пользователь не является HR")
    u.role = UserRole.CANDIDATE
    u.company_id = None
    db.add(AuditLog(user_id=current_user.id, action="demote_from_hr", details={"target_id": uid, "target_name": target.full_name, "description": f"Снят с должности HR: {target.full_name}"}))
    await db.flush()
    return {"status": "demoted", "user_id": uid}


class CreateUserIn(BaseModel):
    email: str
    full_name: str
    role: str = "candidate"
    company_id: Optional[int] = None
    phone: str = ""

@router.post("/users/create")
async def create_user(data: CreateUserIn, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    from app.auth.jwt_utils import hash_password
    from app.email_service import generate_code, send_verification_email
    import random, string
    existing = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if existing: raise HTTPException(409, "Email уже используется")
    temp_pass = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    role_map = {"candidate": UserRole.CANDIDATE, "hr": UserRole.HR, "support": UserRole.SUPPORT, "admin": UserRole.ADMIN}
    code = generate_code()
    u = User(email=data.email, password_hash=hash_password(temp_pass), role=role_map.get(data.role, UserRole.CANDIDATE),
             full_name=data.full_name, phone=data.phone, company_id=data.company_id if data.company_id else None,
             email_verified=False, verification_code=code)
    db.add(u); await db.flush()
    await send_verification_email(data.email, code)
    db.add(AuditLog(user_id=current_user.id, action="create_user", details={"new_user_id": u.id, "name": data.full_name, "email": data.email, "role": data.role, "description": f"Создан: {data.full_name} ({data.email}), роль: {data.role}"}))
    await db.flush()
    return {"status": "created", "user_id": u.id, "temp_password": temp_pass}


@router.post("/users/{uid}/promote-support")
async def promote_to_support(uid: int, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not u: raise HTTPException(404)
    u.role = UserRole.SUPPORT
    u.company_id = None
    db.add(AuditLog(user_id=current_user.id, action="promote_to_support", details={"target_id": uid, "description": f"Назначен в техподдержку: ID #{uid}"}))
    await db.flush()
    return {"status": "promoted_support", "user_id": uid}

@router.post("/users/{uid}/demote-support")
async def demote_from_support(uid: int, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not u: raise HTTPException(404)
    if u.role != UserRole.SUPPORT: raise HTTPException(400, "Не является техподдержкой")
    u.role = UserRole.CANDIDATE
    db.add(AuditLog(user_id=current_user.id, action="demote_from_support", details={"target_id": uid, "description": f"Снят с техподдержки: ID #{uid}"}))
    await db.flush()
    return {"status": "demoted_support", "user_id": uid}


@router.post("/users/{uid}/promote-support")
async def promote_to_support(uid: int, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not u: raise HTTPException(404)
    u.role = UserRole.SUPPORT
    u.company_id = None
    db.add(AuditLog(user_id=current_user.id, action="promote_to_support", details={"target_id": uid, "description": f"Назначен в техподдержку: ID #{uid}"}))
    await db.flush()
    return {"status": "promoted_support", "user_id": uid}


@router.post("/users/{uid}/demote-support")
async def demote_from_support(uid: int, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not u: raise HTTPException(404)
    if u.role != UserRole.SUPPORT: raise HTTPException(400, "Не является техподдержкой")
    u.role = UserRole.CANDIDATE
    db.add(AuditLog(user_id=current_user.id, action="demote_from_support", details={"target_id": uid, "description": f"Снят с техподдержки: ID #{uid}"}))
    await db.flush()
    return {"status": "demoted_support", "user_id": uid}

# === DB Entity Browser ===
@router.get("/db/tables")
async def list_db_tables(current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    """List all tables with row counts."""
    from sqlalchemy import text
    tables_q = await db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'alembic_%' ORDER BY name"))
    tables = [r[0] for r in tables_q.fetchall()]
    result = []
    for t in tables:
        count = (await db.execute(text(f"SELECT count(*) FROM [{t}]"))).scalar() or 0
        cols_q = await db.execute(text(f"PRAGMA table_info([{t}])"))
        cols = [{"name": r[1], "type": r[2], "notnull": bool(r[3]), "pk": bool(r[5])} for r in cols_q.fetchall()]
        result.append({"name": t, "count": count, "columns": cols})
    return result

@router.get("/db/table/{table_name}")
async def get_table_rows(table_name: str, limit: int = 50, offset: int = 0, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    """Get rows from a table."""
    from sqlalchemy import text
    # Validate table exists
    check = await db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name=:n"), {"n": table_name})
    if not check.fetchone():
        raise HTTPException(404, "Table not found")
    rows = await db.execute(text(f"SELECT * FROM [{table_name}] LIMIT :l OFFSET :o"), {"l": limit, "o": offset})
    cols = list(rows.keys())
    data = [dict(zip(cols, r)) for r in rows.fetchall()]
    total = (await db.execute(text(f"SELECT count(*) FROM [{table_name}]"))).scalar()
    return {"table": table_name, "columns": cols, "rows": data, "total": total}

@router.put("/db/table/{table_name}/{row_id}")
async def update_table_row(table_name: str, row_id: int, updates: dict, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    """Update a row in a table."""
    from sqlalchemy import text
    check = await db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name=:n"), {"n": table_name})
    if not check.fetchone():
        raise HTTPException(404, "Table not found")
    # Filter out 'id' and empty-string keys
    clean = {k: v for k, v in updates.items() if k and k != 'id' and v != ''}
    if not clean:
        raise HTTPException(400, "No fields to update")
    # Use param_ prefix to avoid SQLAlchemy reserved names
    sets = ", ".join([f"[{k}] = :p_{k}" for k in clean.keys()])
    params = {f"p_{k}": v for k, v in clean.items()}
    params["row_id"] = row_id
    await db.execute(text(f"UPDATE [{table_name}] SET {sets} WHERE id = :row_id"), params)
    await db.flush()
    db.add(AuditLog(user_id=current_user.id, action="db_edit", details={"table": table_name, "row_id": row_id, "changes": clean, "description": f"Изменена запись #{row_id} в таблице {table_name}"}))
    await db.flush()
    return {"status": "updated"}

@router.delete("/db/table/{table_name}/{row_id}")
async def delete_table_row(table_name: str, row_id: int, current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    """Delete a row from a table."""
    from sqlalchemy import text
    await db.execute(text(f"DELETE FROM [{table_name}] WHERE id = :id"), {"id": row_id})
    await db.flush()
    db.add(AuditLog(user_id=current_user.id, action="db_delete", details={"table": table_name, "row_id": row_id, "description": f"Удалена запись #{row_id} из таблицы {table_name}"}))
    await db.flush()
    return {"status": "deleted"}

# === Extended AI diagnostics ===
@router.get("/ai-diagnostics")
async def ai_diagnostics(current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    """AI diagnostics — check DeepSeek provider."""
    import os, httpx
    key = os.getenv("DEEPSEEK_KEY", "")
    provider = {"name": "DeepSeek", "url": "https://api.deepseek.com/chat/completions", "model": "deepseek-chat"}
    
    if not key:
        provider["status"] = "not_configured"
        provider["error"] = "DEEPSEEK_KEY не установлен в .env"
    else:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(provider["url"], headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={"model": "deepseek-chat", "messages": [{"role": "user", "content": "Reply with exactly: OK"}], "max_tokens": 5})
                if resp.status_code == 200:
                    provider["status"] = "ok"
                    provider["response_code"] = 200
                else:
                    provider["status"] = "error"
                    provider["error"] = f"HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            provider["status"] = "error"
            provider["error"] = str(e)[:200]
    
    return {"providers": [provider]}

# === Extended DB diagnostics ===
@router.get("/db-diagnostics")
async def db_diagnostics(current_user: User = Depends(require_role([UserRole.ADMIN])), db: AsyncSession = Depends(get_db)):
    """Deep DB diagnostics — check each table individually."""
    from sqlalchemy import text
    import os
    tables_q = await db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'alembic_%'"))
    tables = []
    for r in tables_q.fetchall():
        name = r[0]
        try:
            count = (await db.execute(text(f"SELECT count(*) FROM [{name}]"))).scalar()
            tables.append({"name": name, "status": "ok", "rows": count})
        except Exception as e:
            tables.append({"name": name, "status": "error", "error": str(e)[:100]})
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "interview_platform.db")
    size = "N/A"
    if os.path.exists(db_path):
        s = os.path.getsize(db_path)
        size = f"{s/1024:.0f} KB" if s < 1048576 else f"{s/1048576:.1f} MB"
    integrity = "ok"
    try:
        res = await db.execute(text("PRAGMA integrity_check"))
        val = res.scalar()
        if val != "ok": integrity = val
    except Exception as e:
        integrity = str(e)[:100]
    return {"tables": tables, "size": size, "integrity": integrity, "path": db_path}
