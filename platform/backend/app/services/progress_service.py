from sqlalchemy.orm import Session
from app.models.progress import DailyProgress
from datetime import date, timedelta


def get_or_create_today(db: Session, user_id: str) -> DailyProgress:
    today = date.today()
    record = db.query(DailyProgress).filter(
        DailyProgress.user_id == user_id,
        DailyProgress.date == today,
    ).first()
    if not record:
        record = DailyProgress(user_id=user_id, date=today)
        db.add(record)
        db.commit()
        db.refresh(record)
    return record


def record_attempt(db: Session, user_id: str, completed: bool):
    record = get_or_create_today(db, user_id)
    record.exercises_attempted += 1
    if completed:
        record.exercises_completed += 1
    db.commit()


def get_summary(db: Session, user_id: str, days: int = 7) -> dict:
    today = date.today()
    since = today - timedelta(days=days - 1)

    rows = (
        db.query(DailyProgress)
        .filter(DailyProgress.user_id == user_id, DailyProgress.date >= since)
        .order_by(DailyProgress.date.asc())
        .all()
    )

    daily = [
        {"date": str(r.date), "completed": r.exercises_completed, "attempted": r.exercises_attempted}
        for r in rows
    ]

    completed_last_7 = sum(r.exercises_completed for r in rows)
    cutoff_3 = today - timedelta(days=2)
    completed_last_3 = sum(r.exercises_completed for r in rows if r.date >= cutoff_3)

    streak = 0
    for i in range(days):
        d = today - timedelta(days=i)
        match = next((r for r in rows if r.date == d), None)
        if match and match.exercises_completed > 0:
            streak += 1
        else:
            break

    return {
        "completed_last_3_days": completed_last_3,
        "completed_last_7_days": completed_last_7,
        "current_streak": streak,
        "daily_breakdown": daily,
    }
