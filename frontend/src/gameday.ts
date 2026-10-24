import type { Product } from './api'

// The Game 2026: 142nd Yale vs Harvard, Saturday Nov 21, 2026, Fenway Park, Boston.
// Sources: Harvard Athletics (gocrimson.com) and MLB.com announcements, Aug 2025.
export const THE_GAME = {
  title: 'The Game',
  edition: '142nd',
  opponent: 'Harvard',
  venue: 'Fenway Park',
  city: 'Boston',
  dateLabel: 'Sat · Nov 21 · 2026',
  // Counting down to the start of game day in New Haven/Boston time (kickoff time TBA).
  start: new Date('2026-11-21T00:00:00-05:00'),
  end: new Date('2026-11-22T00:00:00-05:00'),
}

export type GamePhase = 'countdown' | 'gameday' | 'final'

export function gamePhase(now: number): GamePhase {
  if (now < THE_GAME.start.getTime()) return 'countdown'
  if (now < THE_GAME.end.getTime()) return 'gameday'
  return 'final'
}

export function timeUntilGame(now: number) {
  const ms = Math.max(0, THE_GAME.start.getTime() - now)
  const totalSeconds = Math.floor(ms / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

// Real catalogue items for game day: The Game tee, football tees, the Gameday hood and Bulldog designs.
const GAME_WORDS = ['harvard', 'the game', 'football', 'gameday', 'bulldog']

export function isGameDayProduct(p: Product): boolean {
  const text = [p.name, ...p.search_tags].join(' ').toLowerCase()
  return GAME_WORDS.some((w) => text.includes(w))
}

// Store categories shown as a "position" on player cards.
export function positionOf(garmentType: string): string {
  const t = garmentType.toLowerCase()
  if (t.includes('quarter-zip') || t.includes('1/4')) return 'QZ'
  if (t.includes('jacket') || t.includes('fleece')) return 'JK'
  if (t.includes('hood')) return 'HD'
  if (t.includes('crewneck') || t.includes('mockneck') || t.includes('sweatshirt')) return 'CR'
  if (t.includes('long-sleeve')) return 'LS'
  if (t.includes('t-shirt')) return 'TE'
  return 'XX'
}
