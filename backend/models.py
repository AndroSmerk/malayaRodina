from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


neighbor_memory = Table(
    "neighbor_memories",
    Base.metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("neighbor_id", Integer, ForeignKey("neighbors.id"), nullable=False),
    Column("memory_id", Integer, ForeignKey("memories.id"), nullable=False),
    Column("created_at", DateTime, default=lambda: datetime.now(timezone.utc)),
)


class SettlementCatalog(Base):
    __tablename__ = "settlement_catalog"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    name_ru = Column(String(255), default="")
    type = Column(String(50), nullable=False)
    region = Column(String(255), default="")
    region_ru = Column(String(255), default="")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    population = Column(Integer, default=0)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(String(500), default="")
    bio = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    places = relationship("Place", back_populates="user")
    memories = relationship("Memory", back_populates="user")
    localities = relationship("Locality", back_populates="user")
    streets = relationship("Street", back_populates="user")
    buildings = relationship("Building", back_populates="user")
    apartments = relationship("Apartment", back_populates="user")
    family_as_user = relationship("FamilyMember", foreign_keys="FamilyMember.user_id", back_populates="user")
    family_as_relative = relationship("FamilyMember", foreign_keys="FamilyMember.relative_id", back_populates="relative")


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    relative_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", foreign_keys=[user_id], back_populates="family_as_user")
    relative = relationship("User", foreign_keys=[relative_id], back_populates="family_as_relative")


class Locality(Base):
    __tablename__ = "localities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default="village")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    region = Column(String(255), default="")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="localities")
    streets = relationship("Street", back_populates="locality", cascade="all, delete-orphan")


class Street(Base):
    __tablename__ = "streets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    locality = relationship("Locality", back_populates="streets")
    user = relationship("User", back_populates="streets")
    buildings = relationship("Building", back_populates="street", cascade="all, delete-orphan")


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    street_id = Column(Integer, ForeignKey("streets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    street = relationship("Street", back_populates="buildings")
    user = relationship("User", back_populates="buildings")
    apartments = relationship("Apartment", back_populates="building", cascade="all, delete-orphan")


class Apartment(Base):
    __tablename__ = "apartments"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), nullable=False)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    building = relationship("Building", back_populates="apartments")
    user = relationship("User", back_populates="apartments")


class Place(Base):
    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default="village")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    region = Column(String(255), default="")
    period = Column(String(100), default="")
    visibility = Column(String(20), default="private")
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=True)
    street_id = Column(Integer, ForeignKey("streets.id"), nullable=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="places")
    memories = relationship("Memory", back_populates="place", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="place", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="place", cascade="all, delete-orphan")


class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), default="")
    text = Column(Text, nullable=False)
    date = Column(String(100), default="")
    category = Column(String(100), default="")
    visibility = Column(String(20), default="private")
    status = Column(String(20), default="approved")
    place_id = Column(Integer, ForeignKey("places.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    place = relationship("Place", back_populates="memories")
    user = relationship("User", back_populates="memories")
    photos = relationship("Photo", back_populates="memory", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="memory", cascade="all, delete-orphan")
    linked_neighbors = relationship("Neighbor", secondary=neighbor_memory, back_populates="linked_memories")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String(500), default="")
    status = Column(String(20), default="approved")
    memory_id = Column(Integer, ForeignKey("memories.id"), nullable=True)
    place_id = Column(Integer, ForeignKey("places.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    memory = relationship("Memory", back_populates="photos")
    place = relationship("Place", back_populates="photos")


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String(500), default="")
    memory_id = Column(Integer, ForeignKey("memories.id"), nullable=True)
    place_id = Column(Integer, ForeignKey("places.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    memory = relationship("Memory", back_populates="videos")
    place = relationship("Place", back_populates="videos")


class Neighbor(Base):
    __tablename__ = "neighbors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(255), default="")
    period = Column(String(100), default="")
    type = Column(String(50), default="default")
    place_id = Column(Integer, ForeignKey("places.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    linked_memories = relationship("Memory", secondary=neighbor_memory, back_populates="linked_neighbors")
