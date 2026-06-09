"""
CodeWars sync — reads JohnGabie's public profile.
No auth required. Returns completed kata filtered by Python.

Usage:
    python agent/codewars_sync.py              # prints summary
    python agent/codewars_sync.py --json       # prints full JSON
"""

import sys
import json
import urllib.request
import urllib.error

CODEWARS_USER = "JohnGabie"
BASE_URL = f"https://www.codewars.com/api/v1/users/{CODEWARS_USER}"


def fetch_completed(max_pages: int = 5) -> list[dict]:
    """Fetch all completed kata, paginated."""
    completed = []
    for page in range(max_pages):
        url = f"{BASE_URL}/code-challenges/completed?page={page}"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read())
        except urllib.error.URLError as e:
            print(f"[codewars] fetch error page {page}: {e}", file=sys.stderr)
            break

        items = data.get("data", [])
        if not items:
            break
        completed.extend(items)

        total_pages = data.get("totalPages", 1)
        if page + 1 >= total_pages:
            break

    return completed


def fetch_profile() -> dict:
    """Fetch user profile (honor, rank, leaderboard position)."""
    try:
        with urllib.request.urlopen(BASE_URL, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.URLError as e:
        print(f"[codewars] profile fetch error: {e}", file=sys.stderr)
        return {}


def get_python_kata(completed: list[dict]) -> list[dict]:
    return [k for k in completed if "python" in [l.lower() for l in k.get("completedLanguages", [])]]


def summarize(profile: dict, completed: list[dict]) -> dict:
    python_kata = get_python_kata(completed)
    return {
        "user": CODEWARS_USER,
        "honor": profile.get("honor", 0),
        "ranks": profile.get("ranks", {}),
        "total_completed": len(completed),
        "python_completed": len(python_kata),
        "python_kata": [
            {
                "id": k["id"],
                "name": k["name"],
                "slug": k.get("slug", ""),
                "completed_at": k.get("completedAt", ""),
            }
            for k in python_kata
        ],
    }


if __name__ == "__main__":
    print("[codewars] fetching profile...", file=sys.stderr)
    profile = fetch_profile()
    print("[codewars] fetching completed kata...", file=sys.stderr)
    completed = fetch_completed()
    result = summarize(profile, completed)

    if "--json" in sys.argv:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"User       : {result['user']}")
        print(f"Honor      : {result['honor']}")
        print(f"Total kata : {result['total_completed']}")
        print(f"Python kata: {result['python_completed']}")
        if result["python_kata"]:
            print("\nRecent Python completions:")
            for k in result["python_kata"][:10]:
                print(f"  - {k['name']}")
