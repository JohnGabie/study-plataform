from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.models.submission import Submission
from app.models.exercise import Exercise
from app.services.progress_service import record_attempt

router = APIRouter(prefix="/submissions", tags=["submissions"])


class TestResultIn(BaseModel):
    id: int
    passed: bool
    output: Optional[str] = None


class SubmissionIn(BaseModel):
    exercise_id: str
    code: str
    status: str  # passed | failed | partial
    test_results: list[TestResultIn]
    time_spent_seconds: Optional[int] = None


class SubmissionOut(BaseModel):
    id: str
    exercise_id: str
    status: str
    submitted_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=SubmissionOut, status_code=201)
def create_submission(body: SubmissionIn, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == body.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercício não encontrado")

    submission = Submission(
        exercise_id=body.exercise_id,
        code=body.code,
        status=body.status,
        test_results=[r.model_dump() for r in body.test_results],
        time_spent_seconds=body.time_spent_seconds,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    record_attempt(db, completed=body.status == "passed")

    return submission


@router.get("/exercise/{exercise_id}", response_model=list[SubmissionOut])
def get_submissions_for_exercise(exercise_id: str, db: Session = Depends(get_db)):
    return (
        db.query(Submission)
        .filter(Submission.exercise_id == exercise_id)
        .order_by(Submission.submitted_at.desc())
        .all()
    )
