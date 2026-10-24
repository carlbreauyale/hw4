import { useEffect, useState } from 'react'
import { THE_GAME, gamePhase, timeUntilGame } from '../gameday'

// One flip-clock card. Its parent keys it by position + digit, so a change re-mounts it and replays the flip.
function FlipDigit({ value }: { value: string }) {
  return (
    <span className="flip-card">
      <span className="flip-value">{value}</span>
    </span>
  )
}

function FlipUnit({ value, label, pad = 2 }: { value: number; label: string; pad?: number }) {
  const digits = String(value).padStart(pad, '0').split('')
  return (
    <div className="flip-unit">
      <div className="flip-digits">
        {digits.map((d, i) => (
          <FlipDigit key={`${i}-${d}`} value={d} />
        ))}
      </div>
      <span className="flip-label">{label}</span>
    </div>
  )
}

// D1: stadium scoreboard counting down to The Game.
export default function GameCountdown() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const phase = gamePhase(now)
  const t = timeUntilGame(now)

  return (
    <section className="scoreboard" aria-label={`Countdown to ${THE_GAME.title}`}>
      <div className="scoreboard-lights" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="scoreboard-teams">
        <div className="team team-home">
          <span className="team-label">Home of the Bulldogs</span>
          <strong>YALE</strong>
        </div>
        <div className="scoreboard-vs">
          <span>{THE_GAME.edition}</span>
          <strong>VS</strong>
          <span>{THE_GAME.title}</span>
        </div>
        <div className="team team-away">
          <span className="team-label">The rivals</span>
          <strong>HARVARD</strong>
        </div>
      </div>

      {phase === 'countdown' ? (
        <div className="flip-clock" role="timer" aria-live="off">
          <FlipUnit value={t.days} label="Days" />
          <span className="flip-sep" aria-hidden="true">:</span>
          <FlipUnit value={t.hours} label="Hrs" />
          <span className="flip-sep" aria-hidden="true">:</span>
          <FlipUnit value={t.minutes} label="Min" />
          <span className="flip-sep" aria-hidden="true">:</span>
          <FlipUnit value={t.seconds} label="Sec" />
        </div>
      ) : (
        <p className="scoreboard-message">
          {phase === 'gameday' ? "IT'S GAME DAY! BOOLA BOOLA!" : 'THE GAME 2026 IS IN THE BOOKS'}
        </p>
      )}

      <p className="scoreboard-meta">
        <span>{THE_GAME.dateLabel}</span>
        <span aria-hidden="true">◆</span>
        <span>
          {THE_GAME.venue} · {THE_GAME.city}
        </span>
      </p>
    </section>
  )
}
