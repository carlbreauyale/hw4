import type { CSSProperties } from 'react'

// Navy / white / blue confetti pieces with fixed (pseudo-random) positions, computed once,
// so rendering stays pure. CSS animates the fall; each burst plays once.
const COLORS = ['#00366b', '#ffffff', '#3d8bff', '#9fc4ff', '#ffb000']

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const PIECES = Array.from({ length: 42 }, (_, i) => ({
  left: seeded(i, 1) * 100,
  delay: seeded(i, 2) * 0.35,
  duration: 1.1 + seeded(i, 3) * 0.9,
  drift: (seeded(i, 4) - 0.5) * 160,
  spin: 180 + seeded(i, 5) * 540,
  color: COLORS[i % COLORS.length],
  wide: seeded(i, 6) > 0.5,
}))

export default function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={p.wide ? 'wide' : ''}
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
