import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session

from database import get_db
from models import Memory, Place, Photo, Video, User
from schemas import MemoryCreate, MemoryResponse
from auth_utils import get_current_user
from routers.common import paginate, PaginatedResponse
from limiter import limiter
from services.text_service import sanitize_memory_text, extract_plain_title
from services.media_service import save_photo, save_video, delete_media_files
from services.memory_service import build_memory_response, build_memory_response_from_batch, batch_load_media
from services.ownership import get_owned_or_404

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/memories", tags=["memories"])


@router.get("", response_model=PaginatedResponse[MemoryResponse])
def list_memories(place_id: int = None, offset: int = 0, limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Memory).filter(Memory.user_id == user.id)
    if place_id:
        query = query.filter(Memory.place_id == place_id)
    query = query.order_by(Memory.created_at.desc())
    items, total = paginate(query, offset, limit)

    if not items:
        return PaginatedResponse(items=[], total=0, offset=offset, limit=limit)

    mids = [m.id for m in items]
    photos_by_memory, videos_by_memory = batch_load_media(mids, db)

    result = []
    for m in items:
        result.append(build_memory_response_from_batch(
            m, photos_by_memory.get(m.id, []), videos_by_memory.get(m.id, [])
        ))
    return PaginatedResponse(items=result, total=total, offset=offset, limit=limit)


@router.post("", response_model=MemoryResponse)
@limiter.limit("30/hour")
def create_memory(request: Request, body: MemoryCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = db.query(Place).filter(Place.id == body.placeId, Place.user_id == user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    clean_text = sanitize_memory_text(body.text)
    plain_title = extract_plain_title(clean_text, body.title)
    memory = Memory(
        title=plain_title,
        text=clean_text,
        date=body.date,
        category=body.category,
        visibility=body.visibility,
        status="approved",
        place_id=body.placeId,
        user_id=user.id,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return build_memory_response(memory, db)


@router.put("/{memory_id}", response_model=MemoryResponse)
@limiter.limit("30/hour")
def update_memory(
    request: Request,
    memory_id: int,
    body: MemoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    memory = get_owned_or_404(db, Memory, memory_id, user)
    clean_text = sanitize_memory_text(body.text)
    plain_title = extract_plain_title(clean_text, body.title)
    memory.title = plain_title
    memory.text = clean_text
    memory.date = body.date
    memory.category = body.category
    memory.visibility = body.visibility
    db.commit()
    db.refresh(memory)
    return build_memory_response(memory, db)


@router.get("/{memory_id}/neighbors")
def get_memory_neighbors(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memory = get_owned_or_404(db, Memory, memory_id, user)
    return [
        {"id": n.id, "name": n.name, "role": n.role, "period": n.period}
        for n in memory.linked_neighbors
    ]


@router.get("/{memory_id}", response_model=MemoryResponse)
def get_memory(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memory = db.query(Memory).filter(Memory.id == memory_id).first()
    from routers.common import can_access_memory
    if not memory or not can_access_memory(user, memory, db):
        raise HTTPException(status_code=404, detail="Memory not found")
    return build_memory_response(memory, db)


@router.delete("/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memory = get_owned_or_404(db, Memory, memory_id, user)
    file_paths = [p.file_path for p in memory.photos if p.file_path]
    file_paths += [v.file_path for v in memory.videos if v.file_path]
    db.delete(memory)
    db.commit()
    delete_media_files(file_paths)
    return {"ok": True}


@router.post("/{memory_id}/photos")
@limiter.limit("20/hour")
async def upload_photo(
    request: Request,
    memory_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    memory = get_owned_or_404(db, Memory, memory_id, user)
    photo = await save_photo(file, memory)
    db.add(photo)
    try:
        db.commit()
    except Exception:
        if os.path.exists(photo.file_path):
            os.remove(photo.file_path)
        raise
    return {"id": photo.id, "file_path": photo.file_path}


@router.post("/{memory_id}/videos")
@limiter.limit("10/hour")
async def upload_video(
    request: Request,
    memory_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    memory = get_owned_or_404(db, Memory, memory_id, user)
    video = await save_video(file, memory)
    db.add(video)
    try:
        db.commit()
    except Exception:
        if os.path.exists(video.file_path):
            os.remove(video.file_path)
        raise
    return {"id": video.id, "file_path": video.file_path}


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