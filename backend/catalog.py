"""Catalogue officiel Rebrickable (téléchargé une fois) pour enrichir les sets sans clé API."""

from __future__ import annotations

import csv
import gzip
import io
import os
import time
from pathlib import Path
from typing import Any

import httpx

from storage import data_root


def _catalog_dir() -> Path:
    return data_root() / "catalog"
SETS_URL = "https://cdn.rebrickable.com/media/downloads/sets.csv.gz"
INVENTORIES_URL = "https://cdn.rebrickable.com/media/downloads/inventories.csv.gz"
INV_MINIFIGS_URL = "https://cdn.rebrickable.com/media/downloads/inventory_minifigs.csv.gz"
THEMES_URL = "https://cdn.rebrickable.com/media/downloads/themes.csv.gz"
MINIFIGS_URL = "https://cdn.rebrickable.com/media/downloads/minifigs.csv.gz"

# Refresh catalog at most once per day
MAX_AGE_SECONDS = 24 * 60 * 60

_cache: dict[str, dict[str, Any]] | None = None
_cache_loaded_at: float = 0.0
_themes_cache: dict[int, dict[str, Any]] | None = None
_minifigs_cache: list[dict[str, Any]] | None = None


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        resp = client.get(url, headers={"User-Agent": "LEGO-Guessr/1.0"})
        resp.raise_for_status()
        dest.write_bytes(resp.content)


def _needs_refresh(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 100:
        return True
    age = time.time() - path.stat().st_mtime
    return age > MAX_AGE_SECONDS


def ensure_catalog(force: bool = False) -> Path:
    """Télécharge / rafraîchit sets + inventaires + minifigs."""
    catalog_dir = _catalog_dir()
    catalog_dir.mkdir(parents=True, exist_ok=True)
    files = {
        "sets.csv.gz": SETS_URL,
        "inventories.csv.gz": INVENTORIES_URL,
        "inventory_minifigs.csv.gz": INV_MINIFIGS_URL,
        "themes.csv.gz": THEMES_URL,
        "minifigs.csv.gz": MINIFIGS_URL,
    }
    for name, url in files.items():
        path = catalog_dir / name
        if force or _needs_refresh(path):
            _download(url, path)
    return catalog_dir


def _read_gz_csv(path: Path) -> list[dict[str, str]]:
    raw = gzip.decompress(path.read_bytes()).decode("utf-8")
    return list(csv.DictReader(io.StringIO(raw)))


def _build_minifig_counts() -> dict[str, int]:
    catalog_dir = _catalog_dir()
    inv_rows = _read_gz_csv(catalog_dir / "inventories.csv.gz")
    # Keep highest version inventory id per set
    best: dict[str, tuple[int, int]] = {}
    for row in inv_rows:
        set_num = (row.get("set_num") or "").strip()
        if not set_num:
            continue
        try:
            inv_id = int(row["id"])
            version = int(row.get("version") or 1)
        except (KeyError, ValueError):
            continue
        prev = best.get(set_num)
        if prev is None or version >= prev[0]:
            best[set_num] = (version, inv_id)

    inv_to_set = {inv_id: set_num for set_num, (_, inv_id) in best.items()}
    counts: dict[str, int] = {set_num: 0 for set_num in best}

    for row in _read_gz_csv(catalog_dir / "inventory_minifigs.csv.gz"):
        try:
            inv_id = int(row["inventory_id"])
            qty = int(float(row.get("quantity") or 1))
        except (KeyError, ValueError):
            continue
        set_num = inv_to_set.get(inv_id)
        if set_num:
            counts[set_num] = counts.get(set_num, 0) + max(0, qty)
    return counts


def load_catalog(force: bool = False) -> dict[str, dict[str, Any]]:
    """
    Index set_num -> {name, year, num_parts, num_minifigs, set_img_url, set_url, theme_id}.
    """
    global _cache, _cache_loaded_at
    if (
        _cache is not None
        and not force
        and (time.time() - _cache_loaded_at) < MAX_AGE_SECONDS
    ):
        return _cache

    ensure_catalog(force=force)
    minifigs = _build_minifig_counts()
    index: dict[str, dict[str, Any]] = {}

    for row in _read_gz_csv(_catalog_dir() / "sets.csv.gz"):
        set_num = (row.get("set_num") or "").strip()
        if not set_num:
            continue
        img = (row.get("img_url") or "").strip() or None
        if not img:
            img = f"https://cdn.rebrickable.com/media/sets/{set_num.lower()}.jpg"
        try:
            year = int(row["year"]) if row.get("year") else None
        except ValueError:
            year = None
        try:
            num_parts = int(float(row["num_parts"])) if row.get("num_parts") else 0
        except ValueError:
            num_parts = 0
        try:
            theme_id = int(row["theme_id"]) if row.get("theme_id") else None
        except ValueError:
            theme_id = None

        index[set_num.upper()] = {
            "set_num": set_num,
            "name": row.get("name") or set_num,
            "year": year,
            "num_parts": num_parts,
            "num_minifigs": minifigs.get(set_num, 0),
            "set_img_url": img,
            "set_url": f"https://rebrickable.com/sets/{set_num}/",
            "theme_id": theme_id,
            "enriched": 1,
        }

    _cache = index
    _cache_loaded_at = time.time()
    return index


def lookup_set(set_num: str) -> dict[str, Any] | None:
    catalog = load_catalog()
    key = set_num.strip().upper()
    hit = catalog.get(key)
    if hit:
        return dict(hit)
    # try without forcing case on CDN path already handled
    if "-" not in key:
        hit = catalog.get(f"{key}-1")
        if hit:
            return dict(hit)
    return None


def load_themes(force: bool = False) -> dict[int, dict[str, Any]]:
    global _themes_cache
    if _themes_cache is not None and not force:
        return _themes_cache
    ensure_catalog(force=force)
    themes: dict[int, dict[str, Any]] = {}
    for row in _read_gz_csv(_catalog_dir() / "themes.csv.gz"):
        try:
            theme_id = int(row["id"])
        except (KeyError, ValueError):
            continue
        parent = row.get("parent_id")
        try:
            parent_id = int(parent) if parent not in (None, "") else None
        except ValueError:
            parent_id = None
        themes[theme_id] = {
            "id": theme_id,
            "name": row.get("name") or f"Theme {theme_id}",
            "parent_id": parent_id,
        }
    _themes_cache = themes
    return themes


def _theme_lineage_names(
    theme_id: int | None, themes: dict[int, dict[str, Any]]
) -> list[str]:
    if theme_id is None or theme_id not in themes:
        return []
    names: list[str] = []
    current = themes[theme_id]
    seen: set[int] = set()
    while True:
        names.append(str(current.get("name") or "").lower())
        parent_id = current.get("parent_id")
        if parent_id is None or parent_id in seen:
            break
        seen.add(current["id"])
        parent = themes.get(parent_id)
        if not parent:
            break
        current = parent
    return names


def _public_set_card(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "set_num": item["set_num"],
        "name": item.get("name"),
        "year": item.get("year"),
        "num_parts": item.get("num_parts"),
        "num_minifigs": item.get("num_minifigs"),
        "set_img_url": item.get("set_img_url"),
        "set_url": item.get("set_url"),
        "theme_id": item.get("theme_id"),
    }


UNIVERSE_ORDER = ("Star Wars", "Le Seigneur des Anneaux", "Le Hobbit")


def _universe_for_lineage(lineage: list[str]) -> str | None:
    """Assigne un set à un univers via le thème le plus précis (enfant d’abord)."""
    for name in lineage:
        if name == "the hobbit":
            return "Le Hobbit"
        if name == "the lord of the rings":
            return "Le Seigneur des Anneaux"
        if "star wars" in name:
            return "Star Wars"
    return None


def list_universes(limit_per: int = 8) -> list[dict[str, Any]]:
    catalog = load_catalog()
    themes = load_themes()
    buckets: dict[str, list[dict[str, Any]]] = {name: [] for name in UNIVERSE_ORDER}
    for item in catalog.values():
        label = _universe_for_lineage(_theme_lineage_names(item.get("theme_id"), themes))
        if label:
            buckets[label].append(item)
    out: list[dict[str, Any]] = []
    for label in UNIVERSE_ORDER:
        rows = buckets[label]
        rows.sort(key=lambda row: (row.get("year") or 0, row.get("num_parts") or 0), reverse=True)
        out.append(
            {
                "id": label.lower().replace(" ", "-"),
                "name": label,
                "total": len(rows),
                "sets": [_public_set_card(row) for row in rows[:limit_per]],
            }
        )
    return out


def list_latest_sets(limit: int = 12) -> list[dict[str, Any]]:
    import re

    catalog = load_catalog()
    retail = re.compile(r"^\d{3,6}-\d+$")
    rows = [
        row
        for row in catalog.values()
        if retail.match(str(row.get("set_num") or ""))
        and (row.get("num_parts") or 0) > 0
        and row.get("name")
    ]
    rows.sort(
        key=lambda row: (row.get("year") or 0, row.get("num_parts") or 0),
        reverse=True,
    )
    return [_public_set_card(row) for row in rows[:limit]]


_CURATED_MOCS: list[dict[str, Any]] = [
    {
        "set_num": "MOC-184281",
        "name": "UCS Razor Crest (custom)",
        "year": 2024,
        "num_parts": None,
        "set_img_url": "https://cdn.rebrickable.com/media/thumbs/mocs/moc-184281.jpg/1000x800p.jpg",
        "set_url": "https://rebrickable.com/mocs/MOC-184281/",
        "designer": "Rebrickable",
    },
    {
        "set_num": "MOC-169552",
        "name": "Modular Tatooine Street",
        "year": 2024,
        "num_parts": None,
        "set_img_url": "https://cdn.rebrickable.com/media/thumbs/mocs/moc-169552.jpg/1000x800p.jpg",
        "set_url": "https://rebrickable.com/mocs/MOC-169552/",
        "designer": "Rebrickable",
    },
    {
        "set_num": "MOC-175901",
        "name": "Hoth Echo Base diorama",
        "year": 2024,
        "num_parts": None,
        "set_img_url": "https://cdn.rebrickable.com/media/thumbs/mocs/moc-175901.jpg/1000x800p.jpg",
        "set_url": "https://rebrickable.com/mocs/MOC-175901/",
        "designer": "Rebrickable",
    },
    {
        "set_num": "MOC-158440",
        "name": "Rivendell microbuild",
        "year": 2023,
        "num_parts": None,
        "set_img_url": "https://cdn.rebrickable.com/media/thumbs/mocs/moc-158440.jpg/1000x800p.jpg",
        "set_url": "https://rebrickable.com/mocs/MOC-158440/",
        "designer": "Rebrickable",
    },
    {
        "set_num": "MOC-166210",
        "name": "Bag End street",
        "year": 2023,
        "num_parts": None,
        "set_img_url": "https://cdn.rebrickable.com/media/thumbs/mocs/moc-166210.jpg/1000x800p.jpg",
        "set_url": "https://rebrickable.com/mocs/MOC-166210/",
        "designer": "Rebrickable",
    },
    {
        "set_num": "MOC-149877",
        "name": "Mustafar duel scene",
        "year": 2023,
        "num_parts": None,
        "set_img_url": "https://cdn.rebrickable.com/media/thumbs/mocs/moc-149877.jpg/1000x800p.jpg",
        "set_url": "https://rebrickable.com/mocs/MOC-149877/",
        "designer": "Rebrickable",
    },
]


def list_recent_mocs(limit: int = 8, api_key: str | None = None) -> list[dict[str, Any]]:
    """MOCs récents via Rebrickable (clé API) + fallback curaté."""
    key = (api_key or os.getenv("REBRICKABLE_API_KEY") or "").strip()
    if key:
        try:
            with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                resp = client.get(
                    "https://rebrickable.com/api/v3/lego/mocs/",
                    params={"page_size": limit, "ordering": "-year"},
                    headers={
                        "Authorization": f"key {key}",
                        "User-Agent": "LEGO-Guessr/1.0",
                    },
                )
                if resp.status_code < 400:
                    payload = resp.json()
                    results = payload.get("results") if isinstance(payload, dict) else None
                    if isinstance(results, list) and results:
                        mocs: list[dict[str, Any]] = []
                        for row in results[:limit]:
                            set_num = row.get("set_num") or ""
                            img = row.get("moc_img_url") or row.get("img_url")
                            mocs.append(
                                {
                                    "set_num": set_num,
                                    "name": row.get("name") or "MOC",
                                    "year": row.get("year"),
                                    "num_parts": row.get("num_parts"),
                                    "set_img_url": img,
                                    "set_url": row.get("moc_url")
                                    or (
                                        f"https://rebrickable.com/mocs/{set_num}/"
                                        if set_num
                                        else None
                                    ),
                                    "designer": (
                                        row.get("designer_name")
                                        or (
                                            (row.get("designer") or {}).get("name")
                                            if isinstance(row.get("designer"), dict)
                                            else None
                                        )
                                    ),
                                }
                            )
                        if mocs:
                            return mocs
        except Exception:
            pass
    return _CURATED_MOCS[:limit]


def load_minifigs(force: bool = False) -> list[dict[str, Any]]:
    global _minifigs_cache
    if _minifigs_cache is not None and not force:
        return _minifigs_cache
    ensure_catalog(force=force)
    figs: list[dict[str, Any]] = []
    for row in _read_gz_csv(_catalog_dir() / "minifigs.csv.gz"):
        fig_num = (row.get("fig_num") or "").strip()
        name = (row.get("name") or "").strip()
        if not fig_num or not name:
            continue
        img = (row.get("img_url") or "").strip() or None
        if not img:
            img = f"https://cdn.rebrickable.com/media/minifigs/{fig_num.lower()}.jpg"
        try:
            num_parts = int(float(row["num_parts"])) if row.get("num_parts") else 0
        except ValueError:
            num_parts = 0
        figs.append(
            {
                "fig_num": fig_num,
                "name": name,
                "num_parts": num_parts,
                "fig_img_url": img,
                "fig_url": f"https://rebrickable.com/minifigs/{fig_num}/",
            }
        )
    _minifigs_cache = figs
    return figs


def pick_minifig_round(count: int = 4) -> dict[str, Any] | None:
    import random

    pool = [fig for fig in load_minifigs() if fig.get("fig_img_url") and fig.get("name")]
    if len(pool) < count:
        return None
    answer = random.choice(pool)
    others = [fig for fig in pool if fig["fig_num"] != answer["fig_num"]]
    choices = random.sample(others, count - 1) + [answer]
    random.shuffle(choices)
    return {
        "mode": "minifig",
        "answer_fig_num": answer["fig_num"],
        "image": answer.get("fig_img_url"),
        "choices": [
            {
                "fig_num": fig["fig_num"],
                "name": fig["name"],
            }
            for fig in choices
        ],
    }
