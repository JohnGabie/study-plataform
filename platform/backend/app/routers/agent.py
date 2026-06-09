import json
import os
from fastapi import APIRouter
from typing import Optional

router = APIRouter(prefix="/agent", tags=["agent"])

INSIGHT_PATH = os.path.join(os.path.dirname(__file__), "../../../../agent/last_insight.json")
INSIGHTS_DIR = os.path.join(os.path.dirname(__file__), "../../../../agent/insights")


@router.get("/insight")
def get_insight() -> Optional[dict]:
    try:
        with open(INSIGHT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


@router.get("/insights")
def get_insights() -> list:
    insights = []
    if os.path.isdir(INSIGHTS_DIR):
        for fname in sorted(os.listdir(INSIGHTS_DIR), reverse=True):
            if fname.endswith(".json"):
                try:
                    with open(os.path.join(INSIGHTS_DIR, fname), "r", encoding="utf-8") as f:
                        insights.append(json.load(f))
                except (json.JSONDecodeError, OSError):
                    pass
    if not insights:
        single = get_insight()
        if single:
            insights = [single]
    return insights
