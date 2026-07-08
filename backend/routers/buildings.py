from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Building, Street, User
from schemas import BuildingCreate, BuildingResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/buildings", tags=["buildings"])


@router.get("", response_model=list[BuildingResponse])
def list_buildings(
    street_id: int,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Building).filter(
        Building.street_id == street_id,
        Building.user_id == user.id,
    )
    if q:
        query = query.filter(Building.number.ilike(f"%{q}%"))
    return query.order_by(Building.number).all()


@router.post("", response_model=BuildingResponse)
def create_building(body: BuildingCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    street = db.query(Street).filter(Street.id == body.street_id, Street.user_id == user.id).first()
    if not street:
        raise HTTPException(status_code=404, detail="Street not found")
    building = Building(
        number=body.number, lat=body.lat, lng=body.lng,
        street_id=body.street_id, user_id=user.id,
    )
    db.add(building)
    db.commit()
    db.refresh(building)
    return building
