import json
import os
from sqlalchemy.orm import Session
from app.models.exercise import Exercise, TestCase


def load_exercises_from_dir(base_dir: str, db: Session) -> dict:
    loaded = 0
    skipped = 0

    for root, _, files in os.walk(base_dir):
        for filename in sorted(files):
            if not filename.endswith(".json"):
                continue

            filepath = os.path.join(root, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)

                slug = data.get("slug")
                if not slug:
                    continue

                existing = db.query(Exercise).filter(Exercise.slug == slug).first()
                if existing:
                    if not existing.concepts and data.get("concepts"):
                        existing.concepts = data["concepts"]
                        db.commit()
                    skipped += 1
                    continue

                exercise = Exercise(
                    id=data.get("id"),
                    title=data["title"],
                    slug=slug,
                    difficulty=data["difficulty"],
                    phase=data["phase"],
                    module=data["module"],
                    tags=data.get("tags", []),
                    concepts=data.get("concepts", []),
                    description=data["description"],
                    rationale=data["rationale"],
                    stub=data["stub"],
                    solution=data["solution"],
                    hints=data.get("hints", []),
                    generated_by=data.get("generated_by", "seed"),
                    book_reference=data.get("book_reference"),
                )
                db.add(exercise)
                db.flush()

                for i, tc in enumerate(data.get("test_cases", [])):
                    test_case = TestCase(
                        exercise_id=exercise.id,
                        order=i,
                        description=tc["description"],
                        input=tc["input"],
                        expected=tc["expected"],
                        visible=tc.get("visible", True),
                    )
                    db.add(test_case)

                loaded += 1

            except Exception as e:
                print(f"[loader] erro em {filepath}: {e}")

    db.commit()
    return {"loaded": loaded, "skipped": skipped}
