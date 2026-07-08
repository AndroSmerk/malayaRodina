from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Place, Memory, Neighbor, Photo, Video, User, Locality, Street, Building, Apartment
from schemas import PlaceResponse, MemoryResponse
from auth_utils import get_optional_user

router = APIRouter(prefix="/api/public", tags=["public"])


def _enrich_place(p: Place, db: Session) -> PlaceResponse:
    photos_count = db.query(func.count(Photo.id)).filter(Photo.place_id == p.id).scalar()
    videos_count = db.query(func.count(Video.id)).filter(Video.place_id == p.id).scalar()
    neighbors_count = db.query(func.count(Neighbor.id)).filter(Neighbor.place_id == p.id).scalar()
    memories_count = db.query(func.count(Memory.id)).filter(Memory.place_id == p.id, Memory.visibility == "public").scalar()

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


@router.get("/places", response_model=list[PlaceResponse])
def list_public_places(db: Session = Depends(get_db)):
    places = db.query(Place).filter(Place.visibility == "public").order_by(Place.id).all()
    return [_enrich_place(p, db) for p in places]


@router.get("/places/{place_id}", response_model=PlaceResponse)
def get_public_place(place_id: int, db: Session = Depends(get_db), user=Depends(get_optional_user)):
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    if place.visibility != "public":
        if not user or (place.user_id != user.id):
            raise HTTPException(status_code=404, detail="Place not found")
    return _enrich_place(place, db)


@router.get("/memories", response_model=list[MemoryResponse])
def list_public_memories(place_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Memory).filter(Memory.visibility == "public", Memory.status == "approved")
    if place_id:
        query = query.filter(Memory.place_id == place_id)
    memories = query.order_by(Memory.created_at.desc()).all()
    result = []
    for m in memories:
        place = m.place
        photos = db.query(Photo).filter(Photo.memory_id == m.id).all()
        videos = db.query(Video).filter(Video.memory_id == m.id).all()
        media = [f"/uploads/{p.file_path.split('/')[-1]}" for p in photos if p.file_path] + [f"/uploads/{v.file_path.split('/')[-1]}" for v in videos if v.file_path]
        result.append(MemoryResponse(
            id=m.id, title=m.title, text=m.text,
            date=m.date, category=m.category, visibility=m.visibility or "private",
            placeId=m.place_id,
            status=m.status or "approved",
            placeName=place.name if place else "",
            placeRegion=place.region if place else "",
            media=media,
            photos=[{"url": f"/uploads/{p.file_path.split('/')[-1]}"} for p in photos if p.file_path],
            videos=[{"url": f"/uploads/{v.file_path.split('/')[-1]}"} for v in videos if v.file_path],
        ))
    return result
