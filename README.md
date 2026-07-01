# Малая Родина 🌿

Геосоциальная краеведческая платформа — сохраняйте личные воспоминания на карте.

## Стек

- **Фронтенд:** HTML + CSS + Vanilla JS + Leaflet (карты)
- **Бэкенд:** Python FastAPI + SQLAlchemy + SQLite
- **Аутентификация:** JWT (bearer token)

## Быстрый старт

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Открыть `http://localhost:8000/auth/`

## API endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Логин |
| GET | `/api/places` | Список мест |
| POST | `/api/places` | Создать место |
| GET | `/api/places/{id}` | Детали места |
| GET | `/api/memories?place_id=` | Список воспоминаний |
| POST | `/api/memories` | Создать воспоминание |
| GET | `/api/memories/{id}` | Детали воспоминания |
| DELETE | `/api/memories/{id}` | Удалить воспоминание |
| POST | `/api/memories/{id}/photos` | Загрузить фото |
| GET | `/api/neighbors/place/{id}` | Список соседей |
| POST | `/api/neighbors` | Добавить соседа |
| DELETE | `/api/neighbors/{id}` | Удалить соседа |
| GET | `/api/profile` | Профиль |
| GET | `/api/profile/stats` | Статистика |
| GET | `/api/profile/memories` | Последние воспоминания |

## Структура проекта

```
malayaRodina/
├── backend/
│   ├── main.py              # FastAPI приложение
│   ├── database.py          # SQLAlchemy + SQLite
│   ├── models.py            # ORM модели
│   ├── schemas.py           # Pydantic схемы
│   ├── auth_utils.py        # JWT + хеширование
│   ├── routers/             # API роутеры
│   └── requirements.txt
├── pages/                   # Фронтенд (статик файлы)
│   ├── auth/
│   ├── map/
│   ├── add-memory/
│   ├── place/
│   ├── memory/
│   ├── neighbors/
│   └── profile/
└── README.md
```
