from pydantic import BaseModel
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


class LocalityCreate(BaseModel):
    name: str
    type: str = "village"
    lat: float
    lng: float
    region: str = ""


class LocalityResponse(BaseModel):
    id: int
    name: str
    type: str
    lat: float
    lng: float
    region: str

    class Config:
        from_attributes = True


class StreetCreate(BaseModel):
    name: str
    locality_id: int


class StreetResponse(BaseModel):
    id: int
    name: str
    locality_id: int

    class Config:
        from_attributes = True


class BuildingCreate(BaseModel):
    number: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    street_id: int


class BuildingResponse(BaseModel):
    id: int
    number: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    street_id: int

    class Config:
        from_attributes = True


class ApartmentCreate(BaseModel):
    number: str
    building_id: int


class ApartmentResponse(BaseModel):
    id: int
    number: str
    building_id: int

    class Config:
        from_attributes = True


class PlaceCreate(BaseModel):
    name: str
    type: str = "village"
    lat: float
    lng: float
    region: str = ""
    period: str = ""
    visibility: str = "private"
    locality_id: Optional[int] = None
    street_id: Optional[int] = None
    building_id: Optional[int] = None
    apartment_id: Optional[int] = None


class PlaceResponse(BaseModel):
    id: int
    name: str
    type: str
    lat: float
    lng: float
    region: str
    period: str = ""
    visibility: str = "private"
    locality_id: Optional[int] = None
    street_id: Optional[int] = None
    building_id: Optional[int] = None
    apartment_id: Optional[int] = None
    locality_name: str = ""
    street_name: str = ""
    building_number: str = ""
    apartment_number: str = ""
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
    visibility: str = "private"


class MemoryResponse(BaseModel):
    id: int
    title: str
    text: str
    date: str
    category: str
    visibility: str = "private"
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


class FamilyMemberCreate(BaseModel):
    email: str


class FamilyMemberResponse(BaseModel):
    id: int
    relative_id: int
    name: str
    email: str
    avatar: str = ""

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None


class ProfileResponse(BaseModel):
    name: str
    email: str
    bio: str = ""
    avatar: str = ""
    initials: str = ""


class StatsResponse(BaseModel):
    places: int = 0
    memories: int = 0
    photos: int = 0
    videos: int = 0
