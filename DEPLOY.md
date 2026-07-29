# LEGO Guessr — mise en ligne

Oui : tes amis peuvent jouer via une URL publique, et tu continues à modifier le code chez toi.

## Option A — Render (recommandé, gratuit)

1. Crée un compte sur https://render.com (avec GitHub)
2. Sur GitHub, crée un repo **vide** `LEGO-Guessr` (ton compte)
3. Dans ce dossier projet, envoie le code :

```powershell
cd "c:\Users\Utilisateur\Desktop\ALL Cursor project\LEGO Guessr"
git init
git add .
git commit -m "LEGO Guessr prêt pour le déploiement"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/LEGO-Guessr.git
git push -u origin main
```

4. Sur Render : **New → Blueprint** → choisis le repo → Deploy  
   (ou **New → Web Service** → Docker → ce repo)

5. Tu obtiens une URL du type :  
   `https://lego-guessr.onrender.com`

6. Pour **mettre à jour** après une modif :

```powershell
git add .
git commit -m "ma modif"
git push
```

Render redéploie tout seul.

### Notes
- Le plan gratuit s’endort après ~15 min sans visite (1er chargement un peu long).
- Les listes / Excel sont stockés sur le disque Render (persistants avec le `disk` du `render.yaml`).
- **Fonds transparents (rembg)** désactivés en cloud (trop lourd) ; les photos restent sur plaque blanche.

## Option B — Lien temporaire depuis ton PC (Cloudflare Tunnel)

Si tu veux juste jouer ce soir sans compte cloud :

1. Installe https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Lance le backend + frontend en local
3. `cloudflared tunnel --url http://localhost:5173`  
   → URL publique du type `https://xxxx.trycloudflare.com`

Ton PC doit rester allumé.

## Option C — Railway

https://railway.app → New Project → Deploy from GitHub → Dockerfile.  
Pareil : push = mise à jour.
