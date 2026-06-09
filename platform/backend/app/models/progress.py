from sqlalchemy import Column, Integer, Date
from app.db.database import Base
from datetime import date


class DailyProgress(Base):
    __tablename__ = "daily_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, unique=True, nullable=False, default=date.today)
    exercises_completed = Column(Integer, default=0)
    exercises_attempted = Column(Integer, default=0)
