from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.submission import Submission
from app.models.exercise import Exercise

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/performance")
def get_performance(db: Session = Depends(get_db)):
    """
    Returns per-concept performance aggregated across all submissions.
    Used by the daily agent to calibrate next exercise batch.

    Response shape:
    {
      "http:status-codes": {"attempted": 5, "passed": 3, "rate": 0.6},
      ...
    }
    """
    rows = (
        db.query(Submission, Exercise)
        .join(Exercise, Submission.exercise_id == Exercise.id)
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
