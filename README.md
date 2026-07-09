# Малая Родина 🌿

Геосоциальная краеведческая платформа — сохраняйте личные воспоминания на карте.

## Стек

- **Фронтенд:** Vite + ES Modules + Leaflet (карты) + Quill.js (WYSIWYG редактор)
- **Бэкенд:** Python FastAPI + SQLAlchemy + SQLite + Pillow (сжатие фото)
- **Аутентификация:** JWT (bearer token + httpOnly cookie)
- **Тесты:** pytest + httpx

## Быстрый старт

```bash
# Бэкенд
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Фронтенд (в отдельном терминале для разработки)
cd frontend
npm install
npm run dev
```

При первом запуске бэкенда автоматически скачается каталог населённых пунктов России (202 тыс. записей из GeoNames). SQLite-база создаётся локально.

### Сборка фронтенда (продакшен)

```bash
cd frontend
npm run build
```
Бандл будет в `dist/`. Для запуска с ним: `FRONTEND_DIR=../dist uvicorn main:app --port 8000`.

## Тестирование

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

## Фронтенд

Проект использует Vite для мульти-страничной сборки. Каждая папка в `frontend/` — отдельная страница со своим `index.html`, `app.js`, `style.css`.

Общий код:
- `frontend/shared/api.js` — HTTP-клиент (`jsonHeaders`, `escHtml`)
- `frontend/shared/icons.js` — иконки и подписи типов мест

### Страницы

| Путь | Описание |
|------|----------|
| `/` | Лендинг |
| `/auth/` | Вход / регистрация |
| `/map/` | Карта с местами + фильтры + создание |
| `/place/?id=` | Детали места (воспоминания, фото, видео) |
| `/memory/?id=` | Просмотр воспоминания |
| `/add-memory/?placeId=` | Создание воспоминания (Quill.js + медиа) |
| `/my-places/` | Список всех мест |
| `/neighbors/?placeId=` | Соседи места |
| `/family/` | Управление семейным кругом |
| `/profile/` | Профиль + статистика + выход |

## API endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Логин |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/me` | Текущий пользователь |
| | |
| GET | `/api/places` | Список мест (авторизованные) |
| POST | `/api/places` | Создать место |
| GET | `/api/places/{id}` | Детали места |
| DELETE | `/api/places/{id}` | Удалить место (каскадно) |
| GET | `/api/places/{id}/photos` | Фото места |
| GET | `/api/places/{id}/videos` | Видео места |
| | |
| GET | `/api/memories?place_id=` | Список воспоминаний |
| POST | `/api/memories` | Создать воспоминание |
| PUT | `/api/memories/{id}` | Обновить воспоминание |
| GET | `/api/memories/{id}` | Детали воспоминания |
| DELETE | `/api/memories/{id}` | Удалить воспоминание |
| POST | `/api/memories/{id}/photos` | Загрузить фото (автосжатие 1920px) |
| POST | `/api/memories/{id}/videos` | Загрузить видео (макс 100MB) |
| | |
| GET | `/api/neighbors/place/{id}` | Список соседей места |
| POST | `/api/neighbors` | Добавить соседа |
| DELETE | `/api/neighbors/{id}` | Удалить соседа |
| POST | `/api/neighbors/{id}/link/{memory_id}` | Привязать соседа к воспоминанию |
| DELETE | `/api/neighbors/{id}/link/{memory_id}` | Отвязать соседа |
| | |
| GET | `/api/profile` | Профиль |
| PUT | `/api/profile` | Обновить профиль |
| POST | `/api/profile/avatar` | Загрузить аватар |
| GET | `/api/profile/stats` | Статистика |
| GET | `/api/profile/memories` | Последние воспоминания |
| | |
| POST | `/api/localities` | Создать населённый пункт |
| GET | `/api/localities?q=` | Поиск своих населённых пунктов |
| GET | `/api/streets?locality_id=&q=` | Поиск улиц |
| POST | `/api/streets` | Создать улицу |
| GET | `/api/buildings?street_id=&q=` | Поиск домов |
| POST | `/api/buildings` | Создать дом |
| GET | `/api/apartments?building_id=&q=` | Поиск квартир |
| POST | `/api/apartments` | Создать квартиру |
| | |
| GET | `/api/settlements/search?q=` | Поиск по каталогу GeoNames (без авторизации) |
| GET | `/api/settlements/nearest?lat=&lng=` | Ближайший населённый пункт к координатам |
| | |
| GET | `/api/family/members` | Список членов семьи |
| POST | `/api/family/members` | Добавить члена семьи |
| DELETE | `/api/family/members/{id}` | Удалить члена семьи |
| | |
| GET | `/api/public/places` | Публичные места (без аутентификации) |
| GET | `/api/public/memories` | Публичные воспоминания |

## Структура проекта

```
malayaRodina/
├── backend/
│   ├── main.py                 # FastAPI приложение
│   ├── database.py             # SQLAlchemy + SQLite (WAL mode)
│   ├── models.py               # ORM модели
│   ├── schemas.py              # Pydantic схемы
│   ├── auth_utils.py           # JWT + bcrypt
│   ├── import_settlements.py   # Импорт GeoNames
│   ├── limiter.py              # Rate limiter (slowapi)
│   ├── requirements.txt
│   ├── routers/
│   │   ├── common.py           # Утилиты: paginate, enrich, can_access
│   │   ├── auth.py             # Регистрация / логин / logout
│   │   ├── places.py           # CRUD мест
│   │   ├── memories.py         # Воспоминания + загрузка медиа
│   │   ├── neighbors.py        # Соседи
│   │   ├── profile.py          # Профиль + аватар
│   │   ├── family.py           # Семейный круг
│   │   ├── public.py           # Публичные эндпоинты
│   │   ├── localities.py       # Населенные пункты
│   │   ├── streets.py          # Улицы
│   │   ├── buildings.py        # Дома
│   │   ├── apartments.py       # Квартиры
│   │   ├── settlements.py      # Поиск по GeoNames
│   │   └── uploads.py          # Раздача загруженных файлов
│   ├── services/
│   │   ├── memory_service.py   # Сборка ответов с медиа
│   │   ├── media_service.py    # Сохранение фото/видео
│   │   ├── text_service.py     # Санитайзинг, извлечение заголовка
│   │   └── ownership.py        # Проверка владельца (get_owned_or_404)
│   ├── tests/
│   │   ├── conftest.py         # Фикстуры (SQLite :memory:, TestClient)
│   │   ├── test_auth.py        # 7 тестов
│   │   ├── test_places.py      # 9 тестов
│   │   └── test_memories.py    # 8 тестов
│   └── uploads/                # Загруженные фото и видео
├── frontend/
│   ├── index.html              # Лендинг
│   ├── vite.config.js          # Vite multi-page config
│   ├── package.json
│   ├── shared/
│   │   ├── api.js              # HTTP-клиент
│   │   └── icons.js            # Иконки типов мест
│   ├── auth/                   # Вход / регистрация
│   ├── map/                    # Карта + создание места
│   ├── add-memory/             # Создание воспоминания
│   ├── place/                  # Детали места
│   ├── memory/                 # Просмотр воспоминания
│   ├── my-places/              # Список мест
│   ├── neighbors/              # Соседи
│   ├── family/                 # Семейный круг
│   └── profile/                # Профиль
├── dist/                       # Сборка Vite (gitignored)
└── README.md
```

## Фичи

- **Иерархия мест:** Населённый пункт → Улица → Дом → Квартира с автопоиском
- **Каталог населённых пунктов:** 202 тыс. записей из GeoNames, поиск по кириллице и латинице
- **Reverse geocoding:** Клик на карте → automatic определение населённого пункта
- **Приватность:** Публичное / Семейный круг / Только я
- **WYSIWYG:** Quill.js для форматирования, XSS-защита (nh3)
- **Сжатие фото:** Pillow — ресайз до 1920px, JPEG quality 85
- **Фильтры карты:** По типу места и периоду
- **Rate limiting:** slowapi (30 запросов/час на создание, 10/мин на логин)
- **Сервисный слой:** Выделенная бизнес-логика в `services/`
- **Тесты:** 24 теста (pytest + httpx, SQLite :memory:)
