from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserRegister, UserLogin, TokenResponse
from auth_utils import hash_password, verify_password, create_token, get_current_user
from limiter import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_token_cookie(response: Response, token: str):
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        samesite="strict",
        path="/",
        max_age=30 * 24 * 3600,
    )


@router.post("/register", response_model=TokenResponse)
@limiter.limit("5/hour")
def register(request: Request, body: UserRegister, db: Session = Depends(get_db), response: Response = None):
    if len(body.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id)
    _set_token_cookie(response, token)
    return TokenResponse(
        token=token,
        user={"id": user.id, "name": user.name, "email": user.email, "is_moderator": bool(user.is_moderator)},
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: UserLogin, db: Session = Depends(get_db), response: Response = None):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_token(user.id)
    _set_token_cookie(response, token)
    return TokenResponse(
        token=token,
        user={"id": user.id, "name": user.name, "email": user.email, "is_moderator": bool(user.is_moderator)},
    )


@router.get("/me")
def me(request: Request, user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_moderator": bool(user.is_moderator),
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("token", path="/")
    return {"ok": True}
