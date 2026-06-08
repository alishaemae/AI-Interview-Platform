"""SQLAlchemy ORM models for the AI Interview Platform."""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    ForeignKey, Enum, JSON, Index, func
)
from sqlalchemy.orm import relationship, DeclarativeBase


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    GUEST = "guest"
    CANDIDATE = "candidate"
    HR = "hr"
    ADMIN = "admin"
    SUPPORT = "support"


class InterviewStatus(str, enum.Enum):
    CREATED = "created"
    TASK_ACTIVE = "task_active"
    EVALUATING = "evaluating"
    ADAPTING = "adapting"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DifficultyLevel(str, enum.Enum):
    JUNIOR = "junior"
    MIDDLE = "middle"
    SENIOR = "senior"


class TaskDomain(str, enum.Enum):
    ARRAYS = "arrays"
    STRINGS = "strings"
    TREES = "trees"
    GRAPHS = "graphs"
    DYNAMIC_PROGRAMMING = "dynamic_programming"
    SORTING = "sorting"
    HASH_TABLES = "hash_tables"
    LINKED_LISTS = "linked_lists"
    RECURSION = "recursion"
    MATH = "math"
    # IT specialties
    SQL = "sql"
    SYSTEM_DESIGN = "system_design"
    NETWORKING = "networking"
    LINUX = "linux"
    TESTING = "testing"
    ANALYTICS = "analytics"
    DOCKER = "docker"
    GIT = "git"
    OOP = "oop"
    PANDAS = "pandas"
    PYTEST = "pytest"
    SELENIUM = "selenium"
    SKLEARN = "sklearn"
    CI_CD = "ci_cd"
    YAML_CONFIG = "yaml_config"
    BASH = "bash"
    API = "api"
    DATA_PROCESSING = "data_processing"
    METRICS = "metrics"
    DATABASES = "databases"


# ── Users ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CANDIDATE)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    verification_code = Column(String(10), nullable=True)

    interviews = relationship("Interview", back_populates="user")
    company = relationship("Company", back_populates="users")


# ── Companies ────────────────────────────────────────────────────────────────

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    website = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="company")
    vacancies = relationship("Vacancy", back_populates="company")


# ── Vacancies ────────────────────────────────────────────────────────────────

class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title = Column(String(255), nullable=False)
    specialty = Column(String(50), nullable=False)  # developer, analyst, devops, qa, data_science
    level = Column(String(20), nullable=False)  # junior, middle, senior
    description = Column(Text, nullable=True)
    salary_from = Column(Integer, nullable=True)
    salary_to = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="vacancies")

    def __repr__(self):
        return f"<User {self.email} ({self.role.value})>"


# ── Task Templates (Bank) ───────────────────────────────────────────────────

class TaskTemplate(Base):
    __tablename__ = "task_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    domain = Column(Enum(TaskDomain), nullable=False)
    level = Column(Enum(DifficultyLevel), nullable=False)
    description = Column(Text, nullable=False)
    skeleton_code = Column(Text, nullable=True)
    input_format = Column(Text, nullable=False)
    output_format = Column(Text, nullable=False)
    reference_solution = Column(Text, nullable=False)
    visible_tests = Column(JSON, nullable=False)  # [{"input": ..., "expected": ...}]
    hidden_tests = Column(JSON, nullable=False)
    constraints = Column(Text, nullable=True)
    time_limit_seconds = Column(Integer, default=10)
    memory_limit_mb = Column(Integer, default=256)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="template")


# ── Interviews (Sessions) ───────────────────────────────────────────────────

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(InterviewStatus), default=InterviewStatus.CREATED)
    level = Column(Enum(DifficultyLevel), nullable=False)
    total_score = Column(Float, default=0.0)
    total_tasks = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_recommendation = Column(String(50), nullable=True)  # hire / maybe / reject
    specialty = Column(String(50), nullable=True)  # developer / analyst / devops / qa / data_science

    user = relationship("User", back_populates="interviews")
    tasks = relationship("Task", back_populates="interview")
    chat_messages = relationship("ChatMessage", back_populates="interview")
    metrics = relationship("Metric", back_populates="interview")
    anticheat_events = relationship("AnticheatEvent", back_populates="interview")


# ── Tasks (Concrete instances from templates) ───────────────────────────────

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("task_templates.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    domain = Column(Enum(TaskDomain), nullable=False)
    level = Column(Enum(DifficultyLevel), nullable=False)
    visible_tests = Column(JSON, nullable=False)
    hidden_tests = Column(JSON, nullable=False)
    reference_solution = Column(Text, nullable=True)
    order_number = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    interview = relationship("Interview", back_populates="tasks")
    template = relationship("TaskTemplate", back_populates="tasks")
    submissions = relationship("Submission", back_populates="task")


# ── Submissions ──────────────────────────────────────────────────────────────

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    code = Column(Text, nullable=False)
    language = Column(String(20), default="python")
    passed_visible = Column(Integer, default=0)
    total_visible = Column(Integer, default=0)
    passed_hidden = Column(Integer, default=0)
    total_hidden = Column(Integer, default=0)
    score = Column(Float, default=0.0)
    execution_time_ms = Column(Integer, nullable=True)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    is_final = Column(Boolean, default=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="submissions")


# ── Chat Messages ────────────────────────────────────────────────────────────

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    sender = Column(String(20), nullable=False)  # 'candidate' | 'ai'
    content = Column(Text, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    interview = relationship("Interview", back_populates="chat_messages")


# ── Metrics / Code Snapshots ────────────────────────────────────────────────

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    event_type = Column(String(50), nullable=False)  # code_snapshot, test_run, submit, etc.
    data = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    interview = relationship("Interview", back_populates="metrics")


# ── Anticheat Events ────────────────────────────────────────────────────────

class AnticheatEvent(Base):
    __tablename__ = "anticheat_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    severity = Column(Float, default=0.0)
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    interview = relationship("Interview", back_populates="anticheat_events")


# ── Direct Messages (HR ↔ Candidate) ────────────────────────────────────────

class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])


# ── Specialty (interview domain) ────────────────────────────────────────────

class Specialty(str, enum.Enum):
    DEVELOPER = "developer"
    ANALYST = "analyst"
    DEVOPS = "devops"
    QA = "qa"
    DATA_SCIENCE = "data_science"


# Indexes
Index("ix_interviews_user_id", Interview.user_id)
Index("ix_tasks_interview_id", Task.interview_id)
Index("ix_submissions_task_id", Submission.task_id)
Index("ix_chat_messages_interview_id", ChatMessage.interview_id)
Index("ix_metrics_interview_id", Metric.interview_id)
Index("ix_anticheat_events_interview_id", AnticheatEvent.interview_id)
Index("ix_direct_messages_to", DirectMessage.to_user_id)


# ── Support Tickets ──────────────────────────────────────────────────────



class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # interview_complete, new_message, ticket_reply, system, offer, vacancy_new
    title = Column(String(200), nullable=False)
    message = Column(String(500), default="")
    is_read = Column(Boolean, default=False)
    link = Column(String(200), default="")
    created_at = Column(DateTime, server_default=func.now())
class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="general")  # bug, question, security, general
    priority = Column(String(20), default="medium")  # low, medium, high, critical
    status = Column(String(20), default="open")  # open, in_progress, waiting, resolved, closed
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", foreign_keys=[user_id])


class TicketReply(Base):
    __tablename__ = "ticket_replies"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", foreign_keys=[user_id])
    ticket = relationship("SupportTicket")


# ── Audit Log ────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", foreign_keys=[user_id])
