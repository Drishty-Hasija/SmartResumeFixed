"""The signed-in user's own account: profile, password, preferences, deletion."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.database.session import get_db
from app.models.entities import User
from app.schemas.api import AccountDeleteIn, AuthOut, PasswordChangeIn, PreferencesIn, PreferencesOut, UserOut, UserUpdate
from app.services import account as account_svc
from app.services import auth as auth_svc
from app.utils.errors import AppError

router = APIRouter(prefix="/api/user", tags=["account"])


@router.get("", response_model=UserOut)
def get_profile(user: User = Depends(current_user)):
    return user


@router.put("", response_model=UserOut)
def update_profile(body: UserUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    taken = db.scalar(select(User).where(User.email == body.email, User.id != user.id))
    if taken:
        raise AppError("That email address is already used by another account.", 409, "email_taken")
    user.name, user.email = body.name, body.email
    db.commit()
    return user


@router.put("/password", response_model=AuthOut)
def change_password(body: PasswordChangeIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not auth_svc.verify_password(body.current_password, user.password_hash or ""):
        raise AppError("Your current password is incorrect.", 403, "wrong_password")
    if body.current_password == body.new_password:
        raise AppError("Choose a password that is different from your current one.", 422, "same_password")
    user.password_hash = auth_svc.hash_password(body.new_password)
    db.commit()
    auth_svc.revoke_all_sessions(db, user)  # sign out every other device
    return {"token": auth_svc.create_session(db, user), "user": user}


@router.get("/preferences", response_model=PreferencesOut)
def get_preferences(user: User = Depends(current_user)):
    return account_svc.preferences_of(user)


@router.put("/preferences", response_model=PreferencesOut)
def update_preferences(body: PreferencesIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    changes = body.model_dump(exclude_none=True)
    user.preferences = {**account_svc.preferences_of(user), **changes}
    db.commit()
    return account_svc.preferences_of(user)


@router.delete("", status_code=204)
def delete_account(body: AccountDeleteIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not auth_svc.verify_password(body.password, user.password_hash or ""):
        raise AppError("Your password is incorrect, so the account was not deleted.", 403, "wrong_password")
    account_svc.delete_account(db, user)
    return Response(status_code=204)
