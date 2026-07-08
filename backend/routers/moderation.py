from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Memory, Photo, User
from auth_utils import get_current_user

router = APIRouter(prefix="/api/moderation", tags=["moderation"])


def _require_moderator(user: User):
    if not user.is_moderator:
        raise HTTPException(status_code=403, detail="Moderator access required")
    return user


@router.get("/pending")
def get_pending(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_moderator(user)

    pending_memories = db.query(Memory).filter(Memory.status == "pending").order_by(Memory.created_at.desc()).all()
    pending_photos = db.query(Photo).filter(Photo.status == "pending").order_by(Photo.id).all()

    return {
        "memories": [
            {
                "id": m.id,
                "title": m.title,
                "text": m.text[:200],
                "date": m.date,
                "category": m.category,
                "visibility": m.visibility,
                "user_id": m.user_id,
                "place_id": m.place_id,
            }
            for m in pending_memories
        ],
        "photos": [
            {
                "id": p.id,
                "file_path": p.file_path,
                "memory_id": p.memory_id,
                "user_id": db.query(Memory.user_id).filter(Memory.id == p.memory_id).scalar() if p.memory_id else None,
            }
            for p in pending_photos
        ],
    }


@router.post("/memories/{memory_id}/approve")
def approve_memory(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_moderator(user)
    memory = db.query(Memory).filter(Memory.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    memory.status = "approved"
    db.commit()
    return {"ok": True}


@router.post("/memories/{memory_id}/reject")
def reject_memory(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_moderator(user)
    memory = db.query(Memory).filter(Memory.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    memory.status = "rejected"
    db.commit()
    return {"ok": True}


@router.post("/photos/{photo_id}/approve")
def approve_photo(photo_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_moderator(user)
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    photo.status = "approved"
    db.commit()
    return {"ok": True}


@router.post("/photos/{photo_id}/reject")
def reject_photo(photo_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_moderator(user)
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    photo.status = "rejected"
    db.commit()
    return {"ok": True}
