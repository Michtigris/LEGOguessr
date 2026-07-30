"""SQLite: listes nommées + cache d'enrichissement Rebrickable."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any

from storage import data_root


def _db_path():
    return data_root() / "sets.db"


def get_connection() -> sqlite3.Connection:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        # Drop legacy single-table schema if present
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        if "sets" in tables and "lists" not in tables:
            conn.execute("DROP TABLE sets")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS lists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS set_cache (
                set_num TEXT PRIMARY KEY,
                name TEXT,
                year INTEGER,
                num_parts INTEGER,
                num_minifigs INTEGER,
                set_img_url TEXT,
                set_url TEXT,
                theme_id INTEGER,
                enriched INTEGER DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS list_sets (
                list_id INTEGER NOT NULL,
                set_num TEXT NOT NULL,
                quantity INTEGER DEFAULT 1,
                PRIMARY KEY (list_id, set_num),
                FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
            """
        )
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_setting(key: str) -> str | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ).fetchone()
    return row["value"] if row else None


def set_setting(key: str, value: str | None) -> None:
    with get_connection() as conn:
        if value is None:
            conn.execute("DELETE FROM settings WHERE key = ?", (key,))
        else:
            conn.execute(
                """
                INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, value),
            )
        conn.commit()


def create_list(name: str) -> dict[str, Any]:
    now = _now()
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO lists (name, created_at, updated_at) VALUES (?, ?, ?)",
            (name.strip(), now, now),
        )
        list_id = cur.lastrowid
        conn.commit()
    return get_list(int(list_id))  # type: ignore[arg-type]


def rename_list(list_id: int, name: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE lists SET name = ?, updated_at = ? WHERE id = ?",
            (name.strip(), _now(), list_id),
        )
        conn.commit()
    return get_list(list_id)


def delete_list(list_id: int) -> bool:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM lists WHERE id = ?", (list_id,))
        conn.commit()
    active = get_setting("active_list_id")
    if active and int(active) == list_id:
        set_setting("active_list_id", None)
    return cur.rowcount > 0


def get_list(list_id: int) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM lists WHERE id = ?", (list_id,)
        ).fetchone()
        if not row:
            return None
        counts = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN c.enriched = 1 THEN 1 ELSE 0 END) AS enriched,
                SUM(CASE WHEN c.enriched IS NULL OR c.enriched = 0 THEN 1 ELSE 0 END) AS pending
            FROM list_sets ls
            LEFT JOIN set_cache c ON c.set_num = ls.set_num
            WHERE ls.list_id = ?
            """,
            (list_id,),
        ).fetchone()
    return {
        "id": row["id"],
        "name": row["name"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "total": int(counts["total"] or 0),
        "enriched": int(counts["enriched"] or 0),
        "pending": int(counts["pending"] or 0),
    }


def list_lists() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id FROM lists ORDER BY updated_at DESC"
        ).fetchall()
    return [get_list(row["id"]) for row in rows]  # type: ignore[misc]


def replace_list_sets(list_id: int, sets: list[dict[str, Any]]) -> dict[str, Any]:
    """Keep list name; replace all set contents. Reuse cached enrichment."""
    if get_list(list_id) is None:
        raise ValueError("Liste introuvable.")

    with get_connection() as conn:
        conn.execute("DELETE FROM list_sets WHERE list_id = ?", (list_id,))
        for item in sets:
            set_num = item["set_num"]
            qty = int(item.get("quantity") or 1)
            conn.execute(
                """
                INSERT INTO list_sets (list_id, set_num, quantity)
                VALUES (?, ?, ?)
                """,
                (list_id, set_num, qty),
            )
            conn.execute(
                """
                INSERT INTO set_cache (set_num, enriched)
                VALUES (?, 0)
                ON CONFLICT(set_num) DO NOTHING
                """,
                (set_num,),
            )
        conn.execute(
            "UPDATE lists SET updated_at = ? WHERE id = ?",
            (_now(), list_id),
        )
        conn.commit()
    return get_list(list_id)  # type: ignore[return-value]


def get_active_list_id() -> int | None:
    raw = get_setting("active_list_id")
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def set_active_list_id(list_id: int | None) -> None:
    if list_id is None:
        set_setting("active_list_id", None)
        return
    if get_list(list_id) is None:
        raise ValueError("Liste introuvable.")
    set_setting("active_list_id", str(list_id))


def list_sets(list_id: int, enriched_only: bool = False) -> list[dict[str, Any]]:
    query = """
        SELECT
            ls.set_num,
            ls.quantity,
            c.name,
            c.year,
            c.num_parts,
            c.num_minifigs,
            c.set_img_url,
            c.set_url,
            c.theme_id,
            COALESCE(c.enriched, 0) AS enriched
        FROM list_sets ls
        LEFT JOIN set_cache c ON c.set_num = ls.set_num
        WHERE ls.list_id = ?
    """
    if enriched_only:
        query += " AND c.enriched = 1"
    query += " ORDER BY ls.set_num"
    with get_connection() as conn:
        rows = conn.execute(query, (list_id,)).fetchall()
    return [dict(row) for row in rows]


def count_sets(list_id: int) -> dict[str, int]:
    info = get_list(list_id)
    if not info:
        return {"total": 0, "enriched": 0, "pending": 0}
    return {
        "total": info["total"],
        "enriched": info["enriched"],
        "pending": info["pending"],
    }


def get_pending_set_nums(list_id: int, limit: int = 50) -> list[str]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT ls.set_num
            FROM list_sets ls
            LEFT JOIN set_cache c ON c.set_num = ls.set_num
            WHERE ls.list_id = ?
              AND (c.enriched IS NULL OR c.enriched = 0)
            ORDER BY ls.set_num
            LIMIT ?
            """,
            (list_id, limit),
        ).fetchall()
    return [row["set_num"] for row in rows]


def get_set(set_num: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM set_cache WHERE set_num = ?", (set_num,)
        ).fetchone()
    return dict(row) if row else None


def upsert_cache(data: dict[str, Any]) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO set_cache (
                set_num, name, year, num_parts, num_minifigs,
                set_img_url, set_url, theme_id, enriched
            ) VALUES (
                :set_num, :name, :year, :num_parts, :num_minifigs,
                :set_img_url, :set_url, :theme_id, :enriched
            )
            ON CONFLICT(set_num) DO UPDATE SET
                name = COALESCE(excluded.name, set_cache.name),
                year = COALESCE(excluded.year, set_cache.year),
                num_parts = COALESCE(excluded.num_parts, set_cache.num_parts),
                num_minifigs = COALESCE(excluded.num_minifigs, set_cache.num_minifigs),
                set_img_url = COALESCE(excluded.set_img_url, set_cache.set_img_url),
                set_url = COALESCE(excluded.set_url, set_cache.set_url),
                theme_id = COALESCE(excluded.theme_id, set_cache.theme_id),
                enriched = MAX(set_cache.enriched, excluded.enriched)
            """,
            data,
        )
        conn.commit()


def force_set_img(set_num: str, set_img_url: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE set_cache SET set_img_url = ? WHERE set_num = ?",
            (set_img_url, set_num),
        )
        conn.commit()
