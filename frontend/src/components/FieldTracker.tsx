import { useEffect, useState } from 'react'

const YARD_LINES = [10, 20, 30, 40, 50, 40, 30, 20, 10]

// D4: a football field under the nav. The ball moves toward the end zone as you scroll;
// reaching the bottom of the page scores a touchdown.
export default function FieldTracker() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const touchdown = progress > 0.985
  return (
    <div className={`field ${touchdown ? 'is-td' : ''}`} aria-hidden="true">
      <span className="endzone endzone-home">YALE</span>
      <div className="field-turf">
        {YARD_LINES.map((n, i) => (
          <span key={i} className="yard" style={{ left: `${((i + 1) / (YARD_LINES.length + 1)) * 100}%` }}>
            {n}
          </span>
        ))}
        <span className="field-gain" style={{ width: `${progress * 100}%` }} />
        <span className="football" style={{ left: `${progress * 100}%` }}>
          <FootballIcon />
        </span>
      </div>
      <span className="endzone endzone-goal">{touchdown ? 'TD!' : 'END ZONE'}</span>
    </div>
  )
}

export function FootballIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 64 40" aria-hidden="true">
      <ellipse cx="32" cy="20" rx="30" ry="18" fill="#7a4a24" stroke="#4a2c14" strokeWidth="2" />
      <path d="M8 20 Q32 2 56 20 Q32 38 8 20Z" fill="none" stroke="#4a2c14" strokeWidth="1" opacity="0.4" />
      <line x1="20" y1="20" x2="44" y2="20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      {[24, 29, 34, 39].map((x) => (
        <line key={x} x1={x} y1="16" x2={x} y2="24" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  )
}
