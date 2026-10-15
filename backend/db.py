"""SQLite: listes nommées + cache d'enrichissement Rebrickable."""

from __future__ import annotations

import re
import sqlite3
from contextvars import ContextVar, Token
from datetime import datetime, timezone
from typing import Any

from storage import data_root, is_vercel

_session: ContextVar[str] = ContextVar("lego_session", default="local")
_SESSION_RE = re.compile(r"^[A-Za-z0-9_-]{16,80}$")


def current_session() -> str:
    return _session.get()


def push_session(session_id: str) -> Token[str]:
    return _session.set(session_id)


def pop_session(token: Token[str]) -> None:
    _session.reset(token)


def valid_session_id(value: str) -> bool:
    return bool(_SESSION_RE.fullmatch(value or ""))


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
        columns = {
            row[1] for row in conn.execute("PRAGMA table_info(lists)").fetchall()
        }
        if "session_id" not in columns:
            conn.execute("ALTER TABLE lists ADD COLUMN session_id TEXT")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_lists_session ON lists(session_id)"
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


def session_revision() -> int:
    raw = get_setting(f"rev:{current_session()}") or "0"
    try:
        return max(0, int(raw))
    except ValueError:
        return 0


def _bump_revision() -> int:
    nxt = session_revision() + 1
    set_setting(f"rev:{current_session()}", str(nxt))
    return nxt


def bump_revision() -> int:
    return _bump_revision()


def adopt_orphan_lists() -> None:
    """Sur un PC local, les anciennes listes sans propriétaire restent à cet utilisateur."""
    if is_vercel():
        return
    sid = current_session()
    with get_connection() as conn:
        cur = conn.execute(
            """
            UPDATE lists
            SET session_id = ?
            WHERE session_id IS NULL OR session_id = ''
            """,
            (sid,),
        )
        conn.commit()
        adopted = cur.rowcount > 0
    if not adopted or get_setting(f"active:{sid}"):
        return
    legacy = get_setting("active_list_id")
    if legacy:
        set_setting(f"active:{sid}", legacy)


def create_list(name: str, *, bump: bool = True) -> dict[str, Any]:
    now = _now()
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO lists (name, created_at, updated_at, session_id)
            VALUES (?, ?, ?, ?)
            """,
            (name.strip(), now, now, current_session()),
        )
        list_id = cur.lastrowid
        conn.commit()
    if bump:
        _bump_revision()
    return get_list(int(list_id))  # type: ignore[arg-type]


def rename_list(list_id: int, name: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        cur = conn.execute(
            """
            UPDATE lists
            SET name = ?, updated_at = ?
            WHERE id = ? AND session_id = ?
            """,
            (name.strip(), _now(), list_id, current_session()),
        )
        conn.commit()
        changed = cur.rowcount > 0
    if not changed:
        return None
    _bump_revision()
    return get_list(list_id)


def delete_list(list_id: int) -> bool:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM lists WHERE id = ? AND session_id = ?",
            (list_id, current_session()),
        )
        conn.commit()
        deleted = cur.rowcount > 0
    if not deleted:
        return False
    if get_setting(f"active:{current_session()}") == str(list_id):
        set_setting(f"active:{current_session()}", None)
    _bump_revision()
    return True


def get_list(list_id: int) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM lists WHERE id = ? AND session_id = ?",
            (list_id, current_session()),
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
            """
            SELECT id FROM lists
            WHERE session_id = ?
            ORDER BY updated_at DESC
            """,
            (current_session(),),
        ).fetchall()
    return [info for row in rows if (info := get_list(row["id"]))]


def replace_list_sets(
    list_id: int,
    sets: list[dict[str, Any]],
    *,
    bump: bool = True,
) -> dict[str, Any]:
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
            "UPDATE lists SET updated_at = ? WHERE id = ? AND session_id = ?",
            (_now(), list_id, current_session()),
        )
        conn.commit()
    if bump:
        _bump_revision()
    return get_list(list_id)  # type: ignore[return-value]


def get_active_list_id() -> int | None:
    raw = get_setting(f"active:{current_session()}")
    if not raw and current_session() == "local":
        raw = get_setting("active_list_id")
    if not raw:
        return None
    try:
        list_id = int(raw)
    except ValueError:
        return None
    if get_list(list_id) is None:
        return None
    return list_id


def set_active_list_id(list_id: int | None, *, bump: bool = True) -> None:
    key = f"active:{current_session()}"
    if list_id is None:
        set_setting(key, None)
        if bump:
            _bump_revision()
        return
    if get_list(list_id) is None:
        raise ValueError("Liste introuvable.")
    set_setting(key, str(list_id))
    if bump:
        _bump_revision()


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


def _public_img(set_num: str, url: str | None) -> str | None:
    if not url:
        return None
    if not str(url).startswith("/media/"):
        return url
    local = data_root() / "images" / str(url).rsplit("/", 1)[-1]
    if local.is_file():
        return url
    return f"https://cdn.rebrickable.com/media/sets/{set_num.lower()}.jpg"


def export_snapshot() -> dict[str, Any]:
    active = get_active_list_id()
    lists: list[dict[str, Any]] = []
    for info in list_lists():
        sets = []
        for row in list_sets(info["id"]):
            set_num = row["set_num"]
            sets.append(
                {
                    "set_num": set_num,
                    "quantity": int(row.get("quantity") or 1),
                    "name": row.get("name"),
                    "year": row.get("year"),
                    "num_parts": row.get("num_parts"),
                    "num_minifigs": row.get("num_minifigs"),
                    "set_img_url": _public_img(set_num, row.get("set_img_url")),
                    "set_url": row.get("set_url"),
                    "enriched": int(row.get("enriched") or 0),
                }
            )
        lists.append(
            {
                "name": info["name"],
                "active": info["id"] == active,
                "sets": sets,
            }
        )
    return {
        "version": 1,
        "revision": session_revision(),
        "lists": lists,
    }


def import_snapshot(payload: dict[str, Any]) -> None:
    """Remplace les listes de cette session par une archive déjà connue."""
    sid = current_session()
    incoming = payload.get("lists") or []
    if not isinstance(incoming, list):
        raise ValueError("Archive invalide.")
    if len(incoming) > 80:
        raise ValueError("Trop de listes dans l'archive.")
    total_sets = 0
    for item in incoming:
        total_sets += len(item.get("sets") or [])
    if total_sets > 20000:
        raise ValueError("Trop de sets dans l'archive.")

    with get_connection() as conn:
        conn.execute("DELETE FROM lists WHERE session_id = ?", (sid,))
        conn.commit()
    set_setting(f"active:{sid}", None)

    active_id: int | None = None
    for item in incoming:
        name = str(item.get("name") or "").strip() or "Liste"
        created = create_list(name[:80], bump=False)
        parsed = []
        for raw in item.get("sets") or []:
            set_num = str(raw.get("set_num") or "").strip()
            if not set_num or len(set_num) > 32:
                continue
            qty = raw.get("quantity") or 1
            try:
                qty = max(1, int(qty))
            except (TypeError, ValueError):
                qty = 1
            parsed.append({"set_num": set_num, "quantity": qty})
            img = _public_img(set_num, raw.get("set_img_url"))
            if raw.get("name") or raw.get("year") is not None or img or raw.get("enriched"):
                upsert_cache(
                    {
                        "set_num": set_num,
                        "name": raw.get("name"),
                        "year": raw.get("year"),
                        "num_parts": raw.get("num_parts"),
                        "num_minifigs": raw.get("num_minifigs"),
                        "set_img_url": img,
                        "set_url": raw.get("set_url"),
                        "theme_id": None,
                        "enriched": 1 if raw.get("enriched") else 0,
                    }
                )
        if parsed:
            replace_list_sets(created["id"], parsed, bump=False)
        if item.get("active"):
            active_id = created["id"]
    if active_id is not None:
        set_active_list_id(active_id, bump=False)
    try:
        revision = max(1, int(payload.get("revision") or 1))
    except (TypeError, ValueError):
        revision = 1
    set_setting(f"rev:{sid}", str(revision))
