# LEGO Guessr

Jeu LEGO façon Guess / Roue, listes Excel + infos Rebrickable.

## Local

```powershell
# Backend
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --port 8000

# Frontend (dev)
cd frontend
npm install
npm run dev
```

→ http://localhost:5173

## Mise en ligne (amis)

Voir **[DEPLOY.md](DEPLOY.md)** — Render / Railway / tunnel Cloudflare.
