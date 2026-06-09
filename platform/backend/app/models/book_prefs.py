from sqlalchemy import Column, String, Boolean
from app.db.database import Base


class BookPrefs(Base):
    __tablename__ = "book_prefs"

    slug      = Column(String, primary_key=True)
    dark_mode = Column(Boolean, default=False, nullable=False)
    view_mode = Column(String,  default="single", nullable=False)  # "single" | "double"
