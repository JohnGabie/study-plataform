from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "sqlite:///./study_platform.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def run_migrations(eng):
    """Idempotent column migrations — safe to run on every startup."""
    with eng.connect() as conn:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(exercises)"))}
        if "concepts" not in existing:
            conn.execute(text("ALTER TABLE exercises ADD COLUMN concepts TEXT DEFAULT '[]'"))
            conn.commit()


def run_migrations(engine):
    """Add new columns to existing tables without dropping data."""
    with engine.connect() as conn:
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(exercises)"))}
        if "concepts" not in cols:
            conn.execute(text("ALTER TABLE exercises ADD COLUMN concepts TEXT DEFAULT '[]'"))
            conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
