from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Memory, Photo, Video, Place
from schemas import MemoryResponse
from routers.common import media_url


def _build_media_and_photos_videos(memory_id: int, db: Session):
    photos = db.query(Photo).filter(Photo.memory_id == memory_id).all()
    videos = db.query(Video).filter(Video.memory_id == memory_id).all()
    media = [media_url(p.file_path) for p in photos if media_url(p.file_path)] + [media_url(v.file_path) for v in videos if media_url(v.file_path)]
    return media, photos, videos


def build_memory_response(memory: Memory, db: Session) -> MemoryResponse:
    place = memory.place
    media, photos, videos = _build_media_and_photos_videos(memory.id, db)
    return MemoryResponse(
        id=memory.id, title=memory.title, text=memory.text,
        date=memory.date, category=memory.category,
        visibility=memory.visibility or "private",
        status=memory.status or "approved",
        placeId=memory.place_id,
        placeName=place.name if place else "",
        placeRegion=place.region if place else "",
        media=media,
        photos=[{"url": media_url(p.file_path)} for p in photos if media_url(p.file_path)],
        videos=[{"url": media_url(v.file_path)} for v in videos if media_url(v.file_path)],
    )


def build_memory_response_with_place(memory: Memory, place: Place, media, photos, videos) -> MemoryResponse:
    return MemoryResponse(
        id=memory.id, title=memory.title, text=memory.text,
        date=memory.date, category=memory.category,
        visibility=memory.visibility or "private",
        status=memory.status or "approved",
        placeId=memory.place_id,
        placeName=place.name if place else "",
        placeRegion=place.region if place else "",
        media=media,
        photos=[{"url": media_url(p.file_path)} for p in photos if media_url(p.file_path)],
        videos=[{"url": media_url(v.file_path)} for v in videos if media_url(v.file_path)],
    )


def batch_load_media(memory_ids: list[int], db: Session):
    all_photos = db.query(Photo).filter(Photo.memory_id.in_(memory_ids)).all()
    all_videos = db.query(Video).filter(Video.memory_id.in_(memory_ids)).all()
    photos_by_memory = {}
    videos_by_memory = {}
    for p in all_photos:
        photos_by_memory.setdefault(p.memory_id, []).append(p)
    for v in all_videos:
        videos_by_memory.setdefault(v.memory_id, []).append(v)
    return photos_by_memory, videos_by_memory


def build_memory_response_from_batch(memory: Memory, photos, videos) -> MemoryResponse:
    place = memory.place
    mp = photos or []
    mv = videos or []
    media = [media_url(p.file_path) for p in mp if media_url(p.file_path)] + [media_url(v.file_path) for v in mv if media_url(v.file_path)]
    return MemoryResponse(
        id=memory.id, title=memory.title, text=memory.text,
        date=memory.date, category=memory.category,
        visibility=memory.visibility or "private",
        status=memory.status or "approved",
        placeId=memory.place_id,
        placeName=place.name if place else "",
        placeRegion=place.region if place else "",
        media=media,
        photos=[{"url": media_url(p.file_path)} for p in mp if media_url(p.file_path)],
        videos=[{"url": media_url(v.file_path)} for v in mv if media_url(v.file_path)],
    )