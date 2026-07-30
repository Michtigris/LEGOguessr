"""Catalogue officiel Rebrickable (téléchargé une fois) pour enrichir les sets sans clé API."""

from __future__ import annotations

import csv
import gzip
import io
import time
from pathlib import Path
from typing import Any

import httpx

from storage import data_root


def _catalog_dir() -> Path:
    return data_root() / "catalog"
SETS_URL = "https://cdn.rebrickable.com/media/downloads/sets.csv.gz"
INVENTORIES_URL = "https://cdn.rebrickable.com/media/downloads/inventories.csv.gz"
MINIFIGS_URL = "https://cdn.rebrickable.com/media/downloads/inventory_minifigs.csv.gz"

# Refresh catalog at most once per day
MAX_AGE_SECONDS = 24 * 60 * 60

_cache: dict[str, dict[str, Any]] | None = None
_cache_loaded_at: float = 0.0


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
        "inventory_minifigs.csv.gz": MINIFIGS_URL,
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
