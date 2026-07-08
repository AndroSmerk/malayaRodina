# Малая Родина 🌿

Геосоциальная краеведческая платформа — сохраняйте личные воспоминания на карте.

## Стек

- **Фронтенд:** HTML + CSS + Vanilla JS + Leaflet (карты) + Quill.js (WYSIWYG редактор)
- **Бэкенд:** Python FastAPI + SQLAlchemy + SQLite + Pillow (сжатие фото)
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
| DELETE | `/api/places/{id}` | Удалить место (каскадно с воспоминаниями/фото/видео) |
| GET | `/api/places/{id}` | Детали места |
| GET | `/api/places/{id}/photos` | Фото места |
| GET | `/api/places/{id}/videos` | Видео места |
| GET | `/api/memories?place_id=` | Список воспоминаний |
| POST | `/api/memories` | Создать воспоминание |
| GET | `/api/memories/{id}` | Детали воспоминания |
| DELETE | `/api/memories/{id}` | Удалить воспоминание |
| POST | `/api/memories/{id}/photos` | Загрузить фото (автосжатие Pillow, макс 1920px) |
| POST | `/api/memories/{id}/videos` | Загрузить видео (макс 100MB) |
| GET | `/api/neighbors/place/{id}` | Список соседей |
| POST | `/api/neighbors` | Добавить соседа |
| DELETE | `/api/neighbors/{id}` | Удалить соседа |
| POST | `/api/neighbors/{id}/link/{memory_id}` | Привязать соседа к воспоминанию |
| DELETE | `/api/neighbors/{id}/link/{memory_id}` | Отвязать соседа |
| GET | `/api/profile` | Профиль |
| GET | `/api/profile/stats` | Статистика |
| GET | `/api/profile/memories` | Последние воспоминания |
| GET | `/api/localities` | Поиск населённых пунктов |
| POST | `/api/localities` | Создать населённый пункт |
| GET | `/api/streets?locality_id=&q=` | Поиск улиц |
| POST | `/api/streets` | Создать улицу |
| GET | `/api/buildings?street_id=&q=` | Поиск домов |
| POST | `/api/buildings` | Создать дом |
| GET | `/api/apartments?building_id=&q=` | Поиск квартир |
| POST | `/api/apartments` | Создать квартиру |
| GET | `/api/family/members` | Список членов семьи |
| POST | `/api/family/members` | Добавить члена семьи |
| DELETE | `/api/family/members/{id}` | Удалить члена семьи |
| GET | `/api/public/places` | Публичные места (без аутентификации) |
| GET | `/api/public/memories` | Публичные воспоминания |
| GET | `/api/moderation/pending` | Ожидающие модерации (только модератор) |
| POST | `/api/moderation/memories/{id}/approve` | Одобрить воспоминание |
| POST | `/api/moderation/memories/{id}/reject` | Отклонить воспоминание |
| POST | `/api/moderation/photos/{id}/approve` | Одобрить фото |
| POST | `/api/moderation/photos/{id}/reject` | Отклонить фото |

## Структура проекта

```
malayaRodina/
├── backend/
│   ├── main.py              # FastAPI приложение
│   ├── database.py          # SQLAlchemy + SQLite
│   ├── models.py            # ORM модели (Place, Memory, Photo, Video, Neighbor,
│   │                        #   User, Locality, Street, Building, Apartment, FamilyMember)
│   ├── schemas.py           # Pydantic схемы
│   ├── auth_utils.py        # JWT + хеширование
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py          # Регистрация / логин
│   │   ├── places.py        # CRUD мест
│   │   ├── memories.py      # Воспоминания + загрузка медиа
│   │   ├── neighbors.py     # Соседи
│   │   ├── profile.py       # Профиль
│   │   ├── family.py        # Семейный круг
│   │   ├── public.py        # Публичные эндпоинты (без авторизации)
│   │   ├── moderation.py    # Одобрение/отклонение контента
│   │   ├── localities.py    # Иерархия: населённые пункты
│   │   ├── streets.py       # Иерархия: улицы
│   │   ├── buildings.py     # Иерархия: дома
│   │   └── apartments.py    # Иерархия: квартиры
│   └── uploads/             # Загруженные фото и видео
├── pages/                   # Фронтенд (статик файлы)
│   ├── auth/                # Вход / регистрация
│   ├── map/                 # Карта с местами + фильтры
│   ├── add-memory/          # Создание воспоминания (Quill.js + загрузка медиа)
│   ├── place/               # Страница места (список воспоминаний, фото, видео)
│   ├── memory/              # Просмотр воспоминания
│   ├── my-places/           # Список всех мест
│   ├── neighbors/           # Соседи места
│   ├── family/              # Управление семейным кругом
│   ├── moderation/          # Панель модератора
│   └── profile/             # Профиль + статистика + выход
└── README.md
```

## Фичи

- **Иерархия мест:** Населённый пункт → Улица → Дом → Квартира с автопоиском
- **Приватность:** Публичное / Семейный круг / Только я
- **WYSIWYG:** Форматирование текста воспоминаний (Quill.js), XSS-защита (nh3)
- **Сжатие фото:** Pillow — ресайз до 1920px, JPEG quality 85
- **Видео:** Лимит 100MB (проверка на бэкенде и фронтенде)
- **Фильтры карты:** По типу места и периоду
- **Модерация:** Публичный/семейный контент требует одобрения
- **Соседи:** Привязка людей к воспоминаниям
- **Семья:** Семейный круг для приватного контента
