import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Render Environment Variable se URL lega ya local SQLite par fallback karega
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cloudbot.db")

# SQLAlchemy compatibility fix
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Database Engine Configuration
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL connection pool configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency injection for FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()