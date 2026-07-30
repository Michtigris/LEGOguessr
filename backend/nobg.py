"""Suppression de fond blanc des photos Rebrickable via rembg (local, gratuit)."""

from __future__ import annotations

import os
import re
from pathlib import Path

import httpx

from storage import data_root


def _images_dir() -> Path:
    return data_root() / "images"

_session = None


def _get_session():
    global _session
    if _session is None:
        from rembg import new_session

        _session = new_session("u2net")
    return _session


def safe_filename(set_num: str) -> str:
    return re.sub(r"[^\w.\-]+", "_", set_num.strip()) + ".png"


def image_path(set_num: str) -> Path:
    images = _images_dir()
    images.mkdir(parents=True, exist_ok=True)
    return images / safe_filename(set_num)


def local_media_url(set_num: str) -> str:
    return f"/media/sets/{safe_filename(set_num)}"


def has_transparent(set_num: str) -> bool:
    path = image_path(set_num)
    return path.exists() and path.stat().st_size > 500


def skip_path(set_num: str) -> Path:
    images = _images_dir()
    images.mkdir(parents=True, exist_ok=True)
    return images / (re.sub(r"[^\w.\-]+", "_", set_num.strip()) + ".skip")


def is_skipped(set_num: str) -> bool:
    return skip_path(set_num).exists()


def mark_skipped(set_num: str, reason: str = "failed") -> None:
    skip_path(set_num).write_text(reason, encoding="utf-8")


def process_set_image(set_num: str, source_url: str | None) -> str | None:
    """
    Télécharge l'image Rebrickable, enlève le fond, stocke un PNG transparent.
    Retourne l'URL locale /media/sets/... ou None si échec.
    """
    if os.getenv("ENABLE_NOBG", "1").strip() in {"0", "false", "False", "no"}:
        return None

    if has_transparent(set_num):
        return local_media_url(set_num)
    if is_skipped(set_num):
        return None

    if not source_url:
        source_url = f"https://cdn.rebrickable.com/media/sets/{set_num.lower()}.jpg"

    if source_url.startswith("/media/"):
        return source_url

    try:
        from rembg import remove

        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            resp = client.get(
                source_url,
                headers={"User-Agent": "LEGO-Guessr/1.0"},
            )
            if resp.status_code == 404:
                mark_skipped(set_num, "404")
                return None
            resp.raise_for_status()
            raw = resp.content
            if len(raw) < 200:
                mark_skipped(set_num, "empty")
                return None

        out = remove(raw, session=_get_session())
        dest = image_path(set_num)
        dest.write_bytes(out)
        return local_media_url(set_num)
    except Exception as exc:  # noqa: BLE001
        mark_skipped(set_num, str(exc)[:200])
        return None
