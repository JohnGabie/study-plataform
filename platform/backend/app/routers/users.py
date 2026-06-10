from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, honor_to_rank, rank_progress, RANK_THRESHOLDS
from app.models.submission import Submission
from app.models.exercise import Exercise
from app.models.progress import DailyProgress
from app.services.progress_service import get_summary

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    name: str


@router.patch("/me")
def update_me(
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="name cannot be empty")
    current_user.name = body.name.strip()
    db.commit()
    return {"name": current_user.name}


@router.get("/me/stats")
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = current_user

    total_completed = (
        db.query(func.count(Submission.id))
        .filter(Submission.user_id == user.id, Submission.status == "passed")
        .scalar() or 0
    )
    total_attempted = (
        db.query(func.count(Submission.id))
        .filter(Submission.user_id == user.id)
        .scalar() or 0
    )

    rank = honor_to_rank(user.honor)
    progress = rank_progress(user.honor)

    next_rank_idx = next(
        (i + 1 for i, (_, name) in enumerate(RANK_THRESHOLDS) if name == rank),
        len(RANK_THRESHOLDS) - 1,
    )
    honor_for_next = RANK_THRESHOLDS[min(next_rank_idx, len(RANK_THRESHOLDS) - 1)][0]

    days_since_joined = 0
    if user.created_at:
        days_since_joined = (date.today() - user.created_at.date()).days

    days_active = (
        db.query(func.count(DailyProgress.id))
        .filter(DailyProgress.user_id == user.id, DailyProgress.exercises_completed > 0)
        .scalar() or 0
    )

    summary = get_summary(db, user_id=user.id, days=7)

    recent = (
        db.query(Submission, Exercise)
        .join(Exercise, Submission.exercise_id == Exercise.id)
        .filter(Submission.user_id == user.id, Submission.status == "passed")
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

    since = date.today() - timedelta(weeks=52)
    heatmap_rows = (
        db.query(DailyProgress)
        .filter(DailyProgress.user_id == user.id, DailyProgress.date >= since)
        .all()
    )
    heatmap = {str(r.date): r.exercises_completed for r in heatmap_rows}

    return {
        "user": {
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "created_at": str(user.created_at.date()),
        },
        "rank": rank,
        "rank_progress": round(progress, 3),
        "honor": user.honor,
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
