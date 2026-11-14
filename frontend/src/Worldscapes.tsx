import type { WorldId } from './worlds'
import { HOME_CHAPTERS, WORLDS } from './worlds'

function Jawa({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 96" aria-hidden="true">
      <ellipse cx="40" cy="90" rx="22" ry="4" fill="rgba(60,40,20,0.18)" />
      <path d="M18 40c2-22 14-34 22-34s20 12 22 34l-4 42H22L18 40z" fill="#6b4423" />
      <path d="M22 38c3-18 12-28 18-28s15 10 18 28" fill="#4a2f18" />
      <ellipse cx="32" cy="42" rx="5" ry="3.5" fill="#ffe36a" />
      <ellipse cx="48" cy="42" rx="5" ry="3.5" fill="#ffe36a" />
      <rect x="28" y="54" width="24" height="8" rx="2" fill="#3d2412" />
      <path d="M20 78h12l-2 14H22zm28 0h12l2 14H50z" fill="#3d2412" />
    </svg>
  )
}

function Trooper({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 72 108" aria-hidden="true">
      <ellipse cx="36" cy="102" rx="18" ry="4" fill="rgba(20,30,50,0.2)" />
      <rect x="22" y="38" width="28" height="36" rx="4" fill="#f4f1ea" stroke="#1a2233" strokeWidth="2" />
      <rect x="18" y="44" width="10" height="22" rx="3" fill="#f4f1ea" stroke="#1a2233" strokeWidth="2" />
      <rect x="44" y="44" width="10" height="22" rx="3" fill="#f4f1ea" stroke="#1a2233" strokeWidth="2" />
      <rect x="24" y="72" width="10" height="22" rx="3" fill="#f4f1ea" stroke="#1a2233" strokeWidth="2" />
      <rect x="38" y="72" width="10" height="22" rx="3" fill="#f4f1ea" stroke="#1a2233" strokeWidth="2" />
      <path d="M20 28c0-14 8-22 16-22s16 8 16 22v8H20z" fill="#f4f1ea" stroke="#1a2233" strokeWidth="2" />
      <path d="M24 34h24c-2 6-8 9-12 9s-10-3-12-9z" fill="#1a2233" />
    </svg>
  )
}

function Astro({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 84 96" aria-hidden="true">
      <ellipse cx="42" cy="90" rx="24" ry="4" fill="rgba(20,40,70,0.18)" />
      <path d="M28 40h28v36c0 8-6 14-14 14s-14-6-14-14z" fill="#dfe8f5" stroke="#1a3a6a" strokeWidth="2" />
      <path d="M22 44c-6 8-6 22 0 28l10-4V48zm40 0l10 4c6-6 6-20 0-28l-10 4z" fill="#4da6ff" stroke="#1a3a6a" strokeWidth="2" />
      <circle cx="42" cy="30" r="18" fill="#4da6ff" stroke="#1a3a6a" strokeWidth="2" />
      <circle cx="42" cy="26" r="6" fill="#ffe81f" stroke="#1a3a6a" strokeWidth="1.5" />
      <rect x="34" y="48" width="16" height="8" rx="2" fill="#1a3a6a" />
    </svg>
  )
}

function Pod({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 48" aria-hidden="true">
      <ellipse cx="60" cy="42" rx="40" ry="4" fill="rgba(90,50,20,0.16)" />
      <rect x="8" y="18" width="34" height="14" rx="7" fill="#c45c12" stroke="#5a2a08" strokeWidth="2" />
      <rect x="78" y="18" width="34" height="14" rx="7" fill="#c45c12" stroke="#5a2a08" strokeWidth="2" />
      <path d="M40 24h40" stroke="#5a2a08" strokeWidth="3" strokeLinecap="round" />
      <circle cx="25" cy="25" r="4" fill="#ffe81f" />
      <circle cx="95" cy="25" r="4" fill="#ffe81f" />
    </svg>
  )
}

function Wookiee({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 70 110" aria-hidden="true">
      <ellipse cx="35" cy="104" rx="18" ry="4" fill="rgba(20,40,20,0.2)" />
      <path d="M22 36c0-16 8-28 13-28s13 12 13 28v40H22z" fill="#8b5a2b" />
      <circle cx="35" cy="28" r="14" fill="#a66b35" />
      <circle cx="30" cy="26" r="2" fill="#1a1208" />
      <circle cx="40" cy="26" r="2" fill="#1a1208" />
      <path d="M28 34c2 3 12 3 14 0" stroke="#1a1208" strokeWidth="1.5" fill="none" />
      <path d="M18 48c-8 10-8 28 0 34l10-6V52zm34 0l10 6c8-6 8-24 0-34l-10 6z" fill="#6e4520" />
      <rect x="26" y="74" width="8" height="22" rx="3" fill="#6e4520" />
      <rect x="36" y="74" width="8" height="22" rx="3" fill="#6e4520" />
    </svg>
  )
}

function Tauntaun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 110 70" aria-hidden="true">
      <ellipse cx="55" cy="64" rx="30" ry="4" fill="rgba(80,110,140,0.2)" />
      <path d="M30 40c0-14 10-24 22-24s18 6 22 16l8 20H34z" fill="#d9e6f2" stroke="#7a93a8" strokeWidth="2" />
      <circle cx="78" cy="28" r="10" fill="#e8f1f8" stroke="#7a93a8" strokeWidth="2" />
      <path d="M84 20l8-10M88 24l10-4" stroke="#7a93a8" strokeWidth="2" />
      <circle cx="82" cy="26" r="1.5" fill="#1a2233" />
      <path d="M34 52l-8 12m16-8l-2 12m18-12l4 12m14-10l8 12" stroke="#7a93a8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Speeder({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 40" aria-hidden="true">
      <ellipse cx="50" cy="34" rx="28" ry="3" fill="rgba(120,40,20,0.2)" />
      <path d="M10 22c20-14 60-14 80 0l-8 8H18z" fill="#c83b2f" stroke="#5a120c" strokeWidth="2" />
      <rect x="40" y="12" width="18" height="10" rx="2" fill="#ffe81f" />
      <path d="M18 28c8 4 56 4 64 0" stroke="#5a120c" strokeWidth="2" fill="none" />
    </svg>
  )
}

function Palm({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 100" aria-hidden="true">
      <rect x="27" y="40" width="6" height="52" fill="#8b5a2b" />
      <path d="M30 42c-18-8-24-22-18-28 8 6 14 16 18 28z" fill="#2f8f4e" />
      <path d="M30 42c18-8 24-22 18-28-8 6-14 16-18 28z" fill="#3aa85c" />
      <path d="M30 40c-6-16 2-30 10-34-2 10-4 22-10 34z" fill="#247a40" />
    </svg>
  )
}

function Ewok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 84" aria-hidden="true">
      <ellipse cx="32" cy="78" rx="16" ry="3" fill="rgba(30,50,20,0.2)" />
      <circle cx="32" cy="34" r="16" fill="#6b4423" />
      <circle cx="18" cy="22" r="7" fill="#6b4423" />
      <circle cx="46" cy="22" r="7" fill="#6b4423" />
      <circle cx="26" cy="32" r="2" fill="#1a1208" />
      <circle cx="38" cy="32" r="2" fill="#1a1208" />
      <ellipse cx="32" cy="40" rx="4" ry="3" fill="#c9956c" />
      <path d="M22 48h20v18H22z" fill="#8b5a2b" />
      <path d="M18 66h10v10H18zm18 0h10v10H36z" fill="#5a3a1a" />
    </svg>
  )
}

function Traffic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 40" aria-hidden="true">
      <g className="traffic-lane">
        <rect x="4" y="10" width="18" height="6" rx="2" fill="#5ec8ff" />
        <rect x="36" y="8" width="22" height="7" rx="2" fill="#ffe81f" />
        <rect x="74" y="12" width="16" height="5" rx="2" fill="#ff6b6b" />
        <rect x="20" y="24" width="20" height="5" rx="2" fill="#9b7bff" />
        <rect x="56" y="22" width="26" height="6" rx="2" fill="#5ec8ff" />
      </g>
    </svg>
  )
}

function TreeTrunk({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 160" aria-hidden="true">
      <path d="M30 160V40c0-20 8-36 10-36s10 16 10 36v120" fill="#4a2f18" />
      <path d="M20 50c-16-10-18-28-8-34 6 8 12 20 8 34zm40 0c16-10 18-28 8-34-6 8-12 20-8 34z" fill="#2d6b3a" />
      <ellipse cx="40" cy="28" rx="28" ry="16" fill="#3f8f4e" />
    </svg>
  )
}

function Platform({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 50" aria-hidden="true">
      <rect x="10" y="18" width="120" height="10" rx="2" fill="#c5d0dc" stroke="#5a6a7a" strokeWidth="2" />
      <rect x="30" y="8" width="20" height="12" fill="#9eb0c2" />
      <rect x="70" y="4" width="14" height="16" fill="#7f93a8" />
      <path d="M40 28v16m60-16v16" stroke="#5a6a7a" strokeWidth="3" />
    </svg>
  )
}

/** Fond immersif du monde courant (crossfade). */
export function WorldSky({ world }: { world: WorldId }) {
  return (
    <div className="world-sky" aria-hidden="true">
      {(Object.keys(WORLDS) as WorldId[]).map((id) => (
        <div key={id} className={`world-sky-layer world-sky-${id} ${id === world ? 'is-on' : ''}`} />
      ))}
      <div className={`world-fx world-fx-${world}`}>
        {world === 'tatooine' && (
          <>
            <span className="fx-sun a" />
            <span className="fx-sun b" />
            <span className="fx-heat" />
          </>
        )}
        {world === 'hoth' && <span className="fx-snow" />}
        {world === 'kamino' && <span className="fx-rain" />}
        {world === 'mustafar' && <span className="fx-ember" />}
        {world === 'coruscant' && <span className="fx-neon" />}
        {world === 'scarif' && <span className="fx-sparkle" />}
        {world === 'kashyyyk' && <span className="fx-spores" />}
        {world === 'endor' && <span className="fx-motes" />}
        {world === 'geonosis' && <span className="fx-dust" />}
      </div>
    </div>
  )
}

/** Figurines / props du chapitre visible. */
export function WorldCast({ world }: { world: WorldId }) {
  return (
    <div className={`world-cast world-cast-${world}`} aria-hidden="true">
      {world === 'tatooine' && (
        <>
          <Jawa className="puppet puppet-bob cast-a" />
          <Trooper className="puppet puppet-sway cast-b" />
          <Astro className="puppet puppet-roll cast-c" />
          <Pod className="puppet puppet-fly cast-d" />
          <div className="prop dune dune-a" />
          <div className="prop dune dune-b" />
        </>
      )}
      {world === 'kashyyyk' && (
        <>
          <TreeTrunk className="puppet cast-tree-l" />
          <TreeTrunk className="puppet cast-tree-r" />
          <Wookiee className="puppet puppet-sway cast-a" />
          <div className="prop mist" />
        </>
      )}
      {world === 'kamino' && (
        <>
          <Platform className="puppet cast-platform" />
          <Astro className="puppet puppet-bob cast-a" />
          <div className="prop wave" />
        </>
      )}
      {world === 'hoth' && (
        <>
          <Tauntaun className="puppet puppet-bob cast-a" />
          <Trooper className="puppet puppet-sway cast-b" />
          <div className="prop ice" />
        </>
      )}
      {world === 'scarif' && (
        <>
          <Palm className="puppet cast-palm-l" />
          <Palm className="puppet cast-palm-r" />
          <Speeder className="puppet puppet-fly cast-d" />
          <div className="prop shore" />
        </>
      )}
      {world === 'endor' && (
        <>
          <Ewok className="puppet puppet-bob cast-a" />
          <TreeTrunk className="puppet cast-tree-r" />
          <div className="prop moss" />
        </>
      )}
      {world === 'geonosis' && (
        <>
          <Trooper className="puppet puppet-sway cast-b" />
          <div className="prop arena" />
        </>
      )}
      {world === 'mustafar' && (
        <>
          <Speeder className="puppet puppet-fly cast-d" />
          <div className="prop lava" />
        </>
      )}
      {world === 'coruscant' && (
        <>
          <Traffic className="puppet puppet-fly cast-traffic" />
          <Astro className="puppet puppet-bob cast-a" />
          <div className="prop towers" />
        </>
      )}
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
