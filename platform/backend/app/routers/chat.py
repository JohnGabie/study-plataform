"""
Chat endpoint — OpenAI-compatible API, any provider.
Tools are the same ones exposed by the MCP server (same _dispatch, same TOOLS).
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.routers.mcp_server import TOOLS, _dispatch

router = APIRouter(prefix="/chat", tags=["chat"])

# ── MCP → OpenAI tool format ──────────────────────────────────────────────────

OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": t["name"],
            "description": t["description"],
            "parameters": t["inputSchema"],
        },
    }
    for t in TOOLS
]

# ── Schema ────────────────────────────────────────────────────────────────────

class Msg(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[Msg] = []
    api_key: str
    base_url: str = "https://openrouter.ai/api/v1"
    model: str = "anthropic/claude-opus-4-5"

# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("")
async def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.api_key.strip():
        raise HTTPException(status_code=422, detail="api_key required")

    try:
        from openai import OpenAI
        client = OpenAI(api_key=body.api_key, base_url=body.base_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to init client: {e}")

    system = (
        f"You are a backend learning assistant for {user.name}. "
        "The user is learning Python, FastAPI, SQL, and HTTP on a study platform. "
        "You have tools to access their exercises, progress, and books. "
        "Keep answers concise and practical. Answer in Portuguese unless the user writes in English. "
        "Call get_context() at the start of each new conversation to read the user's current state."
    )

    messages: list = [{"role": "system", "content": system}]
    messages += [{"role": m.role, "content": m.content} for m in body.history]
    messages.append({"role": "user", "content": body.message})

    # Agentic tool loop — max 8 rounds to avoid infinite loops
    for _ in range(8):
        try:
            resp = client.chat.completions.create(
                model=body.model,
                messages=messages,
                tools=OPENAI_TOOLS,
                tool_choice="auto",
                max_tokens=2048,
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

        choice = resp.choices[0]

        if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            # Append assistant message with tool_calls
            messages.append(choice.message)

            for tc in choice.message.tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = await _dispatch(tc.function.name, args, user, db)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })
        else:
            text = choice.message.content or ""
            return {"response": text}

    raise HTTPException(status_code=500, detail="tool_call loop exceeded")
