// ─────────────────────────────────────────────────────────
// HOOPS PRO — TypeScript Types
// ─────────────────────────────────────────────────────────

// ── Player & Stats ───────────────────────────────────────
export interface PlayerStats {
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  to: number
  pf: number
  min: number
}

export interface Player {
  id: string
  number: string
  name: string
  position: string
}

export interface PlayerWithStats extends Player {
  stats: PlayerStats
}

// ── Roster ───────────────────────────────────────────────
export type Side = 'home' | 'away'

export interface Roster {
  home: Player[]
  away: Player[]
}

export interface StatsMap {
  home: Record<string, PlayerStats>
  away: Record<string, PlayerStats>
}

// ── Standings ────────────────────────────────────────────
export interface TeamStanding {
  name: string
  w: number
  l: number
  pf: number
  pa: number
  streak: string
  streakType: 'W' | 'L' | null
  streakCount: number
}

// ── Game History ─────────────────────────────────────────
export interface BoxScore {
  home: PlayerWithStats[]
  away: PlayerWithStats[]
}

export interface GameRecord {
  id: string
  date: string
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  boxScore: BoxScore
  leagueName: string
}

// ── Scoreboard State (localStorage sync) ─────────────────
export interface ScoreboardState {
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  homeFouls: number
  awayFouls: number
  homeTimeouts: number
  awayTimeouts: number
  period: number
  quarterClock: number    // centiseconds
  shotClock: number       // centiseconds
  timerRunning: boolean
  shotClockRunning: boolean   // independent shot clock pause
  possession: Side | null
  theme: ThemeName
  homeLogoData: string | null
  awayLogoData: string | null
  leagueName: string
  maxTimeouts: number
  minutesPerQuarter: number
}

// ── Theme ─────────────────────────────────────────────────
export type ThemeName =
  | 'default'
  | 'court'
  | 'midnight'
  | 'forest'
  | 'crimson'
  | 'gold'
  | 'ice'
  | 'sunset'
  | 'custom'

export interface Theme {
  name: ThemeName
  label: string
  homeColor: string
  awayColor: string
  accent: string
  bg: string
}

// ── Upcoming Game ─────────────────────────────────────────
export interface UpcomingGame {
  teams: string
  date: string
}

// ── Supabase DB rows ──────────────────────────────────────
export interface Profile {
  id: string
  display_name: string | null
  updated_at: string
}
