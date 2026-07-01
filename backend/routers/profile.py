from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User, Place, Memory, Photo, Video
from schemas import ProfileResponse, StatsResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=ProfileResponse)
def get_profile(user: User = Depends(get_current_user)):
    initials = "".join(w[0] for w in user.name.split() if w)[:2].upper()
    return ProfileResponse(
        name=user.name,
        email=user.email,
        bio=user.bio or "",
        initials=initials,
    )


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    places = db.query(func.count(Place.id)).filter(Place.user_id == user.id).scalar()
    memories = db.query(func.count(Memory.id)).filter(Memory.user_id == user.id).scalar()
    photos = db.query(func.count(Photo.id)).filter(
        Photo.memory_id.in_(
            db.query(Memory.id).filter(Memory.user_id == user.id)
        )
    ).scalar()
    videos = db.query(func.count(Video.id)).filter(
        Video.memory_id.in_(
            db.query(Memory.id).filter(Memory.user_id == user.id)
        )
    ).scalar()
    return StatsResponse(places=places, memories=memories, photos=photos, videos=videos)


@router.get("/memories")
def get_recent_memories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memories = (
        db.query(Memory)
        .filter(Memory.user_id == user.id)
        .order_by(Memory.created_at.desc())
        .limit(10)
        .all()
    )
    result = []
    for m in memories:
        excerpt = m.text[:80] + ("..." if len(m.text) > 80 else "")
        photos_count = db.query(func.count(Photo.id)).filter(Photo.memory_id == m.id).scalar()
        result.append({
            "id": m.id,
            "title": m.title,
            "place": m.place.name if m.place else "",
            "excerpt": excerpt,
            "date": m.date,
            "thumb": "📸" if photos_count else "📝",
        })
    return result
