from pydantic import BaseModel, EmailStr
from typing import Optional


class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    user: dict


class PlaceCreate(BaseModel):
    name: str
    type: str = "village"
    lat: float
    lng: float
    region: str = ""


class PlaceResponse(BaseModel):
    id: int
    name: str
    type: str
    lat: float
    lng: float
    region: str
    photos: int = 0
    videos: int = 0
    neighbors: int = 0
    memories: int = 0

    class Config:
        from_attributes = True


class MemoryCreate(BaseModel):
    placeId: int
    text: str
    title: str = ""
    date: str = ""
    category: str = ""


class MemoryResponse(BaseModel):
    id: int
    title: str
    text: str
    date: str
    category: str
    placeId: int
    placeName: str = ""
    placeRegion: str = ""
    media: list = []
    photos: list = []
    videos: list = []

    class Config:
        from_attributes = True


class NeighborCreate(BaseModel):
    name: str
    role: str = ""
    period: str = ""
    type: str = "default"
    placeId: int


class NeighborResponse(BaseModel):
    id: int
    name: str
    role: str
    period: str
    type: str
    memories: list = []

    class Config:
        from_attributes = True


class ProfileResponse(BaseModel):
    name: str
    email: str
    bio: str = ""
    initials: str = ""


class StatsResponse(BaseModel):
    places: int = 0
    memories: int = 0
    photos: int = 0
    videos: int = 0
