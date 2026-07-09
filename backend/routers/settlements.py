from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import get_db
from models import SettlementCatalog

router = APIRouter(prefix="/api/settlements", tags=["settlements"])

TRANS_TABLE = str.maketrans({
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'a', 'Б': 'b', 'В': 'v', 'Г': 'g', 'Д': 'd', 'Е': 'e', 'Ё': 'e',
    'Ж': 'zh', 'З': 'z', 'И': 'i', 'Й': 'y', 'К': 'k', 'Л': 'l', 'М': 'm',
    'Н': 'n', 'О': 'o', 'П': 'p', 'Р': 'r', 'С': 's', 'Т': 't', 'У': 'u',
    'Ф': 'f', 'Х': 'kh', 'Ц': 'ts', 'Ч': 'ch', 'Ш': 'sh', 'Щ': 'shch',
    'Ъ': '', 'Ы': 'y', 'Ь': '', 'Э': 'e', 'Ю': 'yu', 'Я': 'ya',
})


def transliterate(text):
    return text.translate(TRANS_TABLE)


def has_cyrillic(text):
    return any('\u0400' <= c <= '\u04FF' for c in text)


@router.get("/search")
def search_settlements(q: str = Query(min_length=1), offset: int = 0, limit: int = 15, db: Session = Depends(get_db)):
    q = q.strip()
    q_latin = transliterate(q).replace('-', '%')
    q_cyr = q.replace('-', '%')

    conditions = [SettlementCatalog.name.ilike(f"%{q_latin}%")]
    if has_cyrillic(q):
        conditions.append(SettlementCatalog.name_ru.ilike(f"%{q_cyr}%"))

    results = (
        db.query(SettlementCatalog)
        .filter(or_(*conditions))
        .order_by(SettlementCatalog.population.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name_ru or r.name,
            "type": r.type,
            "region": r.region_ru or r.region,
            "lat": r.lat,
            "lng": r.lng,
        }
        for r in results
    ]


@router.get("/nearest")
def nearest_settlement(
    lat: float = Query(),
    lng: float = Query(),
    db: Session = Depends(get_db),
) -> Optional[dict]:
    def fmt(r):
        return {
            "name": r.name_ru or r.name,
            "type": r.type,
            "region": r.region_ru or r.region,
            "lat": r.lat,
            "lng": r.lng,
        }

    def d2(r):
        return (r.lat - lat) * (r.lat - lat) + (r.lng - lng) * (r.lng - lng)

    base = db.query(SettlementCatalog).filter(
        SettlementCatalog.lat.between(lat - 0.5, lat + 0.5),
        SettlementCatalog.lng.between(lng - 0.5, lng + 0.5),
        SettlementCatalog.type != 'district',
    )

    nearest = base.order_by(
        (SettlementCatalog.lat - lat) * (SettlementCatalog.lat - lat)
        + (SettlementCatalog.lng - lng) * (SettlementCatalog.lng - lng)
    ).first()

    if not nearest:
        return None

    if d2(nearest) > 0.0016:
        city = base.filter(SettlementCatalog.type == 'city').order_by(
            (SettlementCatalog.lat - lat) * (SettlementCatalog.lat - lat)
            + (SettlementCatalog.lng - lng) * (SettlementCatalog.lng - lng)
        ).first()
        if city:
            return fmt(city)

    return fmt(nearest)
