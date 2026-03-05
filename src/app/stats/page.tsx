'use client'
import { useState, useEffect } from 'react'
import { DB, ScoreboardDB, blankStats, getTheme } from '@/lib/game'
import type { Roster, StatsMap, TeamStanding, GameRecord, Side, PlayerStats } from '@/types'
import styles from './stats.module.css'

type StatsTab = 'leaders' | 'boxscore' | 'standings' | 'history'
type LeaderStat = 'pts' | 'reb' | 'ast' | 'stl' | 'blk'

export default function StatsPage() {
  const [tab, setTab] = useState<StatsTab>('leaders')
  const [leaderStat, setLeaderStat] = useState<LeaderStat>('pts')
  const [roster, setRoster] = useState<Roster>({ home: [], away: [] })
  const [stats, setStats] = useState<StatsMap>({ home: {}, away: {} })
  const [standings, setStandings] = useState<TeamStanding[]>([])
  const [history, setHistory] = useState<GameRecord[]>([])
  const [sbState, setSbState] = useState(ScoreboardDB.get())
  const [openGame, setOpenGame] = useState<string | null>(null)

  useEffect(() => {
    setRoster(DB.get<Roster>('roster') || { home: [], away: [] })
    setStats(DB.get<StatsMap>('stats') || { home: {}, away: {} })
    setStandings(DB.get<TeamStanding[]>('standings') || [])
    setHistory(DB.get<GameRecord[]>('history') || [])
    const id = setInterval(() => {
      setSbState(ScoreboardDB.get())
      setRoster(DB.get<Roster>('roster') || { home: [], away: [] })
      setStats(DB.get<StatsMap>('stats') || { home: {}, away: {} })
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const theme = getTheme(sbState?.theme ?? 'default')

  function getLeaders(stat: LeaderStat) {
    const all: { name: string; team: string; side: Side; val: number }[] = []
    ;(['home','away'] as Side[]).forEach(side => {
      ;(roster[side] || []).forEach(p => {
        const s = stats[side]?.[p.id]
        if (s) all.push({ name: p.name, team: side === 'home' ? (sbState?.homeName ?? 'Home') : (sbState?.awayName ?? 'Away'), side, val: s[stat] })
      })
    })
    return all.sort((a,b) => b.val - a.val).slice(0, 10)
  }

  function getSeasonLeaders(stat: LeaderStat) {
    const totals: Record<string, { name: string; val: number }> = {}
    history.forEach(g => {
      ;(['home','away'] as Side[]).forEach(side => {
        g.boxScore[side].forEach(p => {
          if (!totals[p.id]) totals[p.id] = { name: p.name, val: 0 }
          totals[p.id].val += p.stats[stat]
        })
      })
    })
    return Object.values(totals).sort((a,b) => b.val - a.val).slice(0, 10)
  }

  return (
    <div className={styles.shell} style={{ '--home-color': theme.homeColor, '--away-color': theme.awayColor } as React.CSSProperties}>
      <div className={styles.topBar}>
        <div className={styles.brand}>🏀 {sbState?.leagueName ?? 'Hoops'} — Stats</div>
        <div className={styles.liveChip + (sbState?.timerRunning ? ' ' + styles.live : '')}>
          {sbState?.timerRunning ? '🔴 LIVE' : 'PAUSED'}
        </div>
      </div>

      <div className={styles.tabs}>
        {(['leaders','boxscore','standings','history'] as StatsTab[]).map(t => (
          <button key={t} className={styles.tab + (tab === t ? ' ' + styles.tabActive : '')} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {/* Leaders */}
        {tab === 'leaders' && (
          <div>
            <div className={styles.statPills}>
              {(['pts','reb','ast','stl','blk'] as LeaderStat[]).map(s => (
                <button key={s} className={styles.pill + (leaderStat === s ? ' ' + styles.pillActive : '')}
                  onClick={() => setLeaderStat(s)}>{s.toUpperCase()}</button>
              ))}
            </div>
            <h3 className={styles.sectionHead}>Current Game Leaders</h3>
            {getLeaders(leaderStat).length === 0
              ? <div className={styles.empty}>No stats yet.</div>
              : getLeaders(leaderStat).map((l, i) => (
                  <div key={i} className={styles.leaderRow}>
                    <span className={styles.rank}>{i + 1}</span>
                    <span className={styles.lName}>{l.name}</span>
                    <span className={styles.lTeam} style={{ color: l.side === 'home' ? theme.homeColor : theme.awayColor }}>{l.team}</span>
                    <span className={styles.lVal}>{l.val}</span>
                  </div>
                ))
            }
            <h3 className={styles.sectionHead} style={{ marginTop: 24 }}>Season Leaders</h3>
            {getSeasonLeaders(leaderStat).length === 0
              ? <div className={styles.empty}>No season data. Save games to track season stats.</div>
              : getSeasonLeaders(leaderStat).map((l, i) => (
                  <div key={i} className={styles.leaderRow}>
                    <span className={styles.rank}>{i + 1}</span>
                    <span className={styles.lName}>{l.name}</span>
                    <span className={styles.lVal}>{l.val}</span>
                  </div>
                ))
            }
          </div>
        )}

        {/* Box Score */}
        {tab === 'boxscore' && (
          <div>
            {(['home','away'] as Side[]).map(side => (
              <div key={side} className={styles.boxSection}>
                <div className={styles.boxTeamHead} style={{ color: side === 'home' ? theme.homeColor : theme.awayColor }}>
                  {side === 'home' ? (sbState?.homeName ?? 'Home') : (sbState?.awayName ?? 'Away')}
                  <span className={styles.boxScore}>{side === 'home' ? sbState?.homeScore : sbState?.awayScore}</span>
                </div>
                {roster[side].length === 0
                  ? <div className={styles.empty}>No players.</div>
                  : <table className={styles.table}>
                      <thead><tr><th>#</th><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th></tr></thead>
                      <tbody>
                        {roster[side].map(p => {
                          const s = stats[side][p.id] || blankStats()
                          return <tr key={p.id}>
                            <td>{p.number}</td><td className={styles.tdName}>{p.name}</td>
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
        )}

        {/* Standings */}
        {tab === 'standings' && (
          <div>
            {standings.length === 0
              ? <div className={styles.empty}>No standings yet. Save a game to start tracking.</div>
              : <table className={styles.table}>
                  <thead><tr><th>Team</th><th>W</th><th>L</th><th>PCT</th><th>PF</th><th>PA</th><th>+/-</th><th>Streak</th></tr></thead>
                  <tbody>
                    {[...standings].sort((a,b) => {
                      const pa = a.w+a.l>0?a.w/(a.w+a.l):0, pb = b.w+b.l>0?b.w/(b.w+b.l):0
                      return pb - pa
                    }).map(t => (
                      <tr key={t.name}>
                        <td className={styles.tdName}>{t.name}</td>
                        <td>{t.w}</td><td>{t.l}</td>
                        <td>{t.w+t.l>0?(t.w/(t.w+t.l)).toFixed(3).replace('0.','.'):'.000'}</td>
                        <td>{t.pf}</td><td>{t.pa}</td>
                        <td className={t.pf-t.pa>=0 ? styles.pos : styles.neg}>{t.pf-t.pa>0?'+':''}{t.pf-t.pa}</td>
                        <td className={t.streak.startsWith('W') ? styles.streakW : styles.streakL}>{t.streak}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className={styles.historyList}>
            {history.length === 0 ? <div className={styles.empty}>No saved games.</div>
              : history.map(g => {
                  const isOpen = openGame === g.id
                  const winner = g.homeScore > g.awayScore ? 'home' : 'away'
                  return (
                    <div key={g.id} className={styles.histCard}>
                      <div className={styles.histTop} onClick={() => setOpenGame(isOpen ? null : g.id)}>
                        <span className={styles.histDate}>{g.date}</span>
                        <div className={styles.histResult}>
                          <span style={{ color: winner === 'home' ? theme.homeColor : '' }}>{g.homeName}</span>
                          <strong style={{ color: winner === 'home' ? theme.homeColor : '' }}>{g.homeScore}</strong>
                          <span className={styles.histDash}>—</span>
                          <strong style={{ color: winner === 'away' ? theme.awayColor : '' }}>{g.awayScore}</strong>
                          <span style={{ color: winner === 'away' ? theme.awayColor : '' }}>{g.awayName}</span>
                        </div>
                        <span className={styles.histToggle}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                      {isOpen && (
                        <div className={styles.histBox}>
                          {(['home','away'] as Side[]).map(side => (
                            <div key={side}>
                              <div className={styles.boxTeamHead} style={{ color: side === 'home' ? theme.homeColor : theme.awayColor }}>
                                {side === 'home' ? g.homeName : g.awayName}
                              </div>
                              {g.boxScore[side].length === 0
                                ? <div className={styles.empty}>No data.</div>
                                : <table className={styles.table}>
                                    <thead><tr><th>#</th><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th></tr></thead>
                                    <tbody>
                                      {g.boxScore[side].map(p => (
                                        <tr key={p.id}>
                                          <td>{p.number}</td><td className={styles.tdName}>{p.name}</td>
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
                })
            }
          </div>
        )}
      </div>
    </div>
  )
}
