from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "sqlite:///./study_platform.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def run_migrations(engine):
    """Idempotent migrations — safe to run on every startup."""
    with engine.connect() as conn:
        # exercises.concepts
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(exercises)"))}
        if "concepts" not in cols:
            conn.execute(text("ALTER TABLE exercises ADD COLUMN concepts TEXT DEFAULT '[]'"))
            conn.commit()

        # submissions.user_id
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(submissions)"))}
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE submissions ADD COLUMN user_id TEXT REFERENCES users(id)"))
            conn.execute(text(
                "UPDATE submissions SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL"
            ))
            conn.commit()

        # daily_progress.user_id — recreate table to drop unique(date) and add unique(user_id, date)
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(daily_progress)"))}
        if "user_id" not in cols:
            conn.execute(text("""
                CREATE TABLE daily_progress_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    date DATE NOT NULL,
                    exercises_completed INTEGER NOT NULL DEFAULT 0,
                    exercises_attempted INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(user_id, date)
                )
            """))
            conn.execute(text("""
                INSERT INTO daily_progress_new (id, user_id, date, exercises_completed, exercises_attempted)
                SELECT id, (SELECT id FROM users LIMIT 1), date, exercises_completed, exercises_attempted
                FROM daily_progress
            """))
            conn.execute(text("DROP TABLE daily_progress"))
            conn.execute(text("ALTER TABLE daily_progress_new RENAME TO daily_progress"))
            conn.commit()

        # books.user_id
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(books)"))}
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE books ADD COLUMN user_id TEXT REFERENCES users(id)"))
            conn.execute(text(
                "UPDATE books SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL"
            ))
            conn.commit()

        # book_prefs: recriar com (user_id, slug) como chave composta
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(book_prefs)"))}
        if "user_id" not in cols:
            conn.execute(text("""
                CREATE TABLE book_prefs_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    slug TEXT NOT NULL,
                    dark_mode BOOLEAN NOT NULL DEFAULT 0,
                    view_mode TEXT NOT NULL DEFAULT 'single',
                    last_page INTEGER NOT NULL DEFAULT 1,
                    UNIQUE(user_id, slug)
                )
            """))
            conn.execute(text("DROP TABLE book_prefs"))
            conn.execute(text("ALTER TABLE book_prefs_new RENAME TO book_prefs"))
            conn.commit()

        # book_prefs.last_page (for existing tables already migrated)
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(book_prefs)"))}
        if "last_page" not in cols:
            conn.execute(text("ALTER TABLE book_prefs ADD COLUMN last_page INTEGER NOT NULL DEFAULT 1"))
            conn.commit()

        # books.text_path
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(books)"))}
        if "text_path" not in cols:
            conn.execute(text("ALTER TABLE books ADD COLUMN text_path TEXT"))
            conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
