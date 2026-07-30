"""Minimal FastAPI entry for Vercel smoke test."""
from fastapi import FastAPI

app = FastAPI(title="LEGO Guessr smoke")


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "smoke"}


@app.get("/api/lists")
def lists():
    return {"lists": [], "active_list_id": None, "active": None}
