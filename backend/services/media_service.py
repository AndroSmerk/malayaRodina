import os
import shutil
from PIL import Image
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from models import Photo, Video, Memory
from routers.common import media_url


UPLOAD_DIR = "uploads"
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_PHOTO_SIZE = 10 * 1024 * 1024
MAX_VIDEO_SIZE = 100 * 1024 * 1024

os.makedirs(UPLOAD_DIR, exist_ok=True)


def generate_filename(prefix: str, original_name: str, suffix: str = "") -> str:
    ext = os.path.splitext(original_name or f"{prefix}.jpg")[1] or ".jpg"
    return f"{prefix}_{os.urandom(4).hex()}{suffix}{ext}"


def delete_media_files(file_paths: list[str]):
    for fp in file_paths:
        if fp and os.path.exists(fp):
            os.remove(fp)


async def save_photo(file: UploadFile, memory: Memory) -> Photo:
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=400, detail="Invalid photo type. Allowed: JPEG, PNG, WEBP")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_PHOTO_SIZE:
        raise HTTPException(status_code=413, detail=f"Photo too large (max {MAX_PHOTO_SIZE // 1024 // 1024}MB)")

    filename = generate_filename(f"memory_{memory.id}", file.filename or "photo.jpg")
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
        out_path = os.path.splitext(filepath)[0] + ".jpg"
        img.save(out_path, "JPEG", quality=85, optimize=True)
        if out_path != filepath:
            os.remove(filepath)
            filepath = out_path
    except Exception:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=400, detail="Invalid or corrupted image")

    return Photo(file_path=filepath, status="approved", memory_id=memory.id, place_id=memory.place_id)


async def save_video(file: UploadFile, memory: Memory) -> Video:
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Invalid video type. Allowed: MP4, WebM, MOV")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=413, detail="Video too large (max 100MB)")

    filename = generate_filename(f"memory_{memory.id}", file.filename or "video.mp4")
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return Video(file_path=filepath, memory_id=memory.id, place_id=memory.place_id)