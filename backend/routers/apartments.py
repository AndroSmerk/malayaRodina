from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Apartment, Building, User
from schemas import ApartmentCreate, ApartmentResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/apartments", tags=["apartments"])


@router.get("", response_model=list[ApartmentResponse])
def list_apartments(
    building_id: int,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Apartment).filter(
        Apartment.building_id == building_id,
        Apartment.user_id == user.id,
    )
    if q:
        query = query.filter(Apartment.number.ilike(f"%{q}%"))
    return query.order_by(Apartment.number).all()


@router.post("", response_model=ApartmentResponse)
def create_apartment(body: ApartmentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    building = db.query(Building).filter(Building.id == body.building_id, Building.user_id == user.id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    apartment = Apartment(number=body.number, building_id=body.building_id, user_id=user.id)
    db.add(apartment)
    db.commit()
    db.refresh(apartment)
    return apartment
