"""Répertoire de données writable (local vs Vercel /tmp)."""

from __future__ import annotations

import os
from pathlib import Path


def data_root() -> Path:
    """Sur Vercel le code est en lecture seule → tout écrire dans /tmp."""
    override = os.environ.get("DATA_DIR")
    if override:
        root = Path(override)
    elif os.environ.get("VERCEL"):
        root = Path("/tmp/lego-guessr")
    else:
        root = Path(__file__).resolve().parent / "data"
    root.mkdir(parents=True, exist_ok=True)
    return root


def is_vercel() -> bool:
    return bool(os.environ.get("VERCEL"))
