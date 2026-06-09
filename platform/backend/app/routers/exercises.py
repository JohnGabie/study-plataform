from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

from app.db.database import get_db
from app.models.exercise import Exercise, TestCase
from app.services.exercise_loader import load_exercises_from_dir

router = APIRouter(prefix="/exercises", tags=["exercises"])


class TestCaseOut(BaseModel):
    id: int
    order: int
    description: str
    input: str
    expected: str
    visible: bool

    class Config:
        from_attributes = True


class ExerciseListItem(BaseModel):
    id: str
    title: str
    slug: str
    difficulty: str
    module: str
    tags: list
    concepts: list = []
    description: str = ''
    created_at: datetime
    attempt_count: int = 0
    completion_count: int = 0
    user_status: str = 'not_attempted'  # not_attempted | attempted | completed

    class Config:
        from_attributes = True


class ExerciseDetail(BaseModel):
    id: str
    title: str
    slug: str
    difficulty: str
    phase: int
    module: str
    tags: list
    concepts: list = []
    description: str
    stub: str
    hints: list
    book_reference: Optional[str]
    created_at: datetime
    test_cases: list[TestCaseOut]

    class Config:
        from_attributes = True


@router.get("/today", response_model=list[ExerciseListItem])
def get_today_exercises(db: Session = Depends(get_db)):
    today = date.today()
    exercises = (
        db.query(Exercise)
        .filter(Exercise.created_at >= datetime(today.year, today.month, today.day))
        .order_by(Exercise.created_at.asc())
        .all()
    )
    if not exercises:
        exercises = (
            db.query(Exercise)
            .order_by(Exercise.created_at.desc())
            .limit(3)
            .all()
        )
    return exercises


@router.get("", response_model=list[ExerciseListItem])
def list_exercises(db: Session = Depends(get_db)):
    exercises = db.query(Exercise).order_by(Exercise.created_at.desc()).all()
    result = []
    for ex in exercises:
        subs = ex.submissions
        attempt_count = len(subs)
        completion_count = sum(1 for s in subs if s.status == 'passed')
        if completion_count > 0:
            user_status = 'completed'
        elif attempt_count > 0:
            user_status = 'attempted'
        else:
            user_status = 'not_attempted'
        result.append({
            'id': ex.id, 'title': ex.title, 'slug': ex.slug,
            'difficulty': ex.difficulty, 'module': ex.module,
            'tags': ex.tags or [], 'concepts': ex.concepts or [],
            'created_at': ex.created_at,
            'attempt_count': attempt_count,
            'completion_count': completion_count,
            'user_status': user_status,
        })
    return result


@router.get("/{slug}", response_model=ExerciseDetail)
def get_exercise(slug: str, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.slug == slug).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercício não encontrado")
    return exercise


@router.post("/load", status_code=201)
def load_exercises(db: Session = Depends(get_db)):
    result = load_exercises_from_dir("app/exercises/generated", db)
    return result
