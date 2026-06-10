from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime
import uuid


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String(20), nullable=False)  # passed | failed | partial
    test_results = Column(JSON, default=list)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    time_spent_seconds = Column(Integer, nullable=True)

    exercise = relationship("Exercise", back_populates="submissions")
