// Day Game / Night Game theme. index.html applies the saved theme before first paint.
export type Theme = 'day' | 'night'

const KEY = 'campus-customs:theme'

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'night' ? 'night' : 'day'
}

export function setTheme(theme: Theme) {
  if (theme === 'night') document.documentElement.dataset.theme = 'night'
  else delete document.documentElement.dataset.theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // storage unavailable: theme still applies for this visit
  }
}
