from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
import os
import sys

from database import engine, Base
from routers import auth, places, memories, neighbors, profile, localities, streets, buildings, apartments, family, public, settlements, uploads
from limiter import limiter

Base.metadata.create_all(bind=engine)
engine.dispose()

from import_settlements import needs_import, run

if needs_import():
    print("Первичный импорт населённых пунктов (один раз)...")
    sys.stdout.flush()
    try:
        run()
    except Exception as e:
        print(f"  ⚠ Ошибка импорта: {e}")
        sys.stdout.flush()

app = FastAPI(title="Малая Родина API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = os.environ.get("CORS_ORIGINS", "http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(places.router)
app.include_router(memories.router)
app.include_router(neighbors.router)
app.include_router(profile.router)
app.include_router(localities.router)
app.include_router(streets.router)
app.include_router(buildings.router)
app.include_router(apartments.router)
app.include_router(family.router)
app.include_router(public.router)
app.include_router(settlements.router)
app.include_router(uploads.router)

FRONTEND_DIR = os.environ.get("FRONTEND_DIR", os.path.join(os.path.dirname(__file__), "..", "dist"))
if not os.path.isdir(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
