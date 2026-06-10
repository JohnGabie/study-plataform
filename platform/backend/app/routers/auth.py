import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import SECRET_KEY, ALGORITHM, get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_EMAILS = [e.strip() for e in os.getenv("ALLOWED_EMAILS", "").split(",") if e.strip()]
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
TOKEN_EXPIRE_DAYS = 30


class GoogleLoginBody(BaseModel):
    credential: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: str | None
    honor: int

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    token: str
    user: UserOut


def _make_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


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


@router.post("/google", response_model=LoginResponse)
def google_login(body: GoogleLoginBody, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth não configurado.")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        info = id_token.verify_oauth2_token(body.credential, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {e}")

    email = info.get("email", "")
    if ALLOWED_EMAILS and email not in ALLOWED_EMAILS:
        raise HTTPException(status_code=403, detail="Email não autorizado.")

    user = _upsert_user(db, info["sub"], email, info.get("name", ""), info.get("picture"))
    return LoginResponse(token=_make_token(user.id), user=UserOut.model_validate(user))


@router.post("/dev", response_model=LoginResponse)
def dev_login(db: Session = Depends(get_db)):
    if os.getenv("ENV", "development") == "production":
        raise HTTPException(status_code=404)
    user = _upsert_user(
        db,
        google_id="dev-user-joao",
        email="zion.hub.plataform@gmail.com",
        name="João Gabie",
        avatar_url=None,
    )
    return LoginResponse(token=_make_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
