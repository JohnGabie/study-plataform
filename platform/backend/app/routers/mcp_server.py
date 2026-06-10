"""
MCP server implementing the Streamable HTTP transport (2024-11-05 spec).
Each POST to /mcp carries one JSON-RPC message; auth via Bearer personal token.
"""
import hashlib
import json
import uuid
from datetime import datetime, date, timedelta
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.personal_token import PersonalToken
from app.models.user import User, HONOR_PER_DIFFICULTY, honor_to_rank
from app.models.exercise import Exercise, TestCase
from app.models.submission import Submission
from app.models.book import Book
from app.models.progress import DailyProgress
from app.services.progress_service import record_attempt

router = APIRouter(tags=["mcp"])

# ── Auth ──────────────────────────────────────────────────────────────────────

def _auth(authorization: str | None, db: Session) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    raw = authorization[7:]
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    pt = db.query(PersonalToken).filter(PersonalToken.token_hash == hashed).first()
    if not pt:
        return None
    pt.last_used_at = datetime.utcnow()
    db.commit()
    return db.query(User).filter(User.id == pt.user_id).first()


# ── Tool implementations ──────────────────────────────────────────────────────

def tool_get_context(user: User, db: Session) -> dict:
    today = date.today()
    since = today - timedelta(days=29)
    rows = db.query(DailyProgress).filter(
        DailyProgress.user_id == user.id,
        DailyProgress.date >= since,
    ).order_by(DailyProgress.date.desc()).all()

    streak = 0
    for i in range(30):
        d = today - timedelta(days=i)
        match = next((r for r in rows if r.date == d), None)
        if match and match.exercises_completed > 0:
            streak += 1
        else:
            break

    total_exercises = db.query(Exercise).count()
    rank = honor_to_rank(user.honor)
    return {
        "user": user.name,
        "rank": rank,
        "honor": user.honor,
        "streak_days": streak,
        "total_exercises_available": total_exercises,
        "tip": "Use get_exercises() to browse katas or get_exercise(slug) to start one.",
    }


def tool_get_exercises(difficulty: str | None, tag: str | None, db: Session) -> list:
    q = db.query(Exercise)
    if difficulty:
        q = q.filter(Exercise.difficulty == difficulty)
    results = []
    for ex in q.order_by(Exercise.difficulty).all():
        tags = ex.tags or []
        if tag and tag not in tags:
            continue
        results.append({
            "slug": ex.slug,
            "title": ex.title,
            "difficulty": ex.difficulty,
            "tags": tags,
            "module": ex.module,
        })
    return results


def tool_get_exercise(slug: str, db: Session) -> dict:
    ex = db.query(Exercise).filter(Exercise.slug == slug).first()
    if not ex:
        return {"error": f"Exercise '{slug}' not found"}
    visible_cases = [
        {"order": tc.order, "description": tc.description, "input": tc.input, "expected": tc.expected}
        for tc in ex.test_cases if tc.visible
    ]
    return {
        "slug": ex.slug,
        "title": ex.title,
        "difficulty": ex.difficulty,
        "tags": ex.tags or [],
        "module": ex.module,
        "description": ex.description,
        "stub": ex.stub,
        "hints": ex.hints or [],
        "test_cases": visible_cases,
    }


def tool_submit_solution(
    slug: str, code: str, passed: bool,
    test_results: list, user: User, db: Session,
) -> dict:
    ex = db.query(Exercise).filter(Exercise.slug == slug).first()
    if not ex:
        return {"error": f"Exercise '{slug}' not found"}

    passed_count = sum(1 for r in test_results if r.get("passed"))
    total_count = len(test_results)
    status = "passed" if passed else ("partial" if passed_count > 0 else "failed")

    sub = Submission(
        id=str(uuid.uuid4()),
        user_id=user.id,
        exercise_id=ex.id,
        code=code,
        status=status,
        test_results=test_results,
    )
    db.add(sub)

    if passed:
        honor_gain = HONOR_PER_DIFFICULTY.get(ex.difficulty, 2)
        user.honor += honor_gain

    record_attempt(db, user.id, completed=passed)
    db.commit()

    return {
        "status": status,
        "passed": passed_count,
        "total": total_count,
        "honor_gained": HONOR_PER_DIFFICULTY.get(ex.difficulty, 2) if passed else 0,
        "new_rank": honor_to_rank(user.honor),
        "message": "✓ Solução aceita!" if passed else f"{passed_count}/{total_count} testes passaram",
    }


def tool_get_progress(user: User, db: Session) -> dict:
    today = date.today()
    since = today - timedelta(days=6)
    rows = db.query(DailyProgress).filter(
        DailyProgress.user_id == user.id,
        DailyProgress.date >= since,
    ).all()
    completed_7d = sum(r.exercises_completed for r in rows)

    total_passed = db.query(Submission).filter(
        Submission.user_id == user.id,
        Submission.status == "passed",
    ).count()

    return {
        "rank": honor_to_rank(user.honor),
        "honor": user.honor,
        "completed_last_7_days": completed_7d,
        "total_passed": total_passed,
        "daily": [{"date": str(r.date), "completed": r.exercises_completed} for r in rows],
    }


def tool_get_books(user: User, db: Session) -> list:
    books = db.query(Book).filter(Book.user_id == user.id).all()
    return [
        {
            "slug": b.slug, "title": b.title, "author": b.author,
            "type": b.content_type, "has_text": bool(b.text_path),
        }
        for b in books
    ]


# ── Tool registry ─────────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "get_context",
        "description": "Get your current learning context: rank, honor, streak, and platform overview. Call this at the start of every session.",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_exercises",
        "description": "List available katas. Filter by difficulty (8kyu–3kyu) or tag (python, fastapi, http, sql, etc.).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "difficulty": {"type": "string", "description": "8kyu | 7kyu | 6kyu | 5kyu | 4kyu | 3kyu"},
                "tag": {"type": "string"},
            },
        },
    },
    {
        "name": "get_exercise",
        "description": "Get full exercise details: description, starter code, visible test cases, and hints.",
        "inputSchema": {
            "type": "object",
            "properties": {"slug": {"type": "string"}},
            "required": ["slug"],
        },
    },
    {
        "name": "submit_solution",
        "description": "Record a solution and its test results to the platform. Run tests locally first.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string"},
                "code": {"type": "string", "description": "Final Python solution"},
                "passed": {"type": "boolean", "description": "True if ALL tests passed"},
                "test_results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "passed": {"type": "boolean"},
                            "input": {"type": "string"},
                            "expected": {"type": "string"},
                            "got": {"type": "string"},
                        },
                        "required": ["passed"],
                    },
                },
            },
            "required": ["slug", "code", "passed", "test_results"],
        },
    },
    {
        "name": "get_progress",
        "description": "Get your rank, honor, completed exercises in the last 7 days, and daily breakdown.",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_books",
        "description": "List your books on the platform (PDF and Markdown).",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
]


async def _dispatch(name: str, args: dict, user: User, db: Session) -> Any:
    if name == "get_context":
        return tool_get_context(user, db)
    if name == "get_exercises":
        return tool_get_exercises(args.get("difficulty"), args.get("tag"), db)
    if name == "get_exercise":
        return tool_get_exercise(args.get("slug", ""), db)
    if name == "submit_solution":
        return tool_submit_solution(
            args.get("slug", ""), args.get("code", ""),
            args.get("passed", False), args.get("test_results", []),
            user, db,
        )
    if name == "get_progress":
        return tool_get_progress(user, db)
    if name == "get_books":
        return tool_get_books(user, db)
    return {"error": f"Unknown tool: {name}"}


# ── JSON-RPC helpers ──────────────────────────────────────────────────────────

def _ok(id_: Any, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": id_, "result": result}


def _err(id_: Any, code: int, msg: str) -> dict:
    return {"jsonrpc": "2.0", "id": id_, "error": {"code": code, "message": msg}}


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/mcp")
async def mcp_endpoint(request: Request):
    db: Session = SessionLocal()
    try:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        user = _auth(auth_header, db)
        if not user:
            return JSONResponse(
                _err(None, -32001, "Unauthorized — provide a valid personal access token"),
                status_code=401,
            )

        body = await request.json()
        messages = body if isinstance(body, list) else [body]
        responses = []

        for msg in messages:
            id_ = msg.get("id")
            method = msg.get("method", "")
            params = msg.get("params", {})

            if method == "initialize":
                responses.append(_ok(id_, {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "study-platform", "version": "1.0.0"},
                }))

            elif method in ("notifications/initialized", "notifications/cancelled"):
                continue  # notifications have no response

            elif method == "ping":
                responses.append(_ok(id_, {}))

            elif method == "tools/list":
                responses.append(_ok(id_, {"tools": TOOLS}))

            elif method == "tools/call":
                tool_name = params.get("name", "")
                tool_args = params.get("arguments", {})
                result = await _dispatch(tool_name, tool_args, user, db)
                responses.append(_ok(id_, {
                    "content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False, indent=2)}],
                }))

            elif id_ is not None:
                responses.append(_err(id_, -32601, f"Method not found: {method}"))

        if not responses:
            return Response(status_code=204)
        return JSONResponse(responses[0] if len(responses) == 1 else responses)

    finally:
        db.close()
