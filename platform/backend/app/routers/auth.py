import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_EMAILS = os.getenv("ALLOWED_EMAILS", "zion.hub.plataform@gmail.com").split(",")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


class GoogleLoginBody(BaseModel):
    credential: str


class DevLoginBody(BaseModel):
    dev_key: str = "dev"


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: str | None
    honor: int

    class Config:
        from_attributes = True


def _upsert_user(db: Session, google_id: str, email: str, name: str, avatar_url: str | None) -> User:
    user = db.query(User).filter(User.id == google_id).first()
    if user:
        user.last_login = datetime.utcnow()
        user.name = name
        user.avatar_url = avatar_url
    else:
        user = User(id=google_id, email=email, name=name, avatar_url=avatar_url)
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/google", response_model=UserOut)
def google_login(body: GoogleLoginBody, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth não configurado. Use /auth/dev em desenvolvimento.")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        info = id_token.verify_oauth2_token(body.credential, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {e}")

    email = info.get("email", "")
    if ALLOWED_EMAILS and email not in ALLOWED_EMAILS:
        raise HTTPException(status_code=403, detail="Email não autorizado.")

    return _upsert_user(db, info["sub"], email, info.get("name", ""), info.get("picture"))


@router.post("/dev", response_model=UserOut)
def dev_login(db: Session = Depends(get_db)):
    if os.getenv("ENV", "development") == "production":
        raise HTTPException(status_code=404)
    return _upsert_user(
        db,
        google_id="dev-user-joao",
        email="zion.hub.plataform@gmail.com",
        name="João Gabie",
        avatar_url=None,
    )


@router.get("/me", response_model=UserOut)
def get_me(db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="Nenhum usuário encontrado. Faça login primeiro.")
    return user
