import type { ReactNode } from 'react'
import type { WorldId } from './worlds'

/** Décors vectoriels plats façon Code BH — calques parallax, formes nettes. */

function TatooineStage() {
  return (
    <svg className="biome-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="900" fill="#f3d7a0" />
      <circle className="parallax-far" cx="1080" cy="140" r="70" fill="#ffe27a" />
      <circle className="parallax-far" cx="1185" cy="175" r="38" fill="#ffc24d" />
      <path className="parallax-mid" d="M0 520 L220 460 L420 530 L680 440 L940 520 L1200 450 L1440 510 V900 H0Z" fill="#e2b56a" />
      <path className="parallax-mid" d="M0 610 L260 560 L520 640 L820 560 L1100 630 L1440 580 V900 H0Z" fill="#c9924a" />
      <path className="parallax-near" d="M0 740 L180 700 L400 780 L700 700 L980 770 L1240 710 L1440 760 V900 H0Z" fill="#8f5a28" />
      <polygon className="parallax-mid" points="980,520 1010,420 1040,520" fill="#b87a38" />
      <polygon className="parallax-mid" points="1020,520 1045,455 1070,520" fill="#a86a2e" />
    </svg>
  )
}

function HothStage() {
  return (
    <svg className="biome-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="900" fill="#9ec4d8" />
      <path className="parallax-far" d="M0 420 L180 300 L340 390 L520 250 L740 360 L960 220 L1180 340 L1440 280 V900 H0Z" fill="#7eafc8" />
      <path className="parallax-mid" d="M0 560 L200 470 L420 560 L680 430 L980 540 L1240 450 L1440 520 V900 H0Z" fill="#5f92b0" />
      <g className="parallax-mid">
        <polygon points="180,560 210,420 240,560" fill="#3d6f8c" />
        <polygon points="205,470 210,420 215,470" fill="#d7ebf5" />
        <polygon points="360,560 400,380 440,560" fill="#355f7a" />
        <polygon points="390,470 400,380 410,470" fill="#e8f4fa" />
        <polygon points="1100,540 1140,360 1180,540" fill="#355f7a" />
        <polygon points="1130,450 1140,360 1150,450" fill="#e8f4fa" />
      </g>
      <path className="parallax-near" d="M0 760 L220 700 L480 780 L760 690 L1080 770 L1440 720 V900 H0Z" fill="#234a63" />
      <polygon className="parallax-near lava-glow" points="860,760 900,420 940,760" fill="#cfe6f2" />
      <polygon className="parallax-near" points="885,620 900,420 915,620" fill="#ffffff" />
    </svg>
  )
}

function KashyyykStage() {
  return (
    <svg className="biome-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="900" fill="#6fa85a" />
      <path className="parallax-far" d="M0 380 L200 300 L400 360 L650 260 L900 340 L1150 250 L1440 330 V900 H0Z" fill="#4f8a42" />
      <g className="parallax-mid">
        <rect x="120" y="280" width="36" height="420" fill="#5a3a1c" />
        <ellipse cx="138" cy="260" rx="90" ry="50" fill="#2f6b34" />
        <rect x="420" y="220" width="48" height="480" fill="#4a2f14" />
        <ellipse cx="444" cy="200" rx="120" ry="60" fill="#27602c" />
        <rect x="980" y="240" width="42" height="460" fill="#5a3a1c" />
        <ellipse cx="1001" cy="220" rx="110" ry="55" fill="#2f6b34" />
      </g>
      <path className="parallax-near" d="M0 720 L260 660 L560 760 L860 650 L1160 740 L1440 680 V900 H0Z" fill="#1d3d1c" />
    </svg>
  )
}

function KaminoStage() {
  return (
    <svg className="biome-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="900" fill="#4d6d86" />
      <path className="parallax-far" d="M0 360 Q360 300 720 360 T1440 340 V900 H0Z" fill="#35556e" />
      <g className="parallax-mid">
        <rect x="520" y="280" width="400" height="28" rx="4" fill="#b7c7d6" />
        <rect x="560" y="220" width="70" height="70" fill="#8ea3b8" />
        <rect x="780" y="200" width="50" height="90" fill="#7d93a8" />
        <rect x="600" y="308" width="16" height="220" fill="#6d8398" />
        <rect x="820" y="308" width="16" height="220" fill="#6d8398" />
      </g>
      <path className="parallax-near wave-flat" d="M0 640 Q180 600 360 640 T720 640 T1080 640 T1440 640 V900 H0Z" fill="#1d3348" />
      <path className="parallax-near wave-flat" d="M0 700 Q200 670 400 700 T800 700 T1200 700 T1440 700 V900 H0Z" fill="#142536" />
    </svg>
  )
}

function GeonosisStage() {
  return (
    <svg className="biome-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="900" fill="#e0a45a" />
      <path className="parallax-far" d="M0 400 L260 320 L520 410 L820 300 L1120 390 L1440 330 V900 H0Z" fill="#c4843a" />
      <ellipse className="parallax-mid" cx="720" cy="620" rx="420" ry="90" fill="#9a5a28" />
      <ellipse className="parallax-mid" cx="720" cy="620" rx="300" ry="55" fill="#7a4218" />
      <path className="parallax-near" d="M0 760 L300 700 L700 790 L1100 710 L1440 770 V900 H0Z" fill="#5a2a10" />
    </svg>
  )
}

function MustafarStage() {
  return (
    <svg className="biome-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="900" fill="#1a0e18" />
      <path className="parallax-far" d="M0 300 L200 220 L420 310 L700 160 L980 280 L1200 180 L1440 260 V900 H0Z" fill="#2a1420" />
      <polygon className="parallax-mid" points="980,520 1120,180 1260,520" fill="#3a1a16" />
      <polygon className="parallax-mid lava-glow" points="1080,420 1120,220 1160,420" fill="#ff6a1a" />
      <path className="parallax-mid lava-glow" d="M0 620 Q360 560 720 640 T1440 600 V900 H0Z" fill="#c42810" />
      <path className="parallax-near" d="M0 760 L280 700 L620 800 L980 690 L1440 760 V900 H0Z" fill="#0e0808" />
      <polygon className="parallax-near lava-glow" points="700,760 760,420 820,760" fill="#2a1410" />
      <polygon className="parallax-near lava-glow" points="735,620 760,430 785,620" fill="#ff7a20" />
    </svg>
  )
}

function EndorStage() {
  return (
    <svg className="biome-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="900" fill="#8fbf6a" />
      <path className="parallax-far" d="M0 360 L240 280 L500 350 L780 250 L1080 340 L1440 270 V900 H0Z" fill="#6f9f4e" />
      <g className="parallax-mid">
        <rect x="200" y="300" width="28" height="360" fill="#5a3a1c" />
        <polygon points="140,320 214,180 288,320" fill="#2f6b34" />
        <rect x="700" y="260" width="34" height="400" fill="#4a2f14" />
        <polygon points="620,280 717,140 814,280" fill="#27602c" />
        <rect x="1120" y="290" width="30" height="370" fill="#5a3a1c" />
        <polygon points="1060,310 1135,170 1210,310" fill="#2f6b34" />
      </g>
      <path className="parallax-near" d="M0 740 L320 680 L700 780 L1080 670 L1440 750 V900 H0Z" fill="#1f3d1c" />
    </svg>
  )
}

function ScarifStage() {
  return (
    <svg className="biome-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="900" fill="#6ec4e0" />
      <circle className="parallax-far" cx="1180" cy="120" r="55" fill="#ffe08a" />
      <path className="parallax-mid" d="M0 520 Q360 470 720 530 T1440 500 V900 H0Z" fill="#2f9bb8" />
      <g className="parallax-mid">
        <rect x="180" y="430" width="14" height="120" fill="#8b5a2b" />
        <path d="M187 430 C140 390 150 340 187 360 C224 340 234 390 187 430Z" fill="#2f8f4e" />
        <rect x="1180" y="410" width="16" height="140" fill="#8b5a2b" />
        <path d="M1188 410 C1130 365 1145 310 1188 335 C1231 310 1246 365 1188 410Z" fill="#3aa85c" />
      </g>
      <path className="parallax-near" d="M0 720 L400 680 L800 760 L1200 690 L1440 740 V900 H0Z" fill="#d8c07a" />
    </svg>
  )
}

function CoruscantStage() {
  return (
    <svg className="biome-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1440" height="900" fill="#12162a" />
      <g className="parallax-far">
        <rect x="80" y="260" width="70" height="640" fill="#1c2238" />
        <rect x="200" y="180" width="90" height="720" fill="#222844" />
        <rect x="360" y="300" width="60" height="600" fill="#1a2036" />
        <rect x="520" y="140" width="110" height="760" fill="#262c48" />
        <rect x="720" y="220" width="80" height="680" fill="#1e2440" />
        <rect x="900" y="120" width="100" height="780" fill="#2a3050" />
        <rect x="1100" y="250" width="75" height="650" fill="#1c2238" />
        <rect x="1260" y="170" width="95" height="730" fill="#242a46" />
      </g>
      <g className="parallax-mid traffic-flat">
        <rect x="140" y="320" width="40" height="8" fill="#5ec8ff" />
        <rect x="480" y="260" width="55" height="8" fill="#ffe81f" />
        <rect x="860" y="300" width="36" height="7" fill="#ff6b6b" />
        <rect x="300" y="500" width="48" height="8" fill="#9b7bff" />
        <rect x="1000" y="460" width="60" height="8" fill="#5ec8ff" />
      </g>
      <path className="parallax-near" d="M0 780 H1440 V900 H0Z" fill="#0a0d18" />
    </svg>
  )
}

const STAGES: Record<WorldId, () => ReactNode> = {
  tatooine: TatooineStage,
  hoth: HothStage,
  kashyyyk: KashyyykStage,
  kamino: KaminoStage,
  geonosis: GeonosisStage,
  mustafar: MustafarStage,
  endor: EndorStage,
  scarif: ScarifStage,
  coruscant: CoruscantStage,
}

export function VectorBiome({ world, active }: { world: WorldId; active: boolean }) {
  const Stage = STAGES[world]
  return (
    <div className={`vector-biome vector-biome-${world} ${active ? 'is-on' : ''}`}>
      <Stage />
    </div>
  )
}
