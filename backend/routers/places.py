from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Place, Memory, Photo, Neighbor, User
from schemas import PlaceCreate, PlaceResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/places", tags=["places"])


@router.get("", response_model=list[PlaceResponse])
def list_places(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    places = db.query(Place).filter(Place.user_id == user.id).order_by(Place.id).all()
    result = []
    for p in places:
        photos_count = db.query(func.count(Photo.id)).filter(Photo.place_id == p.id).scalar()
        neighbors_count = db.query(func.count(Neighbor.id)).filter(Neighbor.place_id == p.id).scalar()
        memories_count = db.query(func.count(Memory.id)).filter(Memory.place_id == p.id).scalar()
        result.append(PlaceResponse(
            id=p.id, name=p.name, type=p.type,
            lat=p.lat, lng=p.lng, region=p.region,
            photos=photos_count, videos=0,
            neighbors=neighbors_count, memories=memories_count,
        ))
    return result


@router.post("", response_model=PlaceResponse)
def create_place(body: PlaceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = Place(
        name=body.name, type=body.type,
        lat=body.lat, lng=body.lng, region=body.region,
        user_id=user.id,
    )
    db.add(place)
    db.commit()
    db.refresh(place)
    return PlaceResponse(
        id=place.id, name=place.name, type=place.type,
        lat=place.lat, lng=place.lng, region=place.region,
        photos=0, videos=0, neighbors=0, memories=0,
    )


@router.get("/{place_id}", response_model=PlaceResponse)
def get_place(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = db.query(Place).filter(Place.id == place_id, Place.user_id == user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    photos_count = db.query(func.count(Photo.id)).filter(Photo.place_id == place.id).scalar()
    neighbors_count = db.query(func.count(Neighbor.id)).filter(Neighbor.place_id == place.id).scalar()
    memories_count = db.query(func.count(Memory.id)).filter(Memory.place_id == place.id).scalar()
    return PlaceResponse(
        id=place.id, name=place.name, type=place.type,
        lat=place.lat, lng=place.lng, region=place.region,
        photos=photos_count, videos=0,
        neighbors=neighbors_count, memories=memories_count,
    )
