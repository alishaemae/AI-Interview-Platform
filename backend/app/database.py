"""Database configuration — SQLite for easy local deployment."""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# SQLite database file — created automatically next to the app
DB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(DB_DIR, "interview_platform.db")

DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"
DATABASE_URL_SYNC = f"sqlite:///{DB_PATH}"

# Async engine
async_engine = create_async_engine(DATABASE_URL, echo=False)

# Enable WAL mode and foreign keys for SQLite
@event.listens_for(async_engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine for seeds
sync_engine = create_engine(DATABASE_URL_SYNC, echo=False)
SyncSessionLocal = sessionmaker(bind=sync_engine)


async def get_db() -> AsyncSession:
    """Dependency for getting async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables if they don't exist."""
    from app.models.models import Base
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
