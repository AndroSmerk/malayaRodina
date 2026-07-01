from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
from routers import auth, places, memories, neighbors, profile

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Малая Родина API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(places.router)
app.include_router(memories.router)
app.include_router(neighbors.router)
app.include_router(profile.router)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

pages_dir = os.path.join(os.path.dirname(__file__), "..", "pages")
app.mount("/", StaticFiles(directory=pages_dir, html=True), name="frontend")
