"""Répertoire de données writable (local vs serverless /tmp)."""

from __future__ import annotations

import os
from pathlib import Path


def is_serverless() -> bool:
    return bool(
        os.environ.get("VERCEL")
        or os.environ.get("VERCEL_ENV")
        or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
    )


def is_vercel() -> bool:
    return bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"))


def data_root() -> Path:
    """Sur Vercel le code est en lecture seule → écrire dans /tmp."""
    override = os.environ.get("DATA_DIR")
    candidates: list[Path] = []
    if override:
        candidates.append(Path(override))
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
