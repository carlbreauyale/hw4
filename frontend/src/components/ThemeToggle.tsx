import { useState } from 'react'
import { getTheme, setTheme, type Theme } from '../theme'

// D7: Day Game / Night Game switch in the nav bar.
export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const night = theme === 'night'

  function toggle() {
    const next: Theme = night ? 'day' : 'night'
    setTheme(next)
    setThemeState(next)
  }

  return (
    <button
      className={`theme-toggle ${night ? 'is-night' : ''}`}
      onClick={toggle}
      role="switch"
      aria-checked={night}
      aria-label="Night Game mode"
      title={night ? 'Switch to Day Game' : 'Switch to Night Game'}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">{night ? '☾' : '☀'}</span>
      </span>
      <span className="theme-toggle-label">{night ? 'Night Game' : 'Day Game'}</span>
    </button>
  )
}
