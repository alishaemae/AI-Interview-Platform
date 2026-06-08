"""AI Interview Platform — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()  # Load .env before anything else

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth.router import router as auth_router
from app.interviews.router import router as interviews_router
from app.ai_interviewer.router import router as chat_router
from app.anticheat.router import router as anticheat_router
from app.metrics.router import router as metrics_router
from app.hr.router import router as hr_router
from app.reports.router import router as reports_router
from app.messages import router as messages_router
from app.vacancies import router as vacancies_router
from app.admin import router as admin_router
from app.support import router as support_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.app_name}...")
    # Auto-create tables and seed data
    from app.database import init_db
    await init_db()
    from app.seed import seed_database
    await seed_database()
    logger.info("Database ready!")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.app_name,
    description="Платформа автоматизированного технического собеседования с AI-интервьюером",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for Electron + React dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "file://"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(interviews_router)
app.include_router(chat_router)
app.include_router(anticheat_router)
app.include_router(metrics_router)
app.include_router(hr_router)
app.include_router(reports_router)
app.include_router(messages_router)
app.include_router(vacancies_router)
app.include_router(admin_router)
app.include_router(support_router)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}
