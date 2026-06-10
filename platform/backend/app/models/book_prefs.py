from sqlalchemy import Column, String, Boolean, Integer, UniqueConstraint
from app.db.database import Base


class BookPrefs(Base):
    __tablename__ = "book_prefs"
    __table_args__ = (UniqueConstraint("user_id", "slug", name="uq_user_slug"),)

    id        = Column(Integer, primary_key=True, autoincrement=True)
    user_id   = Column(String, nullable=False)
    slug      = Column(String, nullable=False)
    dark_mode = Column(Boolean, default=False, nullable=False)
    view_mode = Column(String, default="single", nullable=False)  # "single" | "double"
    last_page = Column(Integer, default=1, nullable=False)
