"""Request authentication: the bearer token in the Authorization header identifies the user."""
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import User
from app.services import auth as auth_service
from app.utils.errors import AppError


def bearer_token(request: Request) -> str | None:
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    token = token.strip()
    return token if scheme.lower() == "bearer" and token else None


def current_token(request: Request) -> str:
    token = bearer_token(request)
    if token is None:
        raise AppError("Please sign in to continue.", 401, "not_authenticated")
    return token


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user = auth_service.user_for_token(db, current_token(request))
    if user is None:
        raise AppError("Your session has ended. Please sign in again.", 401, "session_expired")
    return user
