import os
import shutil
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Place, Memory, Photo, Video, Neighbor, User, Locality, Street, Building, Apartment
from schemas import PlaceCreate, PlaceResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/places", tags=["places"])


def _enrich_place(p: Place, db: Session) -> PlaceResponse:
    photos_count = db.query(func.count(Photo.id)).filter(Photo.place_id == p.id).scalar()
    videos_count = db.query(func.count(Video.id)).filter(Video.place_id == p.id).scalar()
    neighbors_count = db.query(func.count(Neighbor.id)).filter(Neighbor.place_id == p.id).scalar()
    memories_count = db.query(func.count(Memory.id)).filter(Memory.place_id == p.id).scalar()

    locality_name = ""
    street_name = ""
    building_number = ""
    apartment_number = ""
    if p.locality_id:
        loc = db.query(Locality).filter(Locality.id == p.locality_id).first()
        if loc: locality_name = loc.name
    if p.street_id:
        s = db.query(Street).filter(Street.id == p.street_id).first()
        if s: street_name = s.name
    if p.building_id:
        b = db.query(Building).filter(Building.id == p.building_id).first()
        if b: building_number = b.number
    if p.apartment_id:
        a = db.query(Apartment).filter(Apartment.id == p.apartment_id).first()
        if a: apartment_number = a.number

    return PlaceResponse(
        id=p.id, name=p.name, type=p.type,
        lat=p.lat, lng=p.lng, region=p.region,
        period=p.period or "", visibility=p.visibility or "private",
        locality_id=p.locality_id, street_id=p.street_id,
        building_id=p.building_id, apartment_id=p.apartment_id,
        locality_name=locality_name, street_name=street_name,
        building_number=building_number, apartment_number=apartment_number,
        photos=photos_count, videos=videos_count,
        neighbors=neighbors_count, memories=memories_count,
    )


@router.get("", response_model=list[PlaceResponse])
def list_places(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    places = db.query(Place).filter(Place.user_id == user.id).order_by(Place.id).all()
    return [_enrich_place(p, db) for p in places]


@router.post("", response_model=PlaceResponse)
def create_place(body: PlaceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = Place(
        name=body.name, type=body.type,
        lat=body.lat, lng=body.lng, region=body.region,
        period=body.period, visibility=body.visibility,
        locality_id=body.locality_id, street_id=body.street_id,
        building_id=body.building_id, apartment_id=body.apartment_id,
        user_id=user.id,
    )
    db.add(place)
    db.commit()
    db.refresh(place)
    return _enrich_place(place, db)


@router.delete("/{place_id}")
def delete_place(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = db.query(Place).filter(Place.id == place_id, Place.user_id == user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    db.query(Neighbor).filter(Neighbor.place_id == place.id).delete()

    for m in place.memories:
        for p in m.photos:
            if p.file_path and os.path.exists(p.file_path): os.remove(p.file_path)
        for v in m.videos:
            if v.file_path and os.path.exists(v.file_path): os.remove(v.file_path)
    for p in place.photos:
        if p.file_path and os.path.exists(p.file_path): os.remove(p.file_path)
    for v in place.videos:
        if v.file_path and os.path.exists(v.file_path): os.remove(v.file_path)

    db.delete(place)
    db.commit()
    return {"ok": True}


@router.get("/{place_id}", response_model=PlaceResponse)
def get_place(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = db.query(Place).filter(Place.id == place_id, Place.user_id == user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    return _enrich_place(place, db)


@router.get("/{place_id}/photos")
def list_place_photos(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = db.query(Place).filter(Place.id == place_id, Place.user_id == user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    photos = db.query(Photo).filter(Photo.place_id == place.id).all()
    return [
        {"id": p.id, "url": f"/uploads/{os.path.basename(p.file_path)}"}
        for p in photos if p.file_path
    ]


@router.get("/{place_id}/videos")
def list_place_videos(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = db.query(Place).filter(Place.id == place_id, Place.user_id == user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    videos = db.query(Video).filter(Video.place_id == place.id).all()
    return [
        {"id": v.id, "url": f"/uploads/{os.path.basename(v.file_path)}"}
        for v in videos if v.file_path
    ]
