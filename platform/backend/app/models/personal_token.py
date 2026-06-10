import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.db.database import Base


class PersonalToken(Base):
    __tablename__ = "personal_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    token_hash = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False, default="Claude Code")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
