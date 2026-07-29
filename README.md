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

## Mise en ligne

### Vercel (frontend + API)
1. Repo GitHub connecté
2. Fichier `vercel.json` à la racine (déjà présent)
3. Root Directory = `./`
4. Refresh → Deploy

Voir aussi [DEPLOY.md](DEPLOY.md).

### Local

```powershell
cd backend
python -m pip install -r requirements-local.txt
python -m uvicorn main:app --port 8000

cd frontend
npm install
npm run dev
```
