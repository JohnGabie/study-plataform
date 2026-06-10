from sqlalchemy import Column, Integer, Date, String, UniqueConstraint
from app.db.database import Base
from datetime import date


class DailyProgress(Base):
    __tablename__ = "daily_progress"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_date"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    exercises_completed = Column(Integer, default=0)
    exercises_attempted = Column(Integer, default=0)
