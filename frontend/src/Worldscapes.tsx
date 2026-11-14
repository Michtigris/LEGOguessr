import { useEffect, useState } from 'react'
import type { WorldId } from './worlds'
import { HOME_CHAPTERS, WORLDS } from './worlds'
import { VectorBiome } from './VectorBiomes'

type CastId = 'jawa' | 'trooper' | 'r2' | 'chewie' | 'c3po' | 'vader' | 'ewok' | 'yoda'

type CastActor = {
  id: CastId
  name: string
  src: string
  size: 'md' | 'lg' | 'xl'
  pose: 'a' | 'b' | 'c' | 'd'
  lines: string[]
  /** Zone bouche approximative en % de l’image (hotspot cliquable). */
  mouth: { top: string; left: string; width: string; height: string }
}

const CAST: Record<CastId, Omit<CastActor, 'pose' | 'size'>> = {
  jawa: {
    id: 'jawa',
    name: 'Jawa',
    src: '/cast/jawa.png',
    lines: [
      'Utinni ! Ce set sent le bon plan.',
      'J’échange trois indices contre une photo nette.',
      'Dans le désert, même les listes ont soif.',
    ],
    mouth: { top: '62%', left: '42%', width: '18%', height: '12%' },
  },
  trooper: {
    id: 'trooper',
    name: 'Stormtrooper',
    src: '/cast/trooper.png',
    lines: [
      'Ces ne sont pas les sets que vous cherchez.',
      'Cible verrouillée… presque. Élimine un suspect.',
      'Je tire à côté, toi tu dois viser juste.',
    ],
    mouth: { top: '48%', left: '40%', width: '20%', height: '10%' },
  },
  r2: {
    id: 'r2',
    name: 'R2-D2',
    src: '/cast/r2.png',
    lines: [
      '*bip bip* Données enrichies à 100 %.',
      '*boop* PDF prêt. Ne me retourne pas.',
      '*whistle* La roue tourne. Je reste stable.',
    ],
    mouth: { top: '38%', left: '38%', width: '24%', height: '16%' },
  },
  chewie: {
    id: 'chewie',
    name: 'Chewbacca',
    src: '/cast/chewie.png',
    lines: [
      'WRAAAR ! Plus de pièces = plus de respect.',
      'Cette canopée cache de beaux sets.',
      'Huurgh. Importe. Scanne. On joue.',
    ],
    mouth: { top: '58%', left: '40%', width: '20%', height: '12%' },
  },
  c3po: {
    id: 'c3po',
    name: 'C-3PO',
    src: '/cast/c3po.png',
    lines: [
      'La probabilité de se tromper est de 3720 contre 1.',
      'Je suis fluent en Excel et en Rebrickable.',
      'Oh mon. Une image manquante. Quelle horreur.',
    ],
    mouth: { top: '52%', left: '42%', width: '16%', height: '10%' },
  },
  vader: {
    id: 'vader',
    name: 'Dark Vador',
    src: '/cast/vader.png',
    lines: [
      'Je trouve ton manque de sets… dérangeant.',
      'Rejoins le côté obscur. Ou valide ton guess.',
      '*respiration* La lave n’attend personne.',
    ],
    mouth: { top: '55%', left: '40%', width: '20%', height: '10%' },
  },
  ewok: {
    id: 'ewok',
    name: 'Ewok',
    src: '/cast/ewok.png',
    lines: [
      'Yub nub ! Trois gestes et on fête.',
      'La clairière aime les bonnes listes.',
      'Clique encore. J’ai d’autres blagues.',
    ],
    mouth: { top: '58%', left: '42%', width: '16%', height: '10%' },
  },
  yoda: {
    id: 'yoda',
    name: 'Yoda',
    src: '/cast/yoda.png',
    lines: [
      'Deviner, tu dois. Impatient, tu ne seras.',
      'Dans le set, la force est.',
      'Taille petite, collection grande.',
    ],
    mouth: { top: '62%', left: '40%', width: '20%', height: '12%' },
  },
}

const WORLD_CAST: Record<WorldId, Array<{ id: CastId; size: CastActor['size']; pose: CastActor['pose'] }>> = {
  tatooine: [
    { id: 'jawa', size: 'xl', pose: 'a' },
    { id: 'trooper', size: 'lg', pose: 'b' },
    { id: 'r2', size: 'md', pose: 'c' },
  ],
  kashyyyk: [
    { id: 'chewie', size: 'xl', pose: 'a' },
    { id: 'yoda', size: 'lg', pose: 'b' },
  ],
  kamino: [
    { id: 'c3po', size: 'xl', pose: 'a' },
    { id: 'r2', size: 'lg', pose: 'd' },
  ],
  hoth: [
    { id: 'trooper', size: 'xl', pose: 'a' },
    { id: 'c3po', size: 'lg', pose: 'b' },
  ],
  scarif: [
    { id: 'r2', size: 'xl', pose: 'a' },
    { id: 'trooper', size: 'lg', pose: 'd' },
  ],
  endor: [
    { id: 'ewok', size: 'xl', pose: 'a' },
    { id: 'yoda', size: 'lg', pose: 'b' },
  ],
  geonosis: [
    { id: 'trooper', size: 'xl', pose: 'a' },
    { id: 'jawa', size: 'lg', pose: 'b' },
  ],
  mustafar: [
    { id: 'vader', size: 'xl', pose: 'a' },
    { id: 'c3po', size: 'md', pose: 'c' },
  ],
  coruscant: [
    { id: 'c3po', size: 'xl', pose: 'a' },
    { id: 'r2', size: 'lg', pose: 'b' },
    { id: 'yoda', size: 'md', pose: 'd' },
  ],
}

function CastFigure({
  actor,
  talking,
  line,
  onMouth,
}: {
  actor: CastActor
  talking: boolean
  line: string | null
  onMouth: () => void
}) {
  return (
    <figure className={`cast-figure cast-${actor.size} cast-pose-${actor.pose} ${talking ? 'is-talking' : ''}`}>
      <img src={actor.src} alt={actor.name} draggable={false} />
      <button
        type="button"
        className="cast-mouth"
        style={actor.mouth}
        aria-label={`Faire parler ${actor.name}`}
        title="Clique la bouche"
        onClick={onMouth}
      />
      {talking && line && (
        <figcaption className="cast-bubble" role="status">
          <strong>{actor.name}</strong>
          <span>{line}</span>
        </figcaption>
      )}
    </figure>
  )
}

/** Fond immersif vectoriel (crossfade Code BH × Star Wars). */
export function WorldSky({ world }: { world: WorldId }) {
  return (
    <div className="world-sky" aria-hidden="true">
      {(Object.keys(WORLDS) as WorldId[]).map((id) => (
        <VectorBiome key={id} world={id} active={id === world} />
      ))}
      <div className={`world-fx world-fx-${world}`}>
        {world === 'hoth' && <span className="fx-snow" />}
        {world === 'kamino' && <span className="fx-rain" />}
        {world === 'mustafar' && <span className="fx-ember" />}
        {world === 'coruscant' && <span className="fx-neon" />}
      </div>
    </div>
  )
}

/** Figurines découpées interactives du monde visible. */
export function WorldCast({ world }: { world: WorldId }) {
  const [activeId, setActiveId] = useState<CastId | null>(null)
  const [lineIndex, setLineIndex] = useState(0)
  const roster = WORLD_CAST[world]

  useEffect(() => {
    setActiveId(null)
  }, [world])

  useEffect(() => {
    if (!activeId) return
    const timer = window.setTimeout(() => setActiveId(null), 4200)
    return () => window.clearTimeout(timer)
  }, [activeId, lineIndex])

  return (
    <div className={`world-cast world-cast-${world}`}>
      {roster.map((slot) => {
        const base = CAST[slot.id]
        const actor: CastActor = { ...base, size: slot.size, pose: slot.pose }
        const talking = activeId === actor.id
        const line = talking ? actor.lines[lineIndex % actor.lines.length] : null
        return (
          <CastFigure
            key={`${world}-${actor.id}-${slot.pose}`}
            actor={actor}
            talking={talking}
            line={line}
            onMouth={() => {
              setActiveId(actor.id)
              setLineIndex((value) => value + 1)
            }}
          />
        )
      })}
    </div>
  )
}

export function WorldNav({
  active,
  onJump,
}: {
  active: WorldId
  onJump: (id: WorldId) => void
}) {
  return (
    <nav className="world-nav" aria-label="Univers">
      {HOME_CHAPTERS.map((chapter) => (
        <button
          key={chapter.id}
          type="button"
          className={`world-nav-dot ${active === chapter.id ? 'is-active' : ''}`}
          title={`${WORLDS[chapter.id].name} — ${chapter.title}`}
          aria-current={active === chapter.id ? 'true' : undefined}
          onClick={() => onJump(chapter.id)}
        >
          <span>{WORLDS[chapter.id].name}</span>
        </button>
      ))}
    </nav>
  )
}
