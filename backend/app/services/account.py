"""Account-level operations shared by the auth and account routes."""
from sqlalchemy.orm import Session

from app.models.entities import User
from app.services import workflows

DEFAULT_PREFERENCES = {"theme": "system", "font": "inter", "text_size": "md", "reduce_motion": False}


def preferences_of(user: User) -> dict:
    return {**DEFAULT_PREFERENCES, **(user.preferences or {})}


def delete_account(db: Session, user: User) -> None:
    """Remove the user, their sessions, and every stored file they uploaded."""
    for resume in list(user.resumes):
        workflows.delete_resume(db, resume)
    db.delete(user)
    db.commit()
