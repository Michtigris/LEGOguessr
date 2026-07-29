# LEGO Guessr — mise en ligne

## Vercel (ce que tu essayais)

Le bouton Deploy est grisé tant que `vercel.json` n’est **pas** à la racine du repo GitHub.

### Déjà en place dans le projet
- `vercel.json` (services `frontend` + `backend`)
- routes `/api/*` → FastAPI
- reste → Vite

### Sur Vercel
1. Refresh la page du projet
2. Root Directory = `./` (racine)
3. Framework / Project type = **Services** si proposé
4. Deploy

### Limites importantes sur Vercel
- La base SQLite **ne reste pas** durable (disque éphémère) : listes Excel peuvent disparaître après un redémarrage / cold start.
- `rembg` (fonds transparents) est **désactivé** / non installé sur Vercel (trop lourd).
- Le 1er appel peut être lent (téléchargement du catalogue Rebrickable).

Pour jouer sérieusement avec des amis et garder les listes, **Render** (Docker) est plus adapté — voir plus bas.

## Render (recommandé pour ce jeu)

1. https://render.com → Blueprint → repo `LEGOguessr`
2. URL durable + disque pour SQLite

## Après chaque modif

```powershell
git add .
git commit -m "ma modif"
git push
```
