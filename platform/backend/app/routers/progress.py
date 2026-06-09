from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.db.database import get_db
from app.services.progress_service import get_summary

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/summary")
def progress_summary(days: int = Query(default=7, ge=1, le=90), db: Session = Depends(get_db)):
    return get_summary(db, days=days)


@router.get("/resume")
def progress_resume(db: Session = Depends(get_db)) -> Optional[dict]:
    from app.models.submission import Submission
    from app.models.exercise import Exercise

    last_sub = (
        db.query(Submission)
        .order_by(Submission.submitted_at.desc())
        .first()
    )
    if not last_sub:
        return None

    exercise = db.query(Exercise).filter(Exercise.id == last_sub.exercise_id).first()
    if not exercise:
        return None

    already_passed = (
        db.query(Submission)
        .filter(Submission.exercise_id == exercise.id, Submission.status == "passed")
        .first()
    )
    if already_passed:
        return None

    test_results = last_sub.test_results or []
    passed_count = sum(1 for t in test_results if t.get("passed"))

    return {
        "exercise": {
            "title": exercise.title,
            "slug": exercise.slug,
            "difficulty": exercise.difficulty,
        },
        "passed_count": passed_count,
        "total_count": len(test_results),
        "submitted_at": last_sub.submitted_at.isoformat() if last_sub.submitted_at else None,
    }


@router.get("/recent-exercises")
def recent_exercises(limit: int = Query(default=20, ge=1, le=50), db: Session = Depends(get_db)):
    from app.models.submission import Submission
    from app.models.exercise import Exercise

    subq = (
        db.query(
            Submission.exercise_id,
            func.max(Submission.submitted_at).label("latest_at"),
        )
        .group_by(Submission.exercise_id)
        .subquery()
    )

    rows = (
        db.query(Submission, Exercise)
        .join(subq, (Submission.exercise_id == subq.c.exercise_id) &
              (Submission.submitted_at == subq.c.latest_at))
        .join(Exercise, Exercise.id == Submission.exercise_id)
        .order_by(Submission.submitted_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for sub, ex in rows:
        ever_passed = (
            db.query(Submission)
            .filter(Submission.exercise_id == ex.id, Submission.status == "passed")
            .first()
        )
        result.append({
            "id": ex.id,
            "title": ex.title,
            "slug": ex.slug,
            "difficulty": ex.difficulty,
            "tags": ex.tags or [],
            "status": "passed" if ever_passed else sub.status,
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
        })

    return result
