from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.submission import Submission
from app.models.exercise import Exercise
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/performance")
def get_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Submission, Exercise)
        .join(Exercise, Submission.exercise_id == Exercise.id)
        .filter(Submission.user_id == current_user.id)
        .all()
    )

    perf: dict[str, dict] = {}

    for submission, exercise in rows:
        concepts = exercise.concepts or []
        if not concepts:
            concepts = ["uncategorized"]
        for concept in concepts:
            if concept not in perf:
                perf[concept] = {"attempted": 0, "passed": 0}
            perf[concept]["attempted"] += 1
            if submission.status == "passed":
                perf[concept]["passed"] += 1

    for concept, data in perf.items():
        attempted = data["attempted"]
        data["rate"] = round(data["passed"] / attempted, 2) if attempted else 0.0

    return perf
