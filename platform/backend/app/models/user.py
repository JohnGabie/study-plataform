from sqlalchemy import Column, String, Integer, DateTime
from app.db.database import Base
from datetime import datetime

HONOR_PER_DIFFICULTY = {"8kyu": 2, "7kyu": 4, "6kyu": 8, "5kyu": 16, "4kyu": 32, "3kyu": 80}
RANK_THRESHOLDS = [
    (0, "8kyu"), (30, "7kyu"), (120, "6kyu"),
    (400, "5kyu"), (1200, "4kyu"), (4000, "3kyu"),
]


def honor_to_rank(honor: int) -> str:
    rank = "8kyu"
    for threshold, name in RANK_THRESHOLDS:
        if honor >= threshold:
            rank = name
    return rank


def rank_progress(honor: int) -> float:
    thresholds = RANK_THRESHOLDS
    for i, (threshold, _) in enumerate(thresholds):
        if i + 1 < len(thresholds):
            next_threshold = thresholds[i + 1][0]
            if honor < next_threshold:
                prev = threshold
                return (honor - prev) / (next_threshold - prev)
    return 1.0


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # google sub
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    honor = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)
