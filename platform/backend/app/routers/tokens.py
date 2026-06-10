import hashlib
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.personal_token import PersonalToken
from app.models.user import User

router = APIRouter(prefix="/auth/tokens", tags=["tokens"])


class TokenCreate(BaseModel):
    name: str = "Claude Code"


class TokenOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    last_used_at: datetime | None = None
    token: str | None = None  # raw value — returned only on creation

    class Config:
        from_attributes = True


@router.post("", response_model=TokenOut)
def create_token(
    body: TokenCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    raw = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    pt = PersonalToken(user_id=user.id, token_hash=hashed, name=body.name)
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return TokenOut(id=pt.id, name=pt.name, created_at=pt.created_at, token=raw)


@router.get("", response_model=list[TokenOut])
def list_tokens(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pts = db.query(PersonalToken).filter(PersonalToken.user_id == user.id).all()
    return [TokenOut(id=p.id, name=p.name, created_at=p.created_at, last_used_at=p.last_used_at) for p in pts]


@router.delete("/{token_id}", status_code=204)
def revoke_token(
    token_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pt = db.query(PersonalToken).filter(
        PersonalToken.id == token_id, PersonalToken.user_id == user.id
    ).first()
    if not pt:
        raise HTTPException(status_code=404, detail="Token not found")
    db.delete(pt)
    db.commit()


@router.get("/claude-md", response_class=PlainTextResponse)
def get_claude_md(user: User = Depends(get_current_user)):
    rank = _compute_rank(user.honor)
    return f"""# Study Platform — Local Kata Development

You are connected to {user.name}'s study platform via MCP.

## On session start
Call `get_context()` to read the current learning state.

## Available tools
- `get_context()` — rank, honor, streak, current phase
- `get_exercises(difficulty?, tag?)` — list available katas
- `get_exercise(slug)` — full description + visible test cases
- `submit_solution(slug, code, passed, test_results)` — record solution
- `get_progress()` — stats, streak, recent activity
- `get_books()` — library of books

## How to solve a kata
1. Call `get_exercise(slug)` to read the problem and test cases
2. Write a Python solution
3. Run the tests locally against the test cases
4. Call `submit_solution` with code + test results
5. Show the result to the user

## Rules
- NEVER submit without explicit user confirmation
- Always run tests before submitting
- Show test results (pass/fail per case) before asking to submit
- Do not modify platform exercises
- Only access this user's data (enforced by auth token)

## User context
- Name: {user.name}
- Current rank: {rank}
- Honor: {user.honor}
"""


def _compute_rank(honor: int) -> str:
    from app.models.user import honor_to_rank
    return honor_to_rank(honor)
