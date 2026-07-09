import os
from typing import Optional, Generic, TypeVar
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Place, Photo, Video, Neighbor, Memory, Locality, Street, Building, Apartment, FamilyMember, User
from schemas import PlaceResponse

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    offset: int
    limit: int


def paginate(query, offset: int = 0, limit: int = 50):
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return items, total


def can_access_memory(user: Optional[User], memory: Memory, db: Session) -> bool:
    if user and memory.user_id == user.id:
        return True
    if memory.visibility == "public":
        return True
    if memory.visibility == "family" and user:
        member = db.query(FamilyMember).filter(
            FamilyMember.user_id == memory.user_id,
            FamilyMember.relative_id == user.id,
        ).first()
        return member is not None
    return False


def can_access_place(user: Optional[User], place: Place, db: Session) -> bool:
    if user and place.user_id == user.id:
        return True
    if place.visibility == "public":
        return True
    if place.visibility == "family" and user:
        member = db.query(FamilyMember).filter(
            FamilyMember.user_id == place.user_id,
            FamilyMember.relative_id == user.id,
        ).first()
        return member is not None
    return False


def media_url(file_path: str | None) -> str | None:
    if not file_path:
        return None
    return f"/uploads/{os.path.basename(file_path)}"


def enrich_place(p: Place, db: Session, public_only: bool = False) -> PlaceResponse:
    return enrich_places([p], db, public_only)[0]


def enrich_places(places: list[Place], db: Session, public_only: bool = False) -> list[PlaceResponse]:
    if not places:
        return []

    ids = [pl.id for pl in places]

    photos = dict(
        db.query(Photo.place_id, func.count(Photo.id))
        .filter(Photo.place_id.in_(ids))
        .group_by(Photo.place_id)
        .all()
    )
    videos = dict(
        db.query(Video.place_id, func.count(Video.id))
        .filter(Video.place_id.in_(ids))
        .group_by(Video.place_id)
        .all()
    )
    neighbors = dict(
        db.query(Neighbor.place_id, func.count(Neighbor.id))
        .filter(Neighbor.place_id.in_(ids))
        .group_by(Neighbor.place_id)
        .all()
    )

    mem_q = db.query(Memory.place_id, func.count(Memory.id)).filter(Memory.place_id.in_(ids))
    if public_only:
        mem_q = mem_q.filter(Memory.visibility == "public")
    memories = dict(mem_q.group_by(Memory.place_id).all())

    loc_ids = {pl.locality_id for pl in places if pl.locality_id}
    st_ids = {pl.street_id for pl in places if pl.street_id}
    bld_ids = {pl.building_id for pl in places if pl.building_id}
    apt_ids = {pl.apartment_id for pl in places if pl.apartment_id}

    loc_names = {}
    st_names = {}
    bld_numbers = {}
    apt_numbers = {}

    if loc_ids:
        loc_names = {l.id: l.name for l in db.query(Locality).filter(Locality.id.in_(loc_ids)).all()}
    if st_ids:
        st_names = {s.id: s.name for s in db.query(Street).filter(Street.id.in_(st_ids)).all()}
    if bld_ids:
        bld_numbers = {b.id: b.number for b in db.query(Building).filter(Building.id.in_(bld_ids)).all()}
    if apt_ids:
        apt_numbers = {a.id: a.number for a in db.query(Apartment).filter(Apartment.id.in_(apt_ids)).all()}

    return [
        PlaceResponse(
            id=pl.id, name=pl.name, type=pl.type,
            lat=pl.lat, lng=pl.lng, region=pl.region,
            period=pl.period or "", visibility=pl.visibility or "private",
            locality_id=pl.locality_id, street_id=pl.street_id,
            building_id=pl.building_id, apartment_id=pl.apartment_id,
            locality_name=loc_names.get(pl.locality_id, ""),
            street_name=st_names.get(pl.street_id, ""),
            building_number=bld_numbers.get(pl.building_id, ""),
            apartment_number=apt_numbers.get(pl.apartment_id, ""),
            photos=photos.get(pl.id, 0),
            videos=videos.get(pl.id, 0),
            neighbors=neighbors.get(pl.id, 0),
            memories=memories.get(pl.id, 0),
        )
        for pl in places
    ]
