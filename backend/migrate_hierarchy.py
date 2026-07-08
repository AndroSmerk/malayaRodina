"""Миграция существующих данных в новую иерархию мест.
Создаёт Locality для каждого существующего Place и связывает их."""

import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "malaya_rodina.db")

if not os.path.exists(db_path):
    print("База данных не найдена. Новая БД создастся автоматически при запуске.")
    exit(0)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Добавляем новые колонки в таблицу places
for col in ['period', 'visibility']:
    try:
        cur.execute(f"ALTER TABLE places ADD COLUMN {col} VARCHAR(100) DEFAULT ''")
        print(f"+ Добавлена колонка {col} в places")
    except sqlite3.OperationalError:
        print(f"~ Колонка {col} уже существует в places")

try:
    cur.execute("ALTER TABLE memories ADD COLUMN visibility VARCHAR(20) DEFAULT 'private'")
    print("+ Добавлена колонка visibility в memories")
except sqlite3.OperationalError:
    print("~ Колонка visibility уже существует в memories")

for col in ['locality_id', 'street_id', 'building_id', 'apartment_id']:
    try:
        cur.execute(f"ALTER TABLE places ADD COLUMN {col} INTEGER")
        print(f"+ Добавлена колонка {col} в places")
    except sqlite3.OperationalError:
        print(f"~ Колонка {col} уже существует в places")

# Создаём Locality для каждого существующего Place
places = cur.execute("SELECT id, name, type, lat, lng, region, user_id FROM places WHERE locality_id IS NULL").fetchall()
for p in places:
    # Проверяем, нет ли уже такой локации
    existing = cur.execute(
        "SELECT id FROM localities WHERE name = ? AND lat = ? AND lng = ? AND user_id = ?",
        (p["name"], p["lat"], p["lng"], p["user_id"])
    ).fetchone()
    if existing:
        locality_id = existing["id"]
    else:
        cur.execute(
            "INSERT INTO localities (name, type, lat, lng, region, user_id) VALUES (?, ?, ?, ?, ?, ?)",
            (p["name"], p["type"], p["lat"], p["lng"], p["region"], p["user_id"])
        )
        locality_id = cur.lastrowid
    cur.execute("UPDATE places SET locality_id = ? WHERE id = ?", (locality_id, p["id"]))

conn.commit()
conn.close()
print(f"\nМиграция завершена. Обработано мест: {len(places)}")
