from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta

from app.db.database import get_db
from app.models.user import User, honor_to_rank, rank_progress, RANK_THRESHOLDS
from app.models.submission import Submission
from app.models.exercise import Exercise
from app.models.progress import DailyProgress
from app.services.progress_service import get_summary

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/stats")
def get_my_stats(db: Session = Depends(get_db)):
    user = db.query(User).first()

    total_completed = (
        db.query(func.count(Submission.id))
        .filter(Submission.status == "passed")
        .scalar() or 0
    )
    total_attempted = db.query(func.count(Submission.id)).scalar() or 0

    honor = user.honor if user else 0
    rank = honor_to_rank(honor)
    progress = rank_progress(honor)

    next_rank_idx = next(
        (i + 1 for i, (_, name) in enumerate(RANK_THRESHOLDS) if name == rank),
        len(RANK_THRESHOLDS) - 1,
    )
    honor_for_next = RANK_THRESHOLDS[min(next_rank_idx, len(RANK_THRESHOLDS) - 1)][0]

    days_since_joined = 0
    if user and user.created_at:
        days_since_joined = (date.today() - user.created_at.date()).days

    days_active = (
        db.query(func.count(DailyProgress.id))
        .filter(DailyProgress.exercises_completed > 0)
        .scalar() or 0
    )

    summary = get_summary(db, days=7)

    recent = (
        db.query(Submission, Exercise)
        .join(Exercise, Submission.exercise_id == Exercise.id)
        .filter(Submission.status == "passed")
        .order_by(Submission.submitted_at.desc())
        .limit(5)
        .all()
    )
    recent_completions = [
        {
            "title": ex.title,
            "slug": ex.slug,
            "difficulty": ex.difficulty,
            "submitted_at": str(sub.submitted_at),
        }
        for sub, ex in recent
    ]

    # Heatmap: last 52 weeks
    since = date.today() - timedelta(weeks=52)
    heatmap_rows = (
        db.query(DailyProgress)
        .filter(DailyProgress.date >= since)
        .all()
    )
    heatmap = {str(r.date): r.exercises_completed for r in heatmap_rows}

    return {
        "user": {
            "name": user.name if user else "João",
            "email": user.email if user else "",
            "avatar_url": user.avatar_url if user else None,
            "created_at": str(user.created_at.date()) if user else str(date.today()),
        },
        "rank": rank,
        "rank_progress": round(progress, 3),
        "honor": honor,
        "honor_for_next_rank": honor_for_next,
        "total_completed": total_completed,
        "total_attempted": total_attempted,
        "completion_rate": round(total_completed / total_attempted, 2) if total_attempted else 0,
        "current_streak": summary["current_streak"],
        "days_active": days_active,
        "days_since_joined": days_since_joined,
        "recent_completions": recent_completions,
        "heatmap": heatmap,
        "weekly_summary": summary,
    }
