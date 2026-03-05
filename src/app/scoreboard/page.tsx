'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  DB, ScoreboardDB, blankStats, defaultRoster, defaultStats,
  defaultScoreboardState, uid, formatClock, formatShotClock,
  updateStandings, THEMES, getTheme
} from '@/lib/game'
import type {
  Roster, StatsMap, TeamStanding, GameRecord,
  Player, PlayerStats, Side, ScoreboardState, ThemeName
} from '@/types'
import styles from './scoreboard.module.css'

// ── Clock hook ────────────────────────────────────────────
function useClock(state: ScoreboardState, setState: React.Dispatch<React.SetStateAction<ScoreboardState>>) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state.timerRunning) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          if (!prev.timerRunning) return prev
          const qc = Math.max(0, prev.quarterClock - 10)
          // Shot clock only ticks when shotClockRunning is true
          const sc = prev.shotClockRunning ? Math.max(0, prev.shotClock - 10) : prev.shotClock
          const newState = { ...prev, quarterClock: qc, shotClock: sc }
          if (qc === 0) newState.timerRunning = false
          return newState
        })
      }, 100)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [state.timerRunning, setState])
}

export default function ScoreboardPage() {
  const [sb, setSb] = useState<ScoreboardState>(defaultScoreboardState)
  const [roster, setRoster] = useState<Roster>(defaultRoster())
  const [stats, setStats] = useState<StatsMap>(defaultStats())
  const [standings, setStandings] = useState<TeamStanding[]>([])
  const [history, setHistory] = useState<GameRecord[]>([])
  const [activeTab, setActiveTab] = useState<'scoreboard'|'roster'|'stats'|'standings'|'history'>('scoreboard')
  const [selectedPlayer, setSelectedPlayer] = useState<{side: Side, id: string} | null>(null)
  const [statSide, setStatSide] = useState<Side>('home')
  const [flash, setFlash] = useState('')
  const [homeNumInput, setHomeNumInput] = useState('')
  const [homeNameInput, setHomeNameInput] = useState('')
  const [homePosInput, setHomePosInput] = useState('G')
  const [awayNumInput, setAwayNumInput] = useState('')
  const [awayNameInput, setAwayNameInput] = useState('')
  const [awayPosInput, setAwayPosInput] = useState('G')
  const homeLogoRef = useRef<HTMLInputElement>(null)
  const awayLogoRef = useRef<HTMLInputElement>(null)
  const [showMinutesModal, setShowMinutesModal] = useState(false)

  useClock(sb, setSb)

  // Load from localStorage
  useEffect(() => {
    const saved = ScoreboardDB.get()
    if (saved) setSb(saved)
    setRoster(DB.get<Roster>('roster') || defaultRoster())
    setStats(DB.get<StatsMap>('stats') || defaultStats())
    setStandings(DB.get<TeamStanding[]>('standings') || [])
    setHistory(DB.get<GameRecord[]>('history') || [])
  }, [])

  // Sync to localStorage whenever sb changes
  useEffect(() => {
    ScoreboardDB.set(sb)
  }, [sb])

  const showFlash = useCallback((msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(''), 2200)
  }, [])

  // ── Score ─────────────────────────────────────────────
  function addScore(side: Side, pts: number) {
    setSb(prev => ({
      ...prev,
      homeScore: side === 'home' ? prev.homeScore + pts : prev.homeScore,
      awayScore: side === 'away' ? prev.awayScore + pts : prev.awayScore,
    }))
    // Credit pts to selected player
    if (selectedPlayer && selectedPlayer.side === side) {
      recordStat(side, selectedPlayer.id, 'pts', pts)
    }
  }

  function adjustScore(side: Side, delta: number) {
    setSb(prev => ({
      ...prev,
      homeScore: side === 'home' ? Math.max(0, prev.homeScore + delta) : prev.homeScore,
      awayScore: side === 'away' ? Math.max(0, prev.awayScore + delta) : prev.awayScore,
    }))
  }

  // ── Clock ─────────────────────────────────────────────
  function toggleClock() { setSb(prev => ({ ...prev, timerRunning: !prev.timerRunning })) }
  function resetShotClock(secs: number) { setSb(prev => ({ ...prev, shotClock: secs * 100 })) }
  function toggleShotClock() { setSb(prev => ({ ...prev, shotClockRunning: !prev.shotClockRunning })) }
  function nextPeriod() {
    setSb(prev => ({
      ...prev, period: prev.period + 1,
      quarterClock: prev.minutesPerQuarter * 6000,
      shotClock: 2400, timerRunning: false, shotClockRunning: true,
    }))
  }

  // ── Minutes per quarter ───────────────────────────────
  function setMinutes(mins: number) {
    setSb(prev => ({
      ...prev,
      minutesPerQuarter: mins,
      quarterClock: mins * 6000,
      timerRunning: false,
    }))
    setShowMinutesModal(false)
    showFlash(`Quarter set to ${mins} min`)
  }

  // ── Logo upload ───────────────────────────────────────
  function handleLogoUpload(side: Side, file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result as string
      setSb(prev => ({
        ...prev,
        homeLogoData: side === 'home' ? data : prev.homeLogoData,
        awayLogoData: side === 'away' ? data : prev.awayLogoData,
      }))
    }
    reader.readAsDataURL(file)
  }
  function clearLogo(side: Side) {
    setSb(prev => ({
      ...prev,
      homeLogoData: side === 'home' ? null : prev.homeLogoData,
      awayLogoData: side === 'away' ? null : prev.awayLogoData,
    }))
  }

  // ── Fouls ─────────────────────────────────────────────
  function addFoul(side: Side) {
    setSb(prev => ({
      ...prev,
      homeFouls: side === 'home' ? Math.min(5, prev.homeFouls + 1) : prev.homeFouls,
      awayFouls: side === 'away' ? Math.min(5, prev.awayFouls + 1) : prev.awayFouls,
    }))
  }
  function resetFouls() { setSb(prev => ({ ...prev, homeFouls: 0, awayFouls: 0 })) }

  // ── Timeouts ──────────────────────────────────────────
  function useTimeout(side: Side) {
    setSb(prev => ({
      ...prev,
      homeTimeouts: side === 'home' ? Math.max(0, prev.homeTimeouts - 1) : prev.homeTimeouts,
      awayTimeouts: side === 'away' ? Math.max(0, prev.awayTimeouts - 1) : prev.awayTimeouts,
    }))
  }

  // ── Stats ─────────────────────────────────────────────
  function recordStat(side: Side, playerId: string, stat: keyof PlayerStats, delta = 1) {
    setStats(prev => {
      const sideStats = { ...prev[side] }
      sideStats[playerId] = { ...(sideStats[playerId] || blankStats()) }
      sideStats[playerId][stat] = (sideStats[playerId][stat] as number) + delta
      const next = { ...prev, [side]: sideStats }
      DB.set('stats', next)
      return next
    })
  }

  // ── Roster ────────────────────────────────────────────
  function addPlayer(side: Side) {
    const num  = side === 'home' ? homeNumInput  : awayNumInput
    const name = side === 'home' ? homeNameInput : awayNameInput
    const pos  = side === 'home' ? homePosInput  : awayPosInput
    if (!name.trim()) return
    const player: Player = { id: uid(), number: num.trim() || '0', name: name.trim(), position: pos }
    setRoster(prev => {
      const next = { ...prev, [side]: [...prev[side], player] }
      DB.set('roster', next)
      return next
    })
    setStats(prev => {
      const next = { ...prev, [side]: { ...prev[side], [player.id]: blankStats() } }
      DB.set('stats', next)
      return next
    })
    if (side === 'home') { setHomeNumInput(''); setHomeNameInput('') }
    else { setAwayNumInput(''); setAwayNameInput('') }
  }

  function removePlayer(side: Side, playerId: string) {
    setRoster(prev => {
      const next = { ...prev, [side]: prev[side].filter(p => p.id !== playerId) }
      DB.set('roster', next)
      return next
    })
    if (selectedPlayer?.id === playerId) setSelectedPlayer(null)
  }

  // ── Save Game ─────────────────────────────────────────
  function saveGame() {
    if (sb.homeScore === 0 && sb.awayScore === 0) {
      alert('Start the game first before saving!'); return
    }
    if (!confirm('Save this game result to history and standings?')) return
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const game: GameRecord = {
      id: uid(), date,
      homeName: sb.homeName, awayName: sb.awayName,
      homeScore: sb.homeScore, awayScore: sb.awayScore,
      boxScore: {
        home: roster.home.map(p => ({ ...p, stats: { ...(stats.home[p.id] || blankStats()) } })),
        away: roster.away.map(p => ({ ...p, stats: { ...(stats.away[p.id] || blankStats()) } })),
      },
      leagueName: sb.leagueName,
    }
    const newHistory = [game, ...history]
    setHistory(newHistory)
    DB.set('history', newHistory)
    const newStandings = updateStandings(standings, sb.homeName, sb.homeScore, sb.awayName, sb.awayScore)
    setStandings(newStandings)
    DB.set('standings', newStandings)
    showFlash('Game saved! ✓')
  }

  // ── Reset ─────────────────────────────────────────────
  function resetAll() {
    if (!confirm('Reset entire scoreboard and all stats?')) return
    const fresh = defaultScoreboardState()
    setSb(fresh)
    setRoster(defaultRoster())
    setStats(defaultStats())
    setSelectedPlayer(null)
    DB.set('roster', defaultRoster())
    DB.set('stats', defaultStats())
    showFlash('Reset complete')
  }

  const theme = getTheme(sb.theme)
  const qFmt = formatClock(sb.quarterClock)
  const scFmt = formatShotClock(sb.shotClock)
  const scWarning = sb.shotClock <= 800
  const scCritical = sb.shotClock <= 500

  const periodLabel = sb.period <= 4
    ? ['1st','2nd','3rd','4th'][sb.period - 1] + ' Quarter'
    : `OT ${sb.period - 4}`

  return (
    <div className={styles.shell} style={{ '--home-color': theme.homeColor, '--away-color': theme.awayColor, '--accent': theme.accent, '--dark': theme.bg } as React.CSSProperties}>
      <div className={styles.flash + (flash ? ' ' + styles.flashShow : '')}>{flash}</div>

      {/* Header */}
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn}>← Dashboard</Link>
        <button className={styles.brand} onClick={() => {
          const n = prompt('League name:', sb.leagueName)
          if (n) setSb(prev => ({ ...prev, leagueName: n }))
        }}>⬡ {sb.leagueName}</button>
        <span className={styles.period}>{periodLabel}</span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['scoreboard','roster','stats','standings','history'] as const).map(t => (
          <button key={t} className={styles.tabBtn + (activeTab === t ? ' ' + styles.tabBtnActive : '')}
            onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── SCOREBOARD TAB ──────────────────────────────── */}
      {activeTab === 'scoreboard' && (
        <div className={styles.scoreTab}>
          <div className={styles.teams}>
            {/* Home */}
            <div className={styles.teamCol}>
              {/* Logo upload */}
              <div className={styles.logoWrap}>
                {sb.homeLogoData
                  ? <div className={styles.logoPreviewWrap}>
                      <img className={styles.logoPreview} src={sb.homeLogoData} alt="Home logo" />
                      <button className={styles.logoClear} onClick={() => clearLogo('home')} title="Remove logo">✕</button>
                    </div>
                  : <button className={styles.logoUploadBtn} onClick={() => homeLogoRef.current?.click()}>
                      📷 Logo
                    </button>
                }
                <input ref={homeLogoRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handleLogoUpload('home', e.target.files[0])} />
              </div>
              <input className={styles.teamName + ' ' + styles.homeTeam}
                value={sb.homeName} onChange={e => setSb(p => ({ ...p, homeName: e.target.value }))} />
              <div className={styles.score} style={{ color: theme.homeColor }}>{sb.homeScore}</div>
              <div className={styles.scoreBtns}>
                <button className={styles.pts} onClick={() => addScore('home', 1)}>+1</button>
                <button className={styles.pts} onClick={() => addScore('home', 2)}>+2</button>
                <button className={styles.pts} onClick={() => addScore('home', 3)}>+3</button>
                <button className={styles.ptsAdj} onClick={() => adjustScore('home', -1)}>−1</button>
              </div>
              <div className={styles.foulsRow}>
                <span className={styles.foulsLabel}>FOULS</span>
                <button className={styles.foulBtn} onClick={() => addFoul('home')}>{sb.homeFouls}</button>
              </div>
              <div className={styles.timeoutsRow}>
                <span className={styles.toLabel}>TIMEOUTS</span>
                <div className={styles.toDots}>
                  {Array.from({ length: sb.maxTimeouts }).map((_, i) => (
                    <button key={i} className={styles.toDot + (i < sb.homeTimeouts ? ' ' + styles.toDotOn : '')}
                      onClick={() => useTimeout('home')} />
                  ))}
                </div>
              </div>
            </div>

            {/* Clocks */}
            <div className={styles.clockCol}>
              <div className={styles.qClock + (sb.timerRunning ? ' ' + styles.qClockRunning : '')}>{qFmt}</div>
              <button className={styles.clockToggle} onClick={toggleClock}>
                {sb.timerRunning ? '⏸ Pause' : '▶ Start'}
              </button>
              <button className={styles.minutesBtn} onClick={() => setShowMinutesModal(true)}>
                ⏱ {sb.minutesPerQuarter} min / qtr
              </button>
              <div className={styles.scWrap}>
                <div className={styles.scLabel}>SHOT CLOCK</div>
                <div className={styles.scValue + (scCritical ? ' ' + styles.scCritical : scWarning ? ' ' + styles.scWarning : '') + (!sb.shotClockRunning ? ' ' + styles.scPaused : '')}>{scFmt}</div>
                <div className={styles.scBtns}>
                  <button className={styles.scBtn} onClick={() => resetShotClock(24)}>24</button>
                  <button className={styles.scBtn} onClick={() => resetShotClock(14)}>14</button>
                  <button
                    className={styles.scPauseBtn + (!sb.shotClockRunning ? ' ' + styles.scPauseBtnActive : '')}
                    onClick={toggleShotClock}
                    title={sb.shotClockRunning ? 'Pause shot clock' : 'Resume shot clock'}
                  >
                    {sb.shotClockRunning ? '⏸' : '▶'}
                  </button>
                </div>
              </div>
              <button className={styles.nextPeriodBtn} onClick={nextPeriod}>Next Period</button>
              <button className={styles.resetFoulsBtn} onClick={resetFouls}>Reset Fouls</button>
            </div>

            {/* Away */}
            <div className={styles.teamCol}>
              {/* Logo upload */}
              <div className={styles.logoWrap}>
                {sb.awayLogoData
                  ? <div className={styles.logoPreviewWrap}>
                      <img className={styles.logoPreview} src={sb.awayLogoData} alt="Away logo" />
                      <button className={styles.logoClear} onClick={() => clearLogo('away')} title="Remove logo">✕</button>
                    </div>
                  : <button className={styles.logoUploadBtn} onClick={() => awayLogoRef.current?.click()}>
                      📷 Logo
                    </button>
                }
                <input ref={awayLogoRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handleLogoUpload('away', e.target.files[0])} />
              </div>
              <input className={styles.teamName + ' ' + styles.awayTeam}
                value={sb.awayName} onChange={e => setSb(p => ({ ...p, awayName: e.target.value }))} />
              <div className={styles.score} style={{ color: theme.awayColor }}>{sb.awayScore}</div>
              <div className={styles.scoreBtns}>
                <button className={styles.pts} onClick={() => addScore('away', 1)}>+1</button>
                <button className={styles.pts} onClick={() => addScore('away', 2)}>+2</button>
                <button className={styles.pts} onClick={() => addScore('away', 3)}>+3</button>
                <button className={styles.ptsAdj} onClick={() => adjustScore('away', -1)}>−1</button>
              </div>
              <div className={styles.foulsRow}>
                <span className={styles.foulsLabel}>FOULS</span>
                <button className={styles.foulBtn} onClick={() => addFoul('away')}>{sb.awayFouls}</button>
              </div>
              <div className={styles.timeoutsRow}>
                <span className={styles.toLabel}>TIMEOUTS</span>
                <div className={styles.toDots}>
                  {Array.from({ length: sb.maxTimeouts }).map((_, i) => (
                    <button key={i} className={styles.toDot + (i < sb.awayTimeouts ? ' ' + styles.toDotOn : '')}
                      onClick={() => useTimeout('away')} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Possession */}
          <div className={styles.possRow}>
            <button className={styles.possBtn + (sb.possession === 'home' ? ' ' + styles.possBtnActive : '')}
              onClick={() => setSb(p => ({ ...p, possession: p.possession === 'home' ? null : 'home' }))}>
              ▶ {sb.homeName}
            </button>
            <span className={styles.possLabel}>POSSESSION</span>
            <button className={styles.possBtn + (sb.possession === 'away' ? ' ' + styles.possBtnActive : '')}
              onClick={() => setSb(p => ({ ...p, possession: p.possession === 'away' ? null : 'away' }))}>
              {sb.awayName} ▶
            </button>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/viewer" target="_blank" className={styles.actionBtn}>👁 Viewer</Link>
            <Link href="/overlay" target="_blank" className={styles.actionBtn}>🎬 Overlay</Link>
            <Link href="/stats" target="_blank" className={styles.actionBtn}>📊 Stats</Link>
            <button className={styles.actionBtn} onClick={saveGame}>💾 Save Game</button>
            <button className={styles.actionBtnDanger} onClick={resetAll}>↺ Reset</button>
          </div>

          {/* Theme */}
          <div className={styles.themeRow}>
            {THEMES.map(t => (
              <button key={t.name}
                className={styles.themeSwatch + (sb.theme === t.name ? ' ' + styles.themeSwatchActive : '')}
                style={{ background: t.homeColor }}
                title={t.label}
                onClick={() => setSb(prev => ({ ...prev, theme: t.name }))} />
            ))}
          </div>

          {/* Minutes per quarter modal */}
          {showMinutesModal && (
            <div className={styles.modalOverlay} onClick={() => setShowMinutesModal(false)}>
              <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalTitle}>Quarter Duration</div>
                <div className={styles.modalSub}>Select or enter minutes per quarter</div>
                <div className={styles.minPresets}>
                  {[5, 8, 10, 12].map(m => (
                    <button key={m}
                      className={styles.minPreset + (sb.minutesPerQuarter === m ? ' ' + styles.minPresetActive : '')}
                      onClick={() => setMinutes(m)}>
                      {m} min
                    </button>
                  ))}
                </div>
                <div className={styles.minCustomRow}>
                  <span className={styles.minCustomLabel}>Custom:</span>
                  <input
                    className={styles.minCustomInput}
                    type="number" min={1} max={60}
                    defaultValue={sb.minutesPerQuarter}
                    id="customMinInput"
                  />
                  <button className={styles.minCustomApply} onClick={() => {
                    const el = document.getElementById('customMinInput') as HTMLInputElement
                    const v = parseInt(el.value)
                    if (v > 0 && v <= 60) setMinutes(v)
                  }}>Apply</button>
                </div>
                <button className={styles.modalClose} onClick={() => setShowMinutesModal(false)}>✕ Close</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ROSTER TAB ──────────────────────────────────── */}
      {activeTab === 'roster' && (
        <div className={styles.rosterTab}>
          {(['home','away'] as Side[]).map(side => (
            <div key={side} className={styles.rosterCol}>
              <div className={styles.rosterHeader} style={{ color: side === 'home' ? theme.homeColor : theme.awayColor }}>
                {side === 'home' ? sb.homeName : sb.awayName}
              </div>
              <div className={styles.addPlayerForm}>
                <input className={styles.rosterInput} style={{ width: 48 }}
                  placeholder="#" value={side === 'home' ? homeNumInput : awayNumInput}
                  onChange={e => side === 'home' ? setHomeNumInput(e.target.value) : setAwayNumInput(e.target.value)} />
                <input className={styles.rosterInput} style={{ flex: 1 }}
                  placeholder="Player name"
                  value={side === 'home' ? homeNameInput : awayNameInput}
                  onChange={e => side === 'home' ? setHomeNameInput(e.target.value) : setAwayNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPlayer(side)} />
                <select className={styles.rosterInput} style={{ width: 56 }}
                  value={side === 'home' ? homePosInput : awayPosInput}
                  onChange={e => side === 'home' ? setHomePosInput(e.target.value) : setAwayPosInput(e.target.value)}>
                  {['G','SG','SF','PF','C'].map(p => <option key={p}>{p}</option>)}
                </select>
                <button className={styles.addBtn} onClick={() => addPlayer(side)}>+ Add</button>
              </div>
              <div className={styles.rosterList}>
                {roster[side].length === 0 && <div className={styles.emptyRoster}>No players yet.</div>}
                {roster[side].map(p => (
                  <div key={p.id} className={styles.rosterItem}>
                    <span className={styles.pNum}>#{p.number}</span>
                    <span className={styles.pName}>{p.name}</span>
                    <span className={styles.pPos}>{p.position}</span>
                    <button className={styles.delBtn} onClick={() => removePlayer(side, p.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── STATS TAB ───────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className={styles.statsTab}>
          <div className={styles.statSideBtns}>
            <button className={styles.sidePill + (statSide === 'home' ? ' ' + styles.sidePillActive : '')}
              style={statSide === 'home' ? { background: theme.homeColor, color: '#000', borderColor: theme.homeColor } : {}}
              onClick={() => setStatSide('home')}>{sb.homeName}</button>
            <button className={styles.sidePill + (statSide === 'away' ? ' ' + styles.sidePillActive : '')}
              style={statSide === 'away' ? { background: theme.awayColor, color: '#000', borderColor: theme.awayColor } : {}}
              onClick={() => setStatSide('away')}>{sb.awayName}</button>
          </div>
          <div className={styles.playerSelect}>
            {roster[statSide].map(p => (
              <button key={p.id}
                className={styles.playerChip + (selectedPlayer?.id === p.id ? ' ' + styles.playerChipActive : '')}
                onClick={() => setSelectedPlayer(selectedPlayer?.id === p.id ? null : { side: statSide, id: p.id })}>
                #{p.number} {p.name}
              </button>
            ))}
            {roster[statSide].length === 0 && <div className={styles.emptyRoster}>Add players in the Roster tab first.</div>}
          </div>
          {selectedPlayer && selectedPlayer.side === statSide && (
            <div className={styles.statBtns}>
              {(['pts','reb','ast','stl','blk','to','pf'] as (keyof PlayerStats)[]).map(stat => {
                const s = stats[statSide][selectedPlayer.id]?.[stat] ?? 0
                return (
                  <button key={stat} className={styles.statBtn}
                    onClick={() => recordStat(statSide, selectedPlayer.id, stat)}>
                    <span className={styles.statBtnLabel}>{stat.toUpperCase()}</span>
                    <span className={styles.statBtnVal}>{s}</span>
                  </button>
                )
              })}
            </div>
          )}
          {/* Live box score */}
          <div className={styles.miniBox}>
            {(['home','away'] as Side[]).map(side => (
              <div key={side}>
                <div className={styles.miniBoxHeader} style={{ color: side === 'home' ? theme.homeColor : theme.awayColor }}>
                  {side === 'home' ? sb.homeName : sb.awayName}
                </div>
                {roster[side].length === 0
                  ? <div className={styles.emptyRoster}>No players.</div>
                  : <table className={styles.boxTable}>
                      <thead><tr>
                        <th>#</th><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th>
                      </tr></thead>
                      <tbody>
                        {roster[side].map(p => {
                          const s = stats[side][p.id] || blankStats()
                          return <tr key={p.id}>
                            <td>{p.number}</td><td>{p.name}</td>
                            <td>{s.pts}</td><td>{s.reb}</td><td>{s.ast}</td>
                            <td>{s.stl}</td><td>{s.blk}</td><td>{s.to}</td><td>{s.pf}</td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STANDINGS TAB ───────────────────────────────── */}
      {activeTab === 'standings' && (
        <div className={styles.standingsTab}>
          {standings.length === 0
            ? <div className={styles.emptyState}>No standings yet. Save a game to start tracking.</div>
            : <table className={styles.standingsTable}>
                <thead><tr>
                  <th>Team</th><th>W</th><th>L</th><th>PCT</th><th>PF</th><th>PA</th><th>+/-</th><th>Streak</th>
                </tr></thead>
                <tbody>
                  {[...standings].sort((a,b) => {
                    const pa = a.w+a.l > 0 ? a.w/(a.w+a.l) : 0
                    const pb = b.w+b.l > 0 ? b.w/(b.w+b.l) : 0
                    return pb - pa
                  }).map(t => (
                    <tr key={t.name}>
                      <td className={styles.tdTeam}>{t.name}</td>
                      <td>{t.w}</td><td>{t.l}</td>
                      <td>{t.w+t.l > 0 ? (t.w/(t.w+t.l)).toFixed(3).replace('0.','.') : '.000'}</td>
                      <td>{t.pf}</td><td>{t.pa}</td>
                      <td className={t.pf - t.pa >= 0 ? styles.pos : styles.neg}>{t.pf - t.pa > 0 ? '+' : ''}{t.pf - t.pa}</td>
                      <td className={t.streak.startsWith('W') ? styles.streakW : styles.streakL}>{t.streak}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className={styles.historyTab}>
          {history.length === 0
            ? <div className={styles.emptyState}>No saved games yet.</div>
            : history.map((g, i) => <GameCard key={g.id} game={g} onDelete={() => {
                const next = history.filter(x => x.id !== g.id)
                setHistory(next); DB.set('history', next)
              }} homeColor={theme.homeColor} awayColor={theme.awayColor} />)
          }
        </div>
      )}
    </div>
  )
}

function GameCard({ game, onDelete, homeColor, awayColor }: {
  game: GameRecord; onDelete: () => void
  homeColor: string; awayColor: string
}) {
  const [open, setOpen] = useState(false)
  const winner = game.homeScore > game.awayScore ? 'home' : 'away'
  return (
    <div className={styles.gameCard}>
      <div className={styles.gameCardTop}>
        <span className={styles.gameDate}>{game.date}</span>
        <div className={styles.gameResult}>
          <span style={{ color: winner === 'home' ? homeColor : 'inherit' }}>{game.homeName}</span>
          <strong style={{ color: winner === 'home' ? homeColor : 'inherit' }}>{game.homeScore}</strong>
          <span className={styles.gameDash}>—</span>
          <strong style={{ color: winner === 'away' ? awayColor : 'inherit' }}>{game.awayScore}</strong>
          <span style={{ color: winner === 'away' ? awayColor : 'inherit' }}>{game.awayName}</span>
        </div>
        <div className={styles.gameCardActions}>
          <button className={styles.boxScoreToggle} onClick={() => setOpen(p => !p)}>
            {open ? '▲ Hide' : '▼ Box Score'}
          </button>
          <button className={styles.deleteBtn} onClick={() => confirm('Delete this game?') && onDelete()}>✕</button>
        </div>
      </div>
      {open && (
        <div className={styles.boxScoreWrap}>
          {(['home','away'] as Side[]).map(side => (
            <div key={side}>
              <div className={styles.miniBoxHeader} style={{ color: side === 'home' ? homeColor : awayColor }}>
                {side === 'home' ? game.homeName : game.awayName}
              </div>
              {game.boxScore[side].length === 0
                ? <div className={styles.emptyRoster}>No player data.</div>
                : <table className={styles.boxTable}>
                    <thead><tr>
                      <th>#</th><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th>
                    </tr></thead>
                    <tbody>
                      {game.boxScore[side].map(p => (
                        <tr key={p.id}>
                          <td>{p.number}</td><td>{p.name}</td>
                          <td>{p.stats.pts}</td><td>{p.stats.reb}</td><td>{p.stats.ast}</td>
                          <td>{p.stats.stl}</td><td>{p.stats.blk}</td><td>{p.stats.to}</td><td>{p.stats.pf}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
