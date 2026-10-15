# LEGO Guessr

Jeu LEGO façon Guess / Roue, listes Excel + infos Rebrickable.

## Version « jeu » (double-clic, comme Godot)

Un seul fichier `LEGO Guessr.exe` : tu l’ouvres, le jeu se lance dans une fenêtre.
Les listes restent en mémoire sur le PC (`%LOCALAPPDATA%\LEGO Guessr\`).

Pour (re)construire l’exe :

```powershell
cd "CHEMIN\VERS\LEGO Guessr"
powershell -ExecutionPolicy Bypass -File .\desktop\build.ps1
```

L’exe apparaît dans `dist-desktop\LEGO Guessr.exe` — copie-le où tu veux / envoie-le à tes amis.

## Local (dev)

```powershell
cd backend
python -m pip install -r requirements-local.txt
python -m uvicorn main:app --port 8000

cd frontend
npm install
npm run dev
```

→ http://localhost:5173

## Mise en ligne

Voir [DEPLOY.md](DEPLOY.md) (Vercel / Render).
