from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime
import uuid


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(80), nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    difficulty = Column(String(10), nullable=False)
    phase = Column(Integer, nullable=False)
    module = Column(String, nullable=False)
    tags = Column(JSON, default=list)
    description = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    stub = Column(Text, nullable=False)
    solution = Column(Text, nullable=False)
    hints = Column(JSON, default=list)
    concepts = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    generated_by = Column(String(50), default="manual")
    book_reference = Column(String, nullable=True)

    test_cases = relationship("TestCase", back_populates="exercise", order_by="TestCase.order")
    submissions = relationship("Submission", back_populates="exercise")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False)
    order = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    input = Column(Text, nullable=False)
    expected = Column(Text, nullable=False)
    visible = Column(Boolean, default=True)

    exercise = relationship("Exercise", back_populates="test_cases")
