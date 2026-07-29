"""LEGO Guessr API — listes multiples + 2 modes de jeu."""

from __future__ import annotations

import os
import random
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from openpyxl import Workbook
from pydantic import BaseModel, Field

import db
from catalog import lookup_set, load_catalog
from game import make_clues, pick_choices, public_set, weighted_choices
from nobg import has_transparent, is_skipped, local_media_url, process_set_image
from rebrickable import RebrickableClient, parse_sets_file

load_dotenv(Path(__file__).resolve().parent / ".env")

IMAGES_DIR = Path(__file__).resolve().parent / "data" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)


def enrich_list_from_catalog(list_id: int, force: bool = False) -> dict[str, Any]:
    """Remplit nom / année / pièces / figs / photo via le catalogue Rebrickable."""
    load_catalog()
    if force:
        pending = [s["set_num"] for s in db.list_sets(list_id)]
    else:
        # Aussi retraiter les "Inconnu" / sans année
        pending = db.get_pending_set_nums(list_id, limit=100_000)
        for row in db.list_sets(list_id, enriched_only=True):
            name = row.get("name") or ""
            if row.get("year") is None or name.startswith("Inconnu"):
                if row["set_num"] not in pending:
                    pending.append(row["set_num"])

    processed = 0
    missing: list[str] = []
    for set_num in pending:
        data = lookup_set(set_num)
        if data:
            db.upsert_cache(data)
            processed += 1
        else:
            missing.append(set_num)
            db.upsert_cache(
                {
                    "set_num": set_num,
                    "name": f"Inconnu ({set_num})",
                    "year": None,
                    "num_parts": 0,
                    "num_minifigs": 0,
                    "set_img_url": (
                        f"https://cdn.rebrickable.com/media/sets/{set_num.lower()}.jpg"
                    ),
                    "set_url": f"https://rebrickable.com/sets/{set_num}/",
                    "theme_id": None,
                    "enriched": 1,
                }
            )
    return {
        "processed": processed,
        "missing": missing[:20],
        "missing_count": len(missing),
    }


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    # Précharge le catalogue Rebrickable en arrière-plan au démarrage
    try:
        load_catalog()
    except Exception:  # noqa: BLE001
        pass
    yield


app = FastAPI(title="LEGO Guessr", version="1.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media/sets", StaticFiles(directory=str(IMAGES_DIR)), name="set_images")

# Frontend build (Vite) — servi en production depuis le même serveur
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=str(FRONTEND_DIST / "assets")),
        name="frontend_assets",
    )
    # Public static (fonds prélogie, favicon)
    public_dir = Path(__file__).resolve().parent.parent / "frontend" / "public"
    if public_dir.is_dir():
        bg_dir = public_dir / "bg"
        if bg_dir.is_dir():
            app.mount("/bg", StaticFiles(directory=str(bg_dir)), name="bg_images")


def apply_nobg_batch(list_id: int, batch_size: int = 8) -> dict[str, Any]:
    """Traite un lot de photos : fond blanc → PNG transparent local."""
    # Relie les PNG déjà générés au cache DB
    for s in db.list_sets(list_id):
        if has_transparent(s["set_num"]) and not str(s.get("set_img_url") or "").startswith(
            "/media/"
        ):
            db.force_set_img(s["set_num"], local_media_url(s["set_num"]))

    pending = [
        s
        for s in db.list_sets(list_id)
        if s.get("set_img_url")
        and not has_transparent(s["set_num"])
        and not is_skipped(s["set_num"])
        and not str(s.get("set_img_url") or "").startswith("/media/")
    ]
    # Prefer "real looking" set nums (not padded catalog junk) first
    pending.sort(key=lambda s: (s["set_num"].startswith("000"), s["set_num"]))
    done = 0
    errors: list[dict[str, str]] = []
    for row in pending[: max(1, min(batch_size, 20))]:
        set_num = row["set_num"]
        source = row.get("set_img_url")
        result = process_set_image(set_num, source)
        if result:
            db.force_set_img(set_num, result)
            done += 1
        else:
            errors.append({"set_num": set_num, "error": "nobg failed / skipped"})

    remaining = sum(
        1
        for s in db.list_sets(list_id)
        if s.get("set_img_url")
        and not has_transparent(s["set_num"])
        and not is_skipped(s["set_num"])
        and not str(s.get("set_img_url") or "").startswith("/media/")
    )
    return {
        "processed": done,
        "remaining": remaining,
        "errors": errors,
        **db.count_sets(list_id),
    }


class GuessBody(BaseModel):
    answer_set_num: str
    guess_set_num: str


class CreateListBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class RenameListBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class SelectListBody(BaseModel):
    list_id: int


def resolve_api_key(x_api_key: str | None) -> str:
    key = (x_api_key or "").strip() or os.getenv("REBRICKABLE_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=400,
            detail=(
                "Clé API Rebrickable requise. "
                "Ajoute-la dans le panneau des listes."
            ),
        )
    return key


def require_active_list() -> int:
    list_id = db.get_active_list_id()
    if list_id is None:
        raise HTTPException(
            status_code=400,
            detail="Aucune liste sélectionnée. Ouvre l’icône listes pour en choisir une.",
        )
    info = db.get_list(list_id)
    if info is None:
        raise HTTPException(status_code=400, detail="Liste active introuvable.")
    return list_id


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/lists")
def get_lists() -> dict[str, Any]:
    lists = db.list_lists()
    active = db.get_active_list_id()
    active_info = db.get_list(active) if active else None
    return {"lists": lists, "active_list_id": active, "active": active_info}


@app.post("/api/lists")
async def create_list(
    name: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, Any]:
    raw = await file.read()
    try:
        parsed = parse_sets_file(raw, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de lire le fichier : {exc}",
        ) from exc

    created = db.create_list(name)
    info = db.replace_list_sets(created["id"], parsed)
    db.set_active_list_id(info["id"])
    enrich = enrich_list_from_catalog(info["id"])
    info = db.get_list(info["id"])
    return {
        "list": info,
        "imported": len(parsed),
        "enrich": enrich,
        **get_lists(),
    }


@app.patch("/api/lists/{list_id}")
def rename_list(list_id: int, body: RenameListBody) -> dict[str, Any]:
    info = db.rename_list(list_id, body.name)
    if not info:
        raise HTTPException(status_code=404, detail="Liste introuvable.")
    return {"list": info, **get_lists()}


@app.post("/api/lists/{list_id}/update")
async def update_list_file(
    list_id: int,
    file: UploadFile = File(...),
) -> dict[str, Any]:
    if db.get_list(list_id) is None:
        raise HTTPException(status_code=404, detail="Liste introuvable.")
    raw = await file.read()
    try:
        parsed = parse_sets_file(raw, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de lire le fichier : {exc}",
        ) from exc
    info = db.replace_list_sets(list_id, parsed)
    db.set_active_list_id(list_id)
    enrich = enrich_list_from_catalog(list_id)
    info = db.get_list(list_id)
    return {
        "list": info,
        "imported": len(parsed),
        "enrich": enrich,
        **get_lists(),
    }


@app.delete("/api/lists/{list_id}")
def delete_list(list_id: int) -> dict[str, Any]:
    if not db.delete_list(list_id):
        raise HTTPException(status_code=404, detail="Liste introuvable.")
    # Auto-select another list if any remain
    remaining = db.list_lists()
    if remaining and db.get_active_list_id() is None:
        db.set_active_list_id(remaining[0]["id"])
    return get_lists()


@app.post("/api/lists/select")
def select_list(body: SelectListBody) -> dict[str, Any]:
    try:
        db.set_active_list_id(body.list_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return get_lists()


@app.get("/api/stats")
def stats() -> dict[str, Any]:
    list_id = db.get_active_list_id()
    if list_id is None:
        return {
            "total": 0,
            "enriched": 0,
            "pending": 0,
            "active_list_id": None,
            "active": None,
        }
    return {**db.count_sets(list_id), "active_list_id": list_id, "active": db.get_list(list_id)}


@app.post("/api/enrich")
async def enrich_sets(
    batch_size: int = 20,
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """Enrichit via le catalogue Rebrickable (pas besoin de clé).
    Si une clé API est fournie, complète les manquants via l'API live.
    """
    list_id = require_active_list()
    enrich = enrich_list_from_catalog(list_id)

    # Optional live API pass for sets still incomplete / missing from catalog
    api_key = (x_api_key or "").strip() or os.getenv("REBRICKABLE_API_KEY", "").strip()
    api_errors: list[dict[str, str]] = []
    api_processed = 0
    if api_key and enrich.get("missing_count"):
        client = RebrickableClient(api_key)
        for set_num in enrich.get("missing", [])[: max(1, min(batch_size, 50))]:
            try:
                data = await client.fetch_set(set_num)
                db.upsert_cache(data)
                api_processed += 1
            except Exception as exc:  # noqa: BLE001
                api_errors.append({"set_num": set_num, "error": str(exc)})

    return {
        "processed": enrich["processed"] + api_processed,
        "missing_count": enrich.get("missing_count", 0),
        "errors": api_errors,
        **stats(),
    }


@app.post("/api/nobg")
def remove_backgrounds(batch_size: int = 8) -> dict[str, Any]:
    """Enlève le fond blanc des photos (rembg) et les met en cache PNG."""
    list_id = require_active_list()
    try:
        result = apply_nobg_batch(list_id, batch_size=batch_size)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"Échec rembg : {exc}. Vérifie que rembg[cpu] est installé.",
        ) from exc
    return {**result, "active_list_id": list_id, "active": db.get_list(list_id)}


@app.get("/api/nobg/status")
def nobg_status() -> dict[str, Any]:
    list_id = require_active_list()
    sets = db.list_sets(list_id)
    transparent = sum(1 for s in sets if has_transparent(s["set_num"]))
    with_img = sum(1 for s in sets if s.get("set_img_url"))
    return {
        "total": len(sets),
        "with_image": with_img,
        "transparent": transparent,
        "pending": max(0, with_img - transparent),
    }


@app.get("/api/export/excel")
def export_excel() -> FileResponse:
    list_id = require_active_list()
    sets = db.list_sets(list_id)
    if not sets:
        raise HTTPException(status_code=400, detail="Aucun set à exporter.")

    active = db.get_list(list_id)
    out_dir = Path(__file__).resolve().parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    safe_name = "".join(
        c if c.isalnum() or c in "-_" else "_" for c in (active["name"] if active else "liste")
    )
    out_path = out_dir / f"{safe_name}.xlsx"

    wb = Workbook()
    ws = wb.active
    ws.title = "Sets"
    headers = [
        "set_num",
        "name",
        "year",
        "num_parts",
        "num_minifigs",
        "quantity",
        "set_img_url",
        "set_url",
        "enriched",
    ]
    ws.append(headers)
    for row in sets:
        ws.append([row.get(h) for h in headers])
    wb.save(out_path)

    return FileResponse(
        out_path,
        filename=f"{safe_name}.xlsx",
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
    )


@app.post("/api/game/guess")
def start_guess_mode() -> dict[str, Any]:
    """Guess: sets uniques, proba égale (la quantité ne compte pas)."""
    list_id = require_active_list()
    pool = [
        s
        for s in db.list_sets(list_id, enriched_only=True)
        if s.get("year") is not None and s.get("name")
    ]
    if len(pool) < 4:
        raise HTTPException(
            status_code=400,
            detail=(
                "Il faut au moins 4 sets enrichis dans la liste active. "
                "Mets à jour / enrichis ta liste d’abord."
            ),
        )

    # Uniform among unique set_nums (ignore quantity)
    answer = random.choice(pool)
    clues = make_clues(answer)
    choices = pick_choices(answer, pool, count=8)
    name = answer.get("name") or ""
    return {
        "mode": "guess",
        "clues": clues,
        "choices": [
            {
                "set_num": c["set_num"],
                "name": c["name"],
                "set_img_url": c.get("set_img_url"),
            }
            for c in choices
        ],
        "answer_set_num": answer["set_num"],
        "bonuses": {
            "letter": (name[:1] or "?").upper(),
            "year_exact": answer.get("year"),
            "parts_exact": answer.get("num_parts"),
            "figs_exact": answer.get("num_minifigs"),
            "peek_img": answer.get("set_img_url"),
        },
        "bonus_credits": 2,
    }


@app.post("/api/game/guess/check")
def check_guess(body: GuessBody) -> dict[str, Any]:
    answer = db.get_set(body.answer_set_num)
    if not answer or not answer.get("enriched"):
        raise HTTPException(status_code=404, detail="Set réponse introuvable.")
    correct = body.guess_set_num == body.answer_set_num
    return {
        "correct": correct,
        "answer": public_set(answer),
        "guess_set_num": body.guess_set_num,
    }


@app.post("/api/game/wheel")
def start_wheel_mode() -> dict[str, Any]:
    """Roue: tirage pondéré par quantité (2 copies → 2× plus de chances)."""
    list_id = require_active_list()
    pool = [
        s
        for s in db.list_sets(list_id, enriched_only=True)
        if s.get("set_img_url") and s.get("year") is not None
    ]
    if len(pool) < 1:
        raise HTTPException(
            status_code=400,
            detail=(
                "Il faut au moins 1 set enrichi avec image. "
                "Enrichis ta liste active d’abord."
            ),
        )

    total_copies = sum(max(1, int(s.get("quantity") or 1)) for s in pool)
    # Segments: jusqu'à 12 tirages pondérés (doublons possibles)
    labels = weighted_choices(pool, min(12, max(6, total_copies)), allow_duplicates=True)
    # 3 révélations pondérées — le même set peut sortir plusieurs fois
    picks = weighted_choices(pool, 3, allow_duplicates=True)
    return {
        "mode": "wheel",
        "segments": [
            {"set_num": s["set_num"], "name": s.get("name") or s["set_num"]}
            for s in labels
        ],
        "sets": [public_set(s) for s in picks],
        "total_copies": total_copies,
        "unique_sets": len(pool),
    }


@app.get("/")
def spa_index():
    index = FRONTEND_DIST / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {
        "app": "LEGO Guessr",
        "hint": "Build le frontend (cd frontend && npm run build) puis relance.",
    }


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    """SPA fallback — ne pas intercepter /api ni /media."""
    if full_path.startswith(("api/", "media/", "bg/", "assets/")):
        raise HTTPException(status_code=404, detail="Not found")
    index = FRONTEND_DIST / "index.html"
    if index.is_file():
        # Prefer exact public file (favicon.svg, etc.)
        public = Path(__file__).resolve().parent.parent / "frontend" / "public" / full_path
        if public.is_file():
            return FileResponse(public)
        dist_file = FRONTEND_DIST / full_path
        if dist_file.is_file():
            return FileResponse(dist_file)
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Frontend non buildé")
