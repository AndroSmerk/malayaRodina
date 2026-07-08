import os
import shutil
import re
import nh3
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from PIL import Image

from database import get_db
from models import Memory, Place, Photo, Video, User
from schemas import MemoryCreate, MemoryResponse
from auth_utils import get_current_user

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/memories", tags=["memories"])


def _media_url(file_path: str | None) -> str | None:
    if not file_path:
        return None
    return f"/uploads/{os.path.basename(file_path)}"


@router.get("", response_model=list[MemoryResponse])
def list_memories(place_id: int = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Memory).filter(Memory.user_id == user.id)
    if place_id:
        query = query.filter(Memory.place_id == place_id)
    memories = query.order_by(Memory.created_at.desc()).all()
    result = []
    for m in memories:
        place = m.place
        photos = db.query(Photo).filter(Photo.memory_id == m.id).all()
        videos = db.query(Video).filter(Video.memory_id == m.id).all()
        media = [_media_url(p.file_path) for p in photos if _media_url(p.file_path)] + [_media_url(v.file_path) for v in videos if _media_url(v.file_path)]
        result.append(MemoryResponse(
            id=m.id, title=m.title, text=m.text,
            date=m.date, category=m.category, visibility=m.visibility or "private",
            status=m.status or "approved", placeId=m.place_id,
            placeName=place.name if place else "",
            placeRegion=place.region if place else "",
            media=media,
            photos=[{"url": _media_url(p.file_path)} for p in photos if _media_url(p.file_path)],
            videos=[{"url": _media_url(v.file_path)} for v in videos if _media_url(v.file_path)],
        ))
    return result


@router.post("", response_model=MemoryResponse)
def create_memory(body: MemoryCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = db.query(Place).filter(Place.id == body.placeId, Place.user_id == user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    clean_text = nh3.clean(body.text, tags={'p','b','i','u','s','em','strong','ul','ol','li','blockquote','pre','code','h1','h2','h3','br'})
    plain_title = body.title or re.sub(r'<[^>]*>', '', clean_text)[:100]
    status = "approved" if body.visibility == "private" else "pending"
    memory = Memory(
        title=plain_title,
        text=clean_text,
        date=body.date,
        category=body.category,
        visibility=body.visibility,
        status=status,
        place_id=body.placeId,
        user_id=user.id,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return MemoryResponse(
        id=memory.id,
        title=memory.title,
        text=memory.text,
        date=memory.date,
        category=memory.category,
        visibility=memory.visibility or "private",
        status=memory.status or "approved",
        placeId=memory.place_id,
        placeName=place.name,
        placeRegion=place.region or "",
        media=[],
        photos=[],
        videos=[],
    )


@router.get("/{memory_id}/neighbors")
def get_memory_neighbors(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memory = db.query(Memory).filter(Memory.id == memory_id, Memory.user_id == user.id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return [
        {"id": n.id, "name": n.name, "role": n.role, "period": n.period}
        for n in memory.linked_neighbors
    ]


@router.get("/{memory_id}", response_model=MemoryResponse)
def get_memory(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memory = db.query(Memory).filter(Memory.id == memory_id, Memory.user_id == user.id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    place = memory.place
    photos = db.query(Photo).filter(Photo.memory_id == memory.id).all()
    videos = db.query(Video).filter(Video.memory_id == memory.id).all()
    media = ["📸"] * len(photos) + ["🎬"] * len(videos)
    return MemoryResponse(
        id=memory.id,
        title=memory.title,
        text=memory.text,
        date=memory.date,
        category=memory.category,
        visibility=memory.visibility or "private",
        placeId=memory.place_id,
        placeName=place.name if place else "",
        placeRegion=place.region or "",
        media=media,
        photos=[{"url": _media_url(p.file_path)} for p in photos if _media_url(p.file_path)],
        videos=[{"url": _media_url(v.file_path)} for v in videos if _media_url(v.file_path)],
    )


@router.delete("/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memory = db.query(Memory).filter(Memory.id == memory_id, Memory.user_id == user.id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(memory)
    db.commit()
    return {"ok": True}


@router.post("/{memory_id}/photos")
async def upload_photo(
    memory_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    memory = db.query(Memory).filter(Memory.id == memory_id, Memory.user_id == user.id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
    filename = f"memory_{memory_id}_{os.urandom(4).hex()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        img = Image.open(filepath)
        if img.mode == "RGBA":
            img = img.convert("RGB")
        max_dim = 1920
        if img.width > max_dim or img.height > max_dim:
            ratio = min(max_dim / img.width, max_dim / img.height)
            img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.LANCZOS)
        out_ext = ".jpg"
        out_path = os.path.splitext(filepath)[0] + out_ext
        img.save(out_path, "JPEG", quality=85, optimize=True)
        if out_path != filepath:
            os.remove(filepath)
            filepath = out_path
            filename = os.path.basename(filepath)
    except Exception:
        pass
    status = "approved" if memory.visibility == "private" else "pending"
    photo = Photo(file_path=filepath, status=status, memory_id=memory.id, place_id=memory.place_id)
    db.add(photo)
    db.commit()
    return {"id": photo.id, "file_path": filepath}


@router.post("/{memory_id}/videos")
async def upload_video(
    memory_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    memory = db.query(Memory).filter(Memory.id == memory_id, Memory.user_id == user.id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    max_size = 100 * 1024 * 1024
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > max_size:
        raise HTTPException(status_code=413, detail="Video too large (max 100MB)")
    ext = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    filename = f"memory_{memory_id}_{os.urandom(4).hex()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    video = Video(file_path=filepath, memory_id=memory.id, place_id=memory.place_id)
    db.add(video)
    db.commit()
    return {"id": video.id, "file_path": filepath}


@router.get("/adjacent/{memory_id}")
def get_adjacent(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ids = db.query(Memory.id).filter(Memory.user_id == user.id).order_by(Memory.id).all()
    ids = [r[0] for r in ids]
    if memory_id not in ids:
        return {"prev": None, "next": None}
    idx = ids.index(memory_id)
    return {
        "prev": ids[idx - 1] if idx > 0 else None,
        "next": ids[idx + 1] if idx < len(ids) - 1 else None,
    }
