import os
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Memory, Photo, Video
from auth_utils import get_optional_user
from routers.common import can_access_memory

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

router = APIRouter(tags=["uploads"])

_MEMORY_RE = re.compile(r"memory_(\d+)_")


@router.get("/uploads/{filename:path}")
def serve_upload(filename: str, db: Session = Depends(get_db), user=Depends(get_optional_user)):
    filepath = os.path.normpath(os.path.join(UPLOAD_DIR, filename))
    if not filepath.startswith(UPLOAD_DIR):
        raise HTTPException(status_code=403)

    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404)

    match = _MEMORY_RE.search(filename)
    if match:
        memory_id = int(match.group(1))
        memory = db.query(Memory).filter(Memory.id == memory_id).first()
        if not memory or not can_access_memory(user, memory, db):
            raise HTTPException(status_code=404)

    return FileResponse(filepath)