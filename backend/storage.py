"""Chemins : ressources (UI) vs données persistantes (listes / catalogue)."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False))


def is_serverless() -> bool:
    return bool(
        os.environ.get("VERCEL")
        or os.environ.get("VERCEL_ENV")
        or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
    )


def is_vercel() -> bool:
    return bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"))


def is_desktop() -> bool:
    return is_frozen() or os.environ.get("LEGO_GUESSR_DESKTOP") == "1"


def resource_root() -> Path:
    """Fichiers embarqués (frontend build) — lecture seule dans l'exe."""
    if is_frozen() and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent


def desktop_save_dir() -> Path:
    """
    Sauvegardes locales (listes Excel importées, cache Rebrickable).
    Comme un jeu : survivent même si on remplace l'exe.
    """
    local = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if local:
        return Path(local) / "LEGO Guessr"
    return Path.home() / ".lego-guessr"


def data_root() -> Path:
    """Dossier writable pour SQLite + catalogue + images."""
    override = os.environ.get("DATA_DIR")
    candidates: list[Path] = []
    if override:
        candidates.append(Path(override))
    if is_desktop():
        candidates.append(desktop_save_dir())
    if is_serverless():
        candidates.append(Path("/tmp/lego-guessr"))
    candidates.append(Path(__file__).resolve().parent / "data")
    candidates.append(Path("/tmp/lego-guessr"))

    last_error: OSError | None = None
    for root in candidates:
        try:
            root.mkdir(parents=True, exist_ok=True)
            probe = root / ".write_test"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
            return root
        except OSError as exc:
            last_error = exc
            continue
    raise RuntimeError(f"Aucun dossier de données writable: {last_error}")
