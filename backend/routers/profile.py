import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from PIL import Image

from database import get_db
from models import User, Place, Memory, Photo, Video
from schemas import ProfileResponse, StatsResponse, ProfileUpdate
from auth_utils import get_current_user
from limiter import limiter
from routers.common import media_url

AVATAR_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=ProfileResponse)
def get_profile(user: User = Depends(get_current_user)):
    initials = "".join(w[0] for w in user.name.split() if w)[:2].upper()
    return ProfileResponse(
        name=user.name,
        email=user.email,
        bio=user.bio or "",
        avatar=user.avatar or "",
        initials=initials,
    )


@router.put("", response_model=ProfileResponse)
@limiter.limit("10/hour")
def update_profile(request: Request, body: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if body.name is not None:
        user.name = body.name
    if body.bio is not None:
        user.bio = body.bio
    db.commit()
    db.refresh(user)
    initials = "".join(w[0] for w in user.name.split() if w)[:2].upper()
    return ProfileResponse(
        name=user.name,
        email=user.email,
        bio=user.bio or "",
        avatar=user.avatar or "",
        initials=initials,
    )


@router.post("/avatar")
@limiter.limit("5/hour")
async def upload_avatar(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Invalid image type. Allowed: JPEG, PNG, WEBP")
    ext = os.path.splitext(file.filename or "avatar.jpg")[1] or ".jpg"
    filename = f"avatar_{user.id}_{os.urandom(4).hex()}{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        img = Image.open(filepath)
        if img.mode == "RGBA":
            img = img.convert("RGB")
        img.thumbnail((256, 256), Image.LANCZOS)
        out_path = os.path.splitext(filepath)[0] + ".jpg"
        img.save(out_path, "JPEG", quality=85, optimize=True)
        if out_path != filepath:
            os.remove(filepath)
            filepath = out_path
    except Exception:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=400, detail="Invalid image")

    if user.avatar:
        old_path = os.path.join(AVATAR_DIR, os.path.basename(user.avatar))
        if os.path.exists(old_path):
            os.remove(old_path)

    user.avatar = media_url(filepath) or filepath
    db.commit()
    return {"avatar": user.avatar}


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
def get_recent_memories(offset: int = 0, limit: int = 10, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memories = (
        db.query(Memory)
        .filter(Memory.user_id == user.id)
        .order_by(Memory.created_at.desc())
        .offset(offset)
        .limit(limit)
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