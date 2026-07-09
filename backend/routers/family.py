from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import User, FamilyMember
from schemas import FamilyMemberCreate, FamilyMemberResponse
from auth_utils import get_current_user
from limiter import limiter

router = APIRouter(prefix="/api/family", tags=["family"])


@router.get("/members", response_model=list[FamilyMemberResponse])
def list_family(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    members = db.query(FamilyMember).filter(FamilyMember.user_id == user.id).all()
    result = []
    for m in members:
        relative = m.relative
        result.append(FamilyMemberResponse(
            id=m.id, relative_id=relative.id,
            name=relative.name, email=relative.email, avatar=relative.avatar or "",
        ))
    return result


@router.post("/members", response_model=FamilyMemberResponse)
@limiter.limit("10/hour")
def add_family_member(request: Request, body: FamilyMemberCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    relative = db.query(User).filter(User.email == body.email).first()
    if not relative:
        raise HTTPException(status_code=404, detail="User with this email not found")
    if relative.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    existing = db.query(FamilyMember).filter(
        FamilyMember.user_id == user.id,
        FamilyMember.relative_id == relative.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in family")
    member = FamilyMember(user_id=user.id, relative_id=relative.id)
    db.add(member)
    db.commit()
    db.refresh(member)
    return FamilyMemberResponse(
        id=member.id, relative_id=relative.id,
        name=relative.name, email=relative.email, avatar=relative.avatar or "",
    )


@router.delete("/members/{member_id}")
def delete_family_member(member_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(FamilyMember).filter(FamilyMember.id == member_id, FamilyMember.user_id == user.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
    db.delete(member)
    db.commit()
    return {"ok": True}
