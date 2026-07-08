from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Street, Locality, User
from schemas import StreetCreate, StreetResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/streets", tags=["streets"])


@router.get("", response_model=list[StreetResponse])
def list_streets(
    locality_id: int,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Street).filter(
        Street.locality_id == locality_id,
        Street.user_id == user.id,
    )
    if q:
        query = query.filter(Street.name.ilike(f"%{q}%"))
    return query.order_by(Street.name).all()


@router.post("", response_model=StreetResponse)
def create_street(body: StreetCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    locality = db.query(Locality).filter(Locality.id == body.locality_id, Locality.user_id == user.id).first()
    if not locality:
        raise HTTPException(status_code=404, detail="Locality not found")
    street = Street(name=body.name, locality_id=body.locality_id, user_id=user.id)
    db.add(street)
    db.commit()
    db.refresh(street)
    return street
