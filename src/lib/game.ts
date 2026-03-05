import type {
  Roster, StatsMap, PlayerStats, TeamStanding,
  GameRecord, UpcomingGame, ScoreboardState, ThemeName, Theme
} from '@/types'

// ── Local Storage DB ─────────────────────────────────────
export const DB = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem('pro_' + key) ?? 'null') as T }
    catch { return null }
  },
  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('pro_' + key, JSON.stringify(value))
  },
}

export const ScoreboardDB = {
  get(): ScoreboardState | null {
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem('scoreboard') ?? 'null') }
    catch { return null }
  },
  set(state: ScoreboardState): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('scoreboard', JSON.stringify(state))
  },
}

// ── Defaults ─────────────────────────────────────────────
export function blankStats(): PlayerStats {
  return { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0, min: 0 }
}

export function defaultRoster(): Roster {
  return { home: [], away: [] }
}

export function defaultStats(): StatsMap {
  return { home: {}, away: {} }
}

export function defaultScoreboardState(): ScoreboardState {
  return {
    homeName: 'HOME', awayName: 'AWAY',
    homeScore: 0, awayScore: 0,
    homeFouls: 0, awayFouls: 0,
    homeTimeouts: 5, awayTimeouts: 5,
    period: 1, quarterClock: 72000, shotClock: 2400,
    timerRunning: false, shotClockRunning: true,
    possession: null,
    theme: 'default', homeLogoData: null, awayLogoData: null,
    leagueName: 'Hoops', maxTimeouts: 5, minutesPerQuarter: 12,
  }
}

// ── Unique ID ─────────────────────────────────────────────
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// ── Clock formatting ──────────────────────────────────────
export function formatClock(centiseconds: number): string {
  const m = Math.floor(centiseconds / 6000)
  const s = Math.floor((centiseconds % 6000) / 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatShotClock(centiseconds: number): string {
  const s = Math.floor(centiseconds / 100)
  return String(s).padStart(2, '0')
}

// ── Standings helper ──────────────────────────────────────
export function updateStandings(
  standings: TeamStanding[],
  homeName: string, homeScore: number,
  awayName: string, awayScore: number
): TeamStanding[] {
  const next = [...standings]
  const getOrCreate = (name: string): TeamStanding => {
    let t = next.find(x => x.name === name)
    if (!t) {
      t = { name, w: 0, l: 0, pf: 0, pa: 0, streak: 'W0', streakType: null, streakCount: 0 }
      next.push(t)
    }
    return t
  }
  const home = getOrCreate(homeName)
  const away = getOrCreate(awayName)
  const homeWin = homeScore > awayScore

  home.pf += homeScore; home.pa += awayScore
  away.pf += awayScore; away.pa += homeScore

  if (homeWin) {
    home.w++; away.l++
    home.streakType === 'W' ? home.streakCount++ : (home.streakType = 'W', home.streakCount = 1)
    away.streakType === 'L' ? away.streakCount++ : (away.streakType = 'L', away.streakCount = 1)
  } else {
    away.w++; home.l++
    away.streakType === 'W' ? away.streakCount++ : (away.streakType = 'W', away.streakCount = 1)
    home.streakType === 'L' ? home.streakCount++ : (home.streakType = 'L', home.streakCount = 1)
  }
  home.streak = (home.streakType ?? 'W') + home.streakCount
  away.streak = (away.streakType ?? 'W') + away.streakCount
  return next
}

// ── Standings sort ────────────────────────────────────────
export function sortStandings(standings: TeamStanding[]): TeamStanding[] {
  const top = standings.length > 0 ? Math.max(...standings.map(t => t.w)) : 0
  return [...standings].sort((a, b) => {
    const pctA = a.w + a.l > 0 ? a.w / (a.w + a.l) : 0
    const pctB = b.w + b.l > 0 ? b.w / (b.w + b.l) : 0
    return pctB - pctA
  }).map((t, i, arr) => {
    const leader = arr[0]
    const leaderPct = leader.w + leader.l > 0 ? leader.w / (leader.w + leader.l) : 0
    const tPct = t.w + t.l > 0 ? t.w / (t.w + t.l) : 0
    return { ...t, gb: i === 0 ? '-' : (((leader.w - t.w) + (t.l - leader.l)) / 2).toFixed(1) }
  })
}

// ── Themes ───────────────────────────────────────────────
export const THEMES: Theme[] = [
  { name: 'default', label: 'Classic',  homeColor: '#FF5E1A', awayColor: '#00C2FF', accent: '#FF5E1A', bg: '#0D0D0D' },
  { name: 'court',   label: 'Court',    homeColor: '#F59E0B', awayColor: '#10B981', accent: '#F59E0B', bg: '#111827' },
  { name: 'midnight',label: 'Midnight', homeColor: '#818CF8', awayColor: '#F472B6', accent: '#818CF8', bg: '#0F0E17' },
  { name: 'forest',  label: 'Forest',   homeColor: '#34D399', awayColor: '#FCD34D', accent: '#34D399', bg: '#064E3B' },
  { name: 'crimson', label: 'Crimson',  homeColor: '#EF4444', awayColor: '#FBBF24', accent: '#EF4444', bg: '#1A0000' },
  { name: 'gold',    label: 'Gold',     homeColor: '#F59E0B', awayColor: '#E2E8F0', accent: '#F59E0B', bg: '#1C1100' },
  { name: 'ice',     label: 'Ice',      homeColor: '#67E8F9', awayColor: '#A78BFA', accent: '#67E8F9', bg: '#0C1445' },
  { name: 'sunset',  label: 'Sunset',   homeColor: '#F97316', awayColor: '#EC4899', accent: '#F97316', bg: '#18020C' },
]

export function getTheme(name: ThemeName): Theme {
  return THEMES.find(t => t.name === name) ?? THEMES[0]
}
