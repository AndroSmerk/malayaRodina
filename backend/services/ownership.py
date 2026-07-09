from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import User


def get_owned_or_404(db: Session, model, entity_id: int, user: User):
    entity = db.query(model).filter(model.id == entity_id, model.user_id == user.id).first()
    if not entity:
        raise HTTPException(status_code=404)
    return entity