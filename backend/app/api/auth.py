"""Register, sign in, sign out, and the current user."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_token, current_user
from app.database.session import get_db
from app.models.entities import User
from app.schemas.api import AuthOut, LoginIn, RegisterIn, UserOut
from app.services import auth as svc
from app.services.account import DEFAULT_PREFERENCES
from app.utils.errors import AppError

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == body.email)):
        raise AppError("An account with this email already exists.", 409, "email_taken",
                       "Sign in instead, or use a different email address.")
    user = User(name=body.name, email=body.email, password_hash=svc.hash_password(body.password),
                preferences=dict(DEFAULT_PREFERENCES))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": svc.create_session(db, user), "user": user}


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    svc.check_login_allowed(body.email.strip().lower())
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if user is None or not user.password_hash or not svc.verify_password(body.password, user.password_hash):
        svc.record_login_failure(body.email.strip().lower())
        raise AppError("Email or password is incorrect.", 401, "invalid_credentials",
                       "Check the spelling of your email and try again.")
    svc.clear_login_failures(body.email.strip().lower())
    return {"token": svc.create_session(db, user), "user": user}


@router.post("/logout", status_code=204)
def logout(token: str = Depends(current_token), db: Session = Depends(get_db)):
    svc.revoke_token(db, token)
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
