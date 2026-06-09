from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from app.db.database import Base


class Book(Base):
    __tablename__ = "books"

    id           = Column(String, primary_key=True)
    slug         = Column(String, unique=True, nullable=False, index=True)
    title        = Column(String, nullable=False)
    author       = Column(String, nullable=False)
    year         = Column(Integer, nullable=True)
    phase        = Column(Integer, nullable=True)
    content_type = Column(String, nullable=False)   # "markdown" | "pdf"
    file_path    = Column(String, nullable=False)   # relative to uvicorn cwd
    cover_path   = Column(String, nullable=True)    # relative to uvicorn cwd
    created_at   = Column(DateTime, default=datetime.utcnow)
