"""Authentication endpoints: register, login, me, verify."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import User, UserRole
from app.auth.schemas import UserRegister, UserLogin, TokenResponse, UserOut
from app.auth.jwt_utils import hash_password, verify_password, create_access_token
from app.auth.dependencies import get_current_user
from app.email_service import generate_code, send_verification_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new candidate account — sends verification code."""
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Пользователь с таким email уже существует")

    code = generate_code()
    user = User(
        email=data.email, password_hash=hash_password(data.password),
        role=UserRole.CANDIDATE, full_name=data.full_name, phone=data.phone,
        email_verified=False, verification_code=code,
    )
    db.add(user); await db.flush()

    await send_verification_email(data.email, code)

    token = create_access_token({"user_id": user.id, "role": user.role.value})
    return TokenResponse(access_token=token, role=user.role.value, user_id=user.id, full_name=user.full_name)


class VerifyIn(BaseModel):
    code: str

@router.post("/verify")
async def verify_email(data: VerifyIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Verify email with code sent during registration."""
    if current_user.email_verified:
        return {"status": "already_verified"}
    if current_user.verification_code != data.code:
        raise HTTPException(400, "Неверный код подтверждения")
    current_user.email_verified = True
    current_user.verification_code = None
    await db.flush()
    return {"status": "verified"}

@router.post("/resend-code")
async def resend_code(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Resend verification code to email."""
    code = generate_code()
    current_user.verification_code = code
    await db.flush()
    await send_verification_email(current_user.email, code)
    return {"status": "sent", "method": "email"}

@router.post("/resend-code-phone")
async def resend_code_phone(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Send verification code to phone."""
    from app.email_service import send_verification_sms
    if not current_user.phone:
        raise HTTPException(400, "Номер телефона не указан")
    code = generate_code()
    current_user.verification_code = code
    await db.flush()
    await send_verification_sms(current_user.phone, code)
    return {"status": "sent", "method": "phone"}


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован"
        )

    token = create_access_token({"user_id": user.id, "role": user.role.value})

    # Audit log
    from app.models import AuditLog
    db.add(AuditLog(user_id=user.id, action="login", details={"role": user.role.value}))
    await db.flush()

    return TokenResponse(
        access_token=token,
        role=user.role.value,
        user_id=user.id,
        full_name=user.full_name,
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role.value,
        full_name=current_user.full_name,
        phone=current_user.phone,
        is_active=current_user.is_active,
    )


@router.get("/user/{user_id}")
async def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get any user's public profile (for viewing candidate/HR profiles)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    company_name = None
    if user.company_id:
        from app.models import Company
        c = (await db.execute(select(Company).where(Company.id == user.company_id))).scalar_one_or_none()
        if c: company_name = c.name
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value,
        "full_name": user.full_name,
        "phone": user.phone,
        "company_id": user.company_id,
        "company_name": company_name,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

@router.get("/share/{entity_type}/{entity_id}")
async def get_share_link(entity_type: str, entity_id: int):
    """Generate a share link for profile/vacancy/interview."""
    import hashlib, time
    token = hashlib.md5(f"{entity_type}:{entity_id}:{int(time.time()//3600)}".encode()).hexdigest()[:12]
    return {"link": f"/#/{entity_type}/{entity_id}", "token": token, "type": entity_type, "id": entity_id}

class ProfileUpdateIn(BaseModel):
    full_name: str = None
    phone: str = None
    email: str = None
    bio: str = None
    skills: str = None

@router.put("/profile")
async def update_profile(data: ProfileUpdateIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Update current user's profile."""
    if data.full_name is not None: current_user.full_name = data.full_name
    if data.phone is not None: current_user.phone = data.phone
    if data.email is not None and data.email != current_user.email:
        existing = (await db.execute(select(User).where(User.email == data.email, User.id != current_user.id))).scalar_one_or_none()
        if existing: raise HTTPException(409, "Email уже используется")
        current_user.email = data.email
    await db.flush()
    return {"status": "updated", "user_id": current_user.id}

# === Notifications API ===
@router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models import Notification
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc()).limit(50)
    )
    notifs = result.scalars().all()
    return [{"id": n.id, "type": n.type, "title": n.title, "message": n.message,
             "is_read": n.is_read, "link": n.link, "created_at": n.created_at.isoformat()} for n in notifs]

@router.post("/notifications/{nid}/read")
async def mark_notification_read(nid: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models import Notification
    n = (await db.execute(select(Notification).where(Notification.id == nid, Notification.user_id == current_user.id))).scalar_one_or_none()
    if n: n.is_read = True; await db.flush()
    return {"status": "ok"}

@router.post("/notifications/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models import Notification
    from sqlalchemy import update
    await db.execute(update(Notification).where(Notification.user_id == current_user.id).values(is_read=True))
    await db.flush()
    return {"status": "ok"}

async def create_notification(db, user_id: int, type: str, title: str, message: str, link: str = ""):
    """Helper to create a notification."""
    from app.models import Notification
    db.add(Notification(user_id=user_id, type=type, title=title, message=message, link=link))
