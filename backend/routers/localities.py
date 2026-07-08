from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Locality, User
from schemas import LocalityCreate, LocalityResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/localities", tags=["localities"])


@router.get("", response_model=list[LocalityResponse])
def list_localities(
    q: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Locality).filter(Locality.user_id == user.id)
    if q:
        query = query.filter(Locality.name.ilike(f"%{q}%"))
    if region:
        query = query.filter(Locality.region.ilike(f"%{region}%"))
    return query.order_by(Locality.name).all()


@router.post("", response_model=LocalityResponse)
def create_locality(body: LocalityCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    locality = Locality(
        name=body.name, type=body.type,
        lat=body.lat, lng=body.lng, region=body.region,
        user_id=user.id,
    )
    db.add(locality)
    db.commit()
    db.refresh(locality)
    return locality


@router.get("/{locality_id}", response_model=LocalityResponse)
def get_locality(locality_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    locality = db.query(Locality).filter(Locality.id == locality_id, Locality.user_id == user.id).first()
    if not locality:
        raise HTTPException(status_code=404, detail="Locality not found")
    return locality
