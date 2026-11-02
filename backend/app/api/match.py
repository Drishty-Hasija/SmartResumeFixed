from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.api.serializers import match_detail, match_summary
from app.database.session import get_db
from app.models.entities import JobMatch, Resume, User
from app.schemas.api import MatchCreate, MatchDetail, MatchSummary, MatchUpdate
from app.services import workflows

router = APIRouter(prefix="/api/match", tags=["match"])


@router.post("", response_model=MatchDetail, status_code=201)
def create_match(body: MatchCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Compare a stored resume with a stored job description (TF-IDF + cosine similarity + skills)."""
    return match_detail(workflows.create_match(db, user, body.resume_id, body.job_id))


@router.get("", response_model=list[MatchSummary])
def list_matches(resume_id: int | None = None, db: Session = Depends(get_db), user: User = Depends(current_user)):
    q = select(JobMatch).join(Resume).where(Resume.user_id == user.id).order_by(JobMatch.created_at.desc())
    if resume_id:
        q = q.where(JobMatch.resume_id == resume_id)
    return [match_summary(m) for m in db.scalars(q).all()]


@router.get("/{match_id}", response_model=MatchDetail)
def get_match(match_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return match_detail(workflows.get_match(db, user, match_id))


@router.patch("/{match_id}", response_model=MatchDetail)
def update_match(match_id: int, body: MatchUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Application tracking: change the status and keep private notes for this job."""
    match = workflows.get_match(db, user, match_id)
    if body.status is not None:
        match.status = body.status
    if body.notes is not None:
        match.notes = body.notes.strip()
    db.commit()
    return match_detail(match)


@router.delete("/{match_id}", status_code=204)
def delete_match(match_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.delete(workflows.get_match(db, user, match_id))
    db.commit()
    return Response(status_code=204)
