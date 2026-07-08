from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Neighbor, Place, User, Memory
from schemas import NeighborCreate, NeighborResponse
from auth_utils import get_current_user

router = APIRouter(prefix="/api/neighbors", tags=["neighbors"])


@router.get("/place/{place_id}", response_model=list[NeighborResponse])
def list_neighbors(place_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = db.query(Place).filter(Place.id == place_id, Place.user_id == user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    neighbors = db.query(Neighbor).filter(Neighbor.place_id == place_id).all()
    result = []
    for n in neighbors:
        memory_ids = [m.id for m in n.linked_memories]
        result.append(NeighborResponse(
            id=n.id, name=n.name, role=n.role,
            period=n.period, type=n.type, memories=memory_ids,
        ))
    return result


@router.post("", response_model=NeighborResponse)
def create_neighbor(body: NeighborCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    place = db.query(Place).filter(Place.id == body.placeId, Place.user_id == user.id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    neighbor = Neighbor(
        name=body.name, role=body.role,
        period=body.period, type=body.type,
        place_id=body.placeId, user_id=user.id,
    )
    db.add(neighbor)
    db.commit()
    db.refresh(neighbor)
    return NeighborResponse(
        id=neighbor.id, name=neighbor.name, role=neighbor.role,
        period=neighbor.period, type=neighbor.type, memories=[],
    )


@router.delete("/{neighbor_id}")
def delete_neighbor(neighbor_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    neighbor = db.query(Neighbor).filter(Neighbor.id == neighbor_id, Neighbor.user_id == user.id).first()
    if not neighbor:
        raise HTTPException(status_code=404, detail="Neighbor not found")
    db.delete(neighbor)
    db.commit()
    return {"ok": True}


@router.post("/{neighbor_id}/link/{memory_id}")
def link_neighbor_to_memory(neighbor_id: int, memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    neighbor = db.query(Neighbor).filter(Neighbor.id == neighbor_id, Neighbor.user_id == user.id).first()
    if not neighbor:
        raise HTTPException(status_code=404, detail="Neighbor not found")
    memory = db.query(Memory).filter(Memory.id == memory_id, Memory.user_id == user.id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    if memory not in neighbor.linked_memories:
        neighbor.linked_memories.append(memory)
        db.commit()
    return {"ok": True}


@router.delete("/{neighbor_id}/link/{memory_id}")
def unlink_neighbor_from_memory(neighbor_id: int, memory_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    neighbor = db.query(Neighbor).filter(Neighbor.id == neighbor_id, Neighbor.user_id == user.id).first()
    if not neighbor:
        raise HTTPException(status_code=404, detail="Neighbor not found")
    memory = db.query(Memory).filter(Memory.id == memory_id, Memory.user_id == user.id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    if memory in neighbor.linked_memories:
        neighbor.linked_memories.remove(memory)
        db.commit()
    return {"ok": True}
