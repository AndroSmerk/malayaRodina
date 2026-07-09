"""
Import Russian settlements from GeoNames.org into settlement_catalog table.

Downloads: http://download.geonames.org/export/dump/RU.zip
"""

import csv
import io
import os
import re
import sqlite3
import sys
import urllib.request
import zipfile

CYRILLIC_RE = re.compile(r'[\u0400-\u04FF]')
RUSSIAN_OK = set('абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ -\'')

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(os.path.dirname(__file__), "malaya_rodina.db")
GEONAMES_URL = "https://download.geonames.org/export/dump/RU.zip"
ADMIN1_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt"

REGION_RU = {
    "Adygeya Republic": "Республика Адыгея",
    "Altai": "Республика Алтай",
    "Altai Krai": "Алтайский край",
    "Amur Oblast": "Амурская область",
    "Arkhangelskaya": "Архангельская область",
    "Astrakhan Oblast": "Астраханская область",
    "Bashkortostan Republic": "Республика Башкортостан",
    "Belgorod Oblast": "Белгородская область",
    "Bryansk Oblast": "Брянская область",
    "Buryatiya Republic": "Республика Бурятия",
    "Chechnya": "Чеченская Республика",
    "Chelyabinsk": "Челябинская область",
    "Chukotka": "Чукотский АО",
    "Chuvash Republic": "Чувашская Республика",
    "Dagestan": "Республика Дагестан",
    "Ingushetiya Republic": "Республика Ингушетия",
    "Irkutsk Oblast": "Иркутская область",
    "Ivanovo Oblast": "Ивановская область",
    "Jewish Autonomous Oblast": "Еврейская АО",
    "Kabardino-Balkariya Republic": "Кабардино-Балкарская Республика",
    "Kaliningrad Oblast": "Калининградская область",
    "Kalmykiya Republic": "Республика Калмыкия",
    "Kaluga Oblast": "Калужская область",
    "Kamchatka": "Камчатский край",
    "Karachayevo-Cherkesiya Republic": "Карачаево-Черкесская Республика",
    "Karelia": "Республика Карелия",
    "Khabarovsk": "Хабаровский край",
    "Khakasiya Republic": "Республика Хакасия",
    "Khanty-Mansia": "Ханты-Мансийский АО",
    "Kirov Oblast": "Кировская область",
    "Komi": "Республика Коми",
    "Kostroma Oblast": "Костромская область",
    "Krasnodar Krai": "Краснодарский край",
    "Krasnoyarsk Krai": "Красноярский край",
    "Kurgan Oblast": "Курганская область",
    "Kursk Oblast": "Курская область",
    "Kuzbass": "Кемеровская область",
    "Leningradskaya Oblast'": "Ленинградская область",
    "Lipetsk Oblast": "Липецкая область",
    "Magadan Oblast": "Магаданская область",
    "Mariy-El Republic": "Республика Марий Эл",
    "Mordoviya Republic": "Республика Мордовия",
    "Moscow": "Москва",
    "Moscow Oblast": "Московская область",
    "Murmansk": "Мурманская область",
    "Nenets": "Ненецкий АО",
    "Nizhny Novgorod Oblast": "Нижегородская область",
    "North Ossetia–Alania": "Северная Осетия — Алания",
    "Novgorod Oblast": "Новгородская область",
    "Novosibirsk Oblast": "Новосибирская область",
    "Omsk Oblast": "Омская область",
    "Orenburg Oblast": "Оренбургская область",
    "Oryol oblast": "Орловская область",
    "Penza Oblast": "Пензенская область",
    "Perm Krai": "Пермский край",
    "Primorye": "Приморский край",
    "Pskov Oblast": "Псковская область",
    "Republic of Tyva": "Республика Тыва",
    "Rostov": "Ростовская область",
    "Ryazan Oblast": "Рязанская область",
    "Sakha": "Республика Саха (Якутия)",
    "Sakhalin Oblast": "Сахалинская область",
    "Samara Oblast": "Самарская область",
    "Saratov Oblast": "Саратовская область",
    "Smolensk Oblast": "Смоленская область",
    "St.-Petersburg": "Санкт-Петербург",
    "Stavropol Kray": "Ставропольский край",
    "Sverdlovsk Oblast": "Свердловская область",
    "Tambov Oblast": "Тамбовская область",
    "Tatarstan Republic": "Республика Татарстан",
    "Tomsk Oblast": "Томская область",
    "Tula Oblast": "Тульская область",
    "Tver Oblast": "Тверская область",
    "Tyumen Oblast": "Тюменская область",
    "Udmurtiya Republic": "Удмуртская Республика",
    "Ulyanovsk": "Ульяновская область",
    "Vladimir Oblast": "Владимирская область",
    "Volgograd Oblast": "Волгоградская область",
    "Vologda Oblast": "Вологодская область",
    "Voronezh Oblast": "Воронежская область",
    "Yamalo-Nenets": "Ямало-Ненецкий АО",
    "Yaroslavl Oblast": "Ярославская область",
    "Zabaykalskiy (Transbaikal) Kray": "Забайкальский край",
}

FEATURE_TYPE_MAP = {
    "PPLC": "city",
    "PPLA": "city",
    "PPLA2": "town",
    "PPLA3": "town",
    "PPLA4": "town",
    "PPLG": "town",
    "PPL2": "town",
    "PPL": "village",
    "PPLL": "village",
    "PPLS": "village",
    "PPLW": "village",
    "PPLQ": "village",
    "PPLR": "village",
    "PPLX": "district",
    "STLMT": "house",
}

CITY_SUFFIXES = (
    "град", "город", "бург", "поль", "полис",
    "штадт", "берг", "ханск", "яр", "цк",
)


def name_is_likely_city(name):
    name_lower = name.lower()
    for s in CITY_SUFFIXES:
        if name_lower.endswith(s):
            return True
    return False


def check_zip(path):
    """Проверяет, что файл — валидный ZIP и содержит RU.txt."""
    try:
        with zipfile.ZipFile(path) as zf:
            if 'RU.txt' not in zf.namelist():
                return False
            bad = zf.testzip()
            if bad:
                print(f"  ⚠ Повреждённый файл в zip: {bad}")
                return False
            return True
    except (zipfile.BadZipFile, zipfile.LargeZipFile):
        return False


def download(url, dest, timeout=120):
    print(f"  Скачивание {url}...")
    sys.stdout.flush()
    tmp = dest + ".tmp"
    req = urllib.request.Request(url, headers={"User-Agent": "MalayaRodina/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            total = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            chunk_size = 65536
            with open(tmp, "wb") as f:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded * 100 // total
                        print(f"\r  {downloaded // 1024}K / {total // 1024}K ({pct}%)", end="", flush=True)
                    else:
                        print(f"\r  {downloaded // 1024}K", end="", flush=True)
        os.replace(tmp, dest)
        print(f"\n  → {dest}")
        sys.stdout.flush()
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


TRANS_TABLE = str.maketrans({
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
    'Ж': 'ZH', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'KH', 'Ц': 'TS', 'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SHCH',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'YU', 'Я': 'YA',
})


def transliterate(text):
    return text.translate(TRANS_TABLE)


def extract_russian_name(alternames, ascii_name):
    if not alternames:
        return None
    candidates = []
    for alt in alternames.split(","):
        alt = alt.strip()
        if not alt or not CYRILLIC_RE.search(alt):
            continue
        if all(c in RUSSIAN_OK for c in alt):
            candidates.append(alt)
    if not candidates:
        return None
    ascii_lower = ascii_name.lower()
    best = None
    best_prefix = -1
    for c in candidates:
        tl = transliterate(c).lower()
        prefix = 0
        for a, b in zip(tl, ascii_lower):
            if a == b:
                prefix += 1
            else:
                break
        if prefix > best_prefix or (prefix == best_prefix and best and len(c) < len(best)):
            best_prefix = prefix
            best = c
    return best or candidates[0]


def load_admin1():
    path = os.path.join(DATA_DIR, "admin1CodesASCII.txt")
    mapping = {}
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) >= 2:
                mapping[parts[0]] = parts[1]
    return mapping


def needs_import():
    if not os.path.exists(DB_PATH):
        return True
    try:
        conn = sqlite3.connect(DB_PATH)
        count = conn.execute("SELECT COUNT(*) FROM settlement_catalog").fetchone()[0]
        conn.close()
        return count == 0
    except Exception:
        return True


def run():
    os.makedirs(DATA_DIR, exist_ok=True)

    zip_path = os.path.join(DATA_DIR, "RU.zip")
    txt_path = os.path.join(DATA_DIR, "RU.txt")
    admin1_path = os.path.join(DATA_DIR, "admin1CodesASCII.txt")

    # Download / validate RU.zip
    if os.path.exists(zip_path) and not check_zip(zip_path):
        print("  ⚠ RU.zip повреждён, удаляю и качаю заново...")
        os.remove(zip_path)
        if os.path.exists(txt_path):
            os.remove(txt_path)

    if not os.path.exists(zip_path):
        try:
            download(GEONAMES_URL, zip_path, timeout=180)
        except Exception as e:
            print(f"  ⚠ Не удалось скачать RU.zip: {e}")
            return
        if not check_zip(zip_path):
            print(f"  ⚠ Скачанный файл не является ZIP-архивом")
            if os.path.exists(zip_path):
                os.remove(zip_path)
            return

    if not os.path.exists(admin1_path):
        try:
            download(ADMIN1_URL, admin1_path)
        except Exception as e:
            print(f"  ⚠ Не удалось скачать admin1CodesASCII.txt: {e}")
            return

    # Extract zip
    if not os.path.exists(txt_path):
        print("  Распаковка RU.zip...")
        sys.stdout.flush()
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extract("RU.txt", DATA_DIR)

    # Load admin1 mapping
    admin1_map = load_admin1()

    # Parse RU.txt
    print("  Чтение RU.txt...")
    rows = []
    skipped = 0
    with open(txt_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if len(row) < 19:
                skipped += 1
                continue
            feature_class = row[6]
            feature_code = row[7]
            if feature_class != "P":
                skipped += 1
                continue
            code = feature_code
            if code not in FEATURE_TYPE_MAP:
                skipped += 1
                continue

            name = row[1]
            if not name:
                skipped += 1
                continue

            # Use Russian name from alternatenames when available
            ru_name = extract_russian_name(row[3], row[1]) or ""

            typename = FEATURE_TYPE_MAP[code]
            lat = float(row[4]) if row[4] else 0
            lng = float(row[5]) if row[5] else 0
            population = int(row[14]) if row[14] else 0

            # Upgrade based on population and name heuristics
            if code == "PPL":
                if population >= 50000:
                    typename = "city"
                elif population >= 3000:
                    typename = "town"
                else:
                    typename = "village"
                if name_is_likely_city(name) and population >= 3000:
                    typename = "city"
            elif code in ("PPLA2", "PPLA3", "PPLA4", "PPLG", "PPL2") and population >= 50000:
                typename = "city"

            admin1_code = f"RU.{row[10]}"
            region = admin1_map.get(admin1_code, row[10] or "")
            region_ru = REGION_RU.get(region, "")

            rows.append((name, ru_name, typename, region, region_ru, lat, lng, population))

    # Connect to SQLite directly (fast bulk insert)
    print(f"  Импорт {len(rows)} записей в БД...")
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=off")
    conn.execute("PRAGMA synchronous=off")

    # Drop and recreate table
    conn.execute("DROP TABLE IF EXISTS settlement_catalog")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS settlement_catalog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            name_ru TEXT DEFAULT '',
            type TEXT NOT NULL,
            region TEXT DEFAULT '',
            region_ru TEXT DEFAULT '',
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            population INTEGER DEFAULT 0
        )
    """)

    conn.executemany(
        "INSERT INTO settlement_catalog (name, name_ru, type, region, region_ru, lat, lng, population) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rows,
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_settlement_name ON settlement_catalog(name)")
    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.close()

    print(f"  ✓ Импортировано {len(rows)} населённых пунктов")
    if skipped:
        print(f"  Пропущено {skipped} записей")


if __name__ == "__main__":
    run()
