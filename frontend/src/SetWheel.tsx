import { useEffect, useMemo, useState } from 'react'

type Segment = { set_num: string; name: string }

const COLORS = ['#FFE81F', '#4DA6FF', '#E10600', '#1a3a6a', '#D6B87A', '#0B1220']

type Props = {
  segments: Segment[]
  spinning: boolean
  onDone: () => void
}

export function SetWheel({ segments, spinning, onDone }: Props) {
  const [rotation, setRotation] = useState(0)
  const [finished, setFinished] = useState(false)

  const slice = 360 / Math.max(segments.length, 1)

  const gradient = useMemo(() => {
    if (!segments.length) return '#0b1220'
    const parts = segments.map((_, i) => {
      const color = COLORS[i % COLORS.length]
      const start = i * slice
      const end = (i + 1) * slice
      return `${color} ${start}deg ${end}deg`
    })
    return `conic-gradient(${parts.join(', ')})`
  }, [segments, slice])

  useEffect(() => {
    if (!spinning || !segments.length) return
    setFinished(false)
    const extra = 360 * (4 + Math.floor(Math.random() * 3))
    const land = Math.floor(Math.random() * segments.length) * slice
    const next = rotation + extra + (360 - land)
    setRotation(next)
    const timer = window.setTimeout(() => {
      setFinished(true)
      onDone()
    }, 3200)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning])

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" />
      <div
        className={`wheel ${spinning && !finished ? 'wheel-spinning' : ''}`}
        style={{
          background: gradient,
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 3.1s cubic-bezier(0.12, 0.75, 0.08, 1)' : 'none',
        }}
      >
        {segments.map((seg, i) => {
          const angle = i * slice + slice / 2
          return (
            <span
              key={`${seg.set_num}-${i}`}
              className="wheel-label"
              style={{
                transform: `rotate(${angle}deg) translateY(-118px) rotate(90deg)`,
              }}
            >
              {seg.set_num.replace(/-\d+$/, '')}
            </span>
          )
        })}
        <div className="wheel-hub">SET</div>
      </div>
    </div>
  )
}
