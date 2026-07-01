from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


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


class Place(Base):
    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default="village")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    region = Column(String(255), default="")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="places")
    memories = relationship("Memory", back_populates="place", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="place", cascade="all, delete-orphan")


class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), default="")
    text = Column(Text, nullable=False)
    date = Column(String(100), default="")
    category = Column(String(100), default="")
    place_id = Column(Integer, ForeignKey("places.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    place = relationship("Place", back_populates="memories")
    user = relationship("User", back_populates="memories")
    photos = relationship("Photo", back_populates="memory", cascade="all, delete-orphan")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String(500), default="")
    memory_id = Column(Integer, ForeignKey("memories.id"), nullable=True)
    place_id = Column(Integer, ForeignKey("places.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    memory = relationship("Memory", back_populates="photos")
    place = relationship("Place", back_populates="photos")


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
