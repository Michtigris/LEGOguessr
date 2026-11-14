/** Petites scènes découpées — personnages vectoriels animés. */

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
      <path
        d="M20 28c0-14 8-22 16-22s16 8 16 22v8H20z"
        fill="#f4f1ea"
        stroke="#1a2233"
        strokeWidth="2"
      />
      <path d="M24 34h24c-2 6-8 9-12 9s-10-3-12-9z" fill="#1a2233" />
      <rect x="30" y="18" width="12" height="4" rx="1" fill="#1a2233" />
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
      <circle cx="36" cy="62" r="3" fill="#e10600" />
      <circle cx="48" cy="62" r="3" fill="#1a3a6a" />
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

export function HomeScenes() {
  return (
    <div className="scenes" aria-hidden="true">
      <div className="scene scene-jawa">
        <Jawa className="puppet puppet-bob" />
      </div>
      <div className="scene scene-trooper">
        <Trooper className="puppet puppet-sway" />
      </div>
      <div className="scene scene-astro">
        <Astro className="puppet puppet-roll" />
      </div>
      <div className="scene scene-pod">
        <Pod className="puppet puppet-fly" />
      </div>
      <div className="dune dune-a" />
      <div className="dune dune-b" />
      <div className="heat" />
    </div>
  )
}
