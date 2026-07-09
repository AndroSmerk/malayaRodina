from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Place, Memory, Photo, Video, User, FamilyMember
from schemas import PlaceResponse, MemoryResponse
from auth_utils import get_optional_user
from routers.common import enrich_places, enrich_place, media_url, can_access_place, can_access_memory, paginate, PaginatedResponse

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/places", response_model=PaginatedResponse[PlaceResponse])
def list_public_places(offset: int = 0, limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_optional_user)):
    if user:
        query = db.query(Place).filter(
            (Place.visibility == "public") |
            ((Place.visibility == "family") & Place.user_id.in_(
                db.query(FamilyMember.relative_id).filter(FamilyMember.user_id == user.id)
            ))
        )
    else:
        query = db.query(Place).filter(Place.visibility == "public")
    query = query.order_by(Place.id)
    items, total = paginate(query, offset, limit)
    return PaginatedResponse(items=enrich_places(items, db, public_only=user is None), total=total, offset=offset, limit=limit)


@router.get("/places/{place_id}", response_model=PlaceResponse)
def get_public_place(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_optional_user)):
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place or not can_access_place(user, place, db):
        raise HTTPException(status_code=404, detail="Place not found")
    return enrich_place(place, db, public_only=not user or place.visibility != "public")


@router.get("/memories", response_model=PaginatedResponse[MemoryResponse])
def list_public_memories(place_id: int = None, offset: int = 0, limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_optional_user)):
    query = db.query(Memory).filter(Memory.status == "approved")
    if place_id:
        query = query.filter(Memory.place_id == place_id)
    query = query.order_by(Memory.created_at.desc())
    items, total = paginate(query, offset, limit)
    memories = [m for m in items if can_access_memory(user, m, db)]

    if not memories:
        return PaginatedResponse(items=[], total=0, offset=offset, limit=limit)

    mids = [m.id for m in memories]

    all_photos = db.query(Photo).filter(Photo.memory_id.in_(mids)).all()
    all_videos = db.query(Video).filter(Video.memory_id.in_(mids)).all()

    photos_by_memory = {}
    videos_by_memory = {}
    for p in all_photos:
        photos_by_memory.setdefault(p.memory_id, []).append(p)
    for v in all_videos:
        videos_by_memory.setdefault(v.memory_id, []).append(v)

    result = []
    for m in memories:
        place = m.place
        mp = photos_by_memory.get(m.id, [])
        mv = videos_by_memory.get(m.id, [])
        media = [media_url(p.file_path) for p in mp if media_url(p.file_path)] + [media_url(v.file_path) for v in mv if media_url(v.file_path)]
        result.append(MemoryResponse(
            id=m.id, title=m.title, text=m.text,
            date=m.date, category=m.category, visibility=m.visibility or "private",
            placeId=m.place_id,
            status=m.status or "approved",
            placeName=place.name if place else "",
            placeRegion=place.region if place else "",
            media=media,
            photos=[{"url": media_url(p.file_path)} for p in mp if media_url(p.file_path)],
            videos=[{"url": media_url(v.file_path)} for v in mv if media_url(v.file_path)],
        ))
    return PaginatedResponse(items=result, total=total, offset=offset, limit=limit)
