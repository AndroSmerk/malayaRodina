import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import Place, Photo, Video, Neighbor, User
from schemas import PlaceCreate, PlaceResponse
from auth_utils import get_current_user
from routers.common import enrich_places, enrich_place, paginate, PaginatedResponse, media_url
from limiter import limiter
from services.ownership import get_owned_or_404
from services.media_service import delete_media_files

router = APIRouter(prefix="/api/places", tags=["places"])


@router.get("", response_model=PaginatedResponse[PlaceResponse])
def list_places(offset: int = 0, limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Place).filter(Place.user_id == user.id).order_by(Place.id)
    items, total = paginate(query, offset, limit)
    return PaginatedResponse(items=enrich_places(items, db), total=total, offset=offset, limit=limit)


@router.post("", response_model=PlaceResponse)
@limiter.limit("30/hour")
def create_place(request: Request, body: PlaceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
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
    return enrich_place(place, db)


@router.delete("/{place_id}")
def delete_place(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = get_owned_or_404(db, Place, place_id, user)

    file_paths = []
    for m in place.memories:
        for p in m.photos:
            if p.file_path: file_paths.append(p.file_path)
        for v in m.videos:
            if v.file_path: file_paths.append(v.file_path)
    for p in place.photos:
        if p.file_path: file_paths.append(p.file_path)
    for v in place.videos:
        if v.file_path: file_paths.append(v.file_path)

    db.query(Neighbor).filter(Neighbor.place_id == place.id).delete()
    db.delete(place)
    db.commit()
    delete_media_files(file_paths)
    return {"ok": True}


@router.get("/{place_id}", response_model=PlaceResponse)
def get_place(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = get_owned_or_404(db, Place, place_id, user)
    return enrich_place(place, db)


@router.get("/{place_id}/photos")
def list_place_photos(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = get_owned_or_404(db, Place, place_id, user)
    photos = db.query(Photo).filter(Photo.place_id == place.id).all()
    return [
        {"id": p.id, "url": media_url(p.file_path)}
        for p in photos if p.file_path
    ]


@router.get("/{place_id}/videos")
def list_place_videos(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = get_owned_or_404(db, Place, place_id, user)
    videos = db.query(Video).filter(Video.place_id == place.id).all()
    return [
        {"id": v.id, "url": media_url(v.file_path)}
        for v in videos if v.file_path
    ]
