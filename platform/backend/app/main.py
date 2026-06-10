from dotenv import load_dotenv
load_dotenv()

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.database import engine, Base, SessionLocal, run_migrations
import app.models  # noqa: F401

# Create upload dirs before StaticFiles is mounted (it checks for existence)
os.makedirs("app/uploads/books", exist_ok=True)
os.makedirs("app/uploads/covers", exist_ok=True)
os.makedirs("app/uploads/texts", exist_ok=True)
os.makedirs("app/uploads/book-imgs", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    db = SessionLocal()
    try:
        from app.services.exercise_loader import load_exercises_from_dir
        result = load_exercises_from_dir("app/exercises/generated", db)
        print(f"[startup] exercícios: {result}")
    finally:
        db.close()
    yield


app = FastAPI(title="Study Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "https://pc-win11.tail28966a.ts.net"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import exercises, submissions, progress, auth, users, analytics, agent, books, tokens, mcp_server, chat  # noqa: E402

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(exercises.router)
app.include_router(submissions.router)
app.include_router(progress.router)
app.include_router(analytics.router)
app.include_router(agent.router)
app.include_router(books.router)
app.include_router(tokens.router)
app.include_router(mcp_server.router)
app.include_router(chat.router)

app.mount("/covers", StaticFiles(directory="app/uploads/covers"), name="covers")
app.mount("/book-imgs", StaticFiles(directory="app/uploads/book-imgs"), name="book-imgs")


@app.get("/")
def root():
    return {"status": "ok", "api": "Study Platform"}
