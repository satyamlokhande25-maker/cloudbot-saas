import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL: PostgreSQL / Supabase Connection URI (Fallback to local SQLite if not configured)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cloudbot.db")

# SQLite needs check_same_thread=False, PostgreSQL does not
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for API endpoints to get a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()