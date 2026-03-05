'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DB, ScoreboardDB, blankStats, formatClock } from '@/lib/game'
import type { Roster, StatsMap, TeamStanding, GameRecord, UpcomingGame } from '@/types'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const supabase = createClient()
  const [userName, setUserName] = useState('Coach')
  const [userInitial, setUserInitial] = useState('C')
  const [today, setToday] = useState('')
  const [liveState, setLiveState] = useState<ReturnType<typeof ScoreboardDB.get>>(null)
  const [statTab, setStatTab] = useState<'pts'|'reb'|'ast'>('pts')
  const [upcoming, setUpcoming] = useState<UpcomingGame[]>([])
  const [upTeams, setUpTeams] = useState('')
  const [upDate, setUpDate] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const u = data.session.user
      const name = u.user_metadata?.display_name || u.email?.split('@')[0] || 'Coach'
      setUserName(name)
      setUserInitial(name.charAt(0).toUpperCase())
    })
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
    setUpcoming(JSON.parse(localStorage.getItem('dash_upcoming') || '[]'))

    const refresh = () => setLiveState(ScoreboardDB.get())
    refresh()
    const id = setInterval(refresh, 2000)
    return () => clearInterval(id)
  }, [])

  const roster = DB.get<Roster>('roster') || { home: [], away: [] }
  const stats  = DB.get<StatsMap>('stats') || { home: {}, away: {} }
  const standings = DB.get<TeamStanding[]>('standings') || []
  const history   = DB.get<GameRecord[]>('history') || []

  function getLeaders(stat: 'pts'|'reb'|'ast') {
    const all: { name: string, val: number }[] = []
    ;(['home','away'] as const).forEach(side => {
      ;(roster[side] || []).forEach(p => {
        const s = stats[side]?.[p.id]
        if (s) all.push({ name: p.name, val: s[stat] })
      })
    })
    return all.sort((a,b) => b.val - a.val).slice(0, 5)
  }

  function addUpcoming() {
    if (!upTeams.trim()) return
    const next = [...upcoming, { teams: upTeams.trim(), date: upDate }]
    setUpcoming(next)
    localStorage.setItem('dash_upcoming', JSON.stringify(next))
    setUpTeams(''); setUpDate('')
  }
  function removeUpcoming(i: number) {
    const next = upcoming.filter((_, idx) => idx !== i)
    setUpcoming(next)
    localStorage.setItem('dash_upcoming', JSON.stringify(next))
  }

  const fmt = (cs: number) => {
    const m = Math.floor(cs / 6000), s = Math.floor((cs % 6000) / 100)
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const live = liveState
  const isLive = live && (live.timerRunning || live.homeScore > 0 || live.awayScore > 0)

  return (
    <div className={styles.shell}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>🏀 Hoops Pro</div>
        <div className={styles.navRight}>
          <div className={styles.avatar}>{userInitial}</div>
          <span className={styles.navName}>{userName}</span>
          <button className={styles.signOutBtn} onClick={async () => {
            await supabase.auth.signOut(); window.location.href = '/login'
          }}>Sign Out</button>
        </div>
      </nav>

      {/* Welcome */}
      <div className={styles.welcome}>
        <div>
          <h1 className={styles.welcomeH}>Welcome back, {userName}!</h1>
          <div className={styles.welcomeDate}>{today}</div>
        </div>
        <div className={styles.quickLinks}>
          <Link href="/scoreboard" className={styles.quickBtn} style={{ background: '#FF5E1A', color: '#000' }}>🏀 Scoreboard</Link>
          <Link href="/viewer" target="_blank" className={styles.quickBtn}>👁 Viewer</Link>
          <Link href="/overlay" target="_blank" className={styles.quickBtn}>🎬 Overlay</Link>
          <Link href="/stats" target="_blank" className={styles.quickBtn}>📊 Stats</Link>
        </div>
      </div>

      {/* Cards */}
      <div className={styles.grid}>

        {/* Live Score */}
        <div className={styles.card + ' ' + styles.cardWide}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Live Scoreboard</span>
            <span className={styles.badge + (live?.timerRunning ? ' ' + styles.badgeLive : '')}>{live?.timerRunning ? 'LIVE' : 'PAUSED'}</span>
          </div>
          {!isLive
            ? <div className={styles.noGame}>No active game. <Link href="/scoreboard">Open the scoreboard</Link> to start one.</div>
            : <div className={styles.liveScore}>
                <div className={styles.liveTeam}>
                  <span className={styles.liveTeamName} style={{ color: '#FF5E1A' }}>{live?.homeName}</span>
                  <span className={styles.liveScoreNum}>{live?.homeScore}</span>
                </div>
                <div className={styles.liveMid}>
                  <div className={styles.liveClock}>{fmt(live?.quarterClock ?? 0)}</div>
                  <div className={styles.livePeriod}>Q{live?.period}</div>
                </div>
                <div className={styles.liveTeam}>
                  <span className={styles.liveTeamName} style={{ color: '#00C2FF' }}>{live?.awayName}</span>
                  <span className={styles.liveScoreNum}>{live?.awayScore}</span>
                </div>
              </div>
          }
        </div>

        {/* Stat Leaders */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Stat Leaders</span>
            <div className={styles.statTabs}>
              {(['pts','reb','ast'] as const).map(s => (
                <button key={s} className={styles.statTab + (statTab === s ? ' ' + styles.statTabActive : '')}
                  onClick={() => setStatTab(s)}>{s.toUpperCase()}</button>
              ))}
            </div>
          </div>
          {getLeaders(statTab).length === 0
            ? <div className={styles.empty}>No stats yet.</div>
            : getLeaders(statTab).map((l, i) => (
                <div key={i} className={styles.leaderRow}>
                  <span className={styles.leaderRank}>{i + 1}</span>
                  <span className={styles.leaderName}>{l.name}</span>
                  <span className={styles.leaderVal}>{l.val}</span>
                </div>
              ))
          }
        </div>

        {/* Standings */}
        <div className={styles.card}>
          <div className={styles.cardHead}><span className={styles.cardTitle}>Standings</span></div>
          {standings.length === 0
            ? <div className={styles.empty}>No standings yet.</div>
            : <table className={styles.miniTable}>
                <thead><tr><th>Team</th><th>W</th><th>L</th><th>PCT</th></tr></thead>
                <tbody>
                  {[...standings].sort((a,b) => {
                    const pa = a.w+a.l>0?a.w/(a.w+a.l):0, pb = b.w+b.l>0?b.w/(b.w+b.l):0
                    return pb-pa
                  }).slice(0,6).map(t => (
                    <tr key={t.name}>
                      <td>{t.name}</td><td>{t.w}</td><td>{t.l}</td>
                      <td>{t.w+t.l>0?(t.w/(t.w+t.l)).toFixed(3).replace('0.','.'):'.000'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>

        {/* Roster */}
        <div className={styles.card}>
          <div className={styles.cardHead}><span className={styles.cardTitle}>Roster</span></div>
          {roster.home.length + roster.away.length === 0
            ? <div className={styles.empty}>No players yet. <Link href="/scoreboard">Add via Scoreboard</Link></div>
            : <div className={styles.rosterChips}>
                {roster.home.map(p => <span key={p.id} className={styles.chip} style={{ borderColor: '#FF5E1A' }}>#{p.number} {p.name}</span>)}
                {roster.away.map(p => <span key={p.id} className={styles.chip} style={{ borderColor: '#00C2FF' }}>#{p.number} {p.name}</span>)}
              </div>
          }
        </div>

        {/* Recent Games */}
        <div className={styles.card}>
          <div className={styles.cardHead}><span className={styles.cardTitle}>Recent Games</span></div>
          {history.length === 0
            ? <div className={styles.empty}>No games saved yet.</div>
            : history.slice(0, 5).map(g => (
                <div key={g.id} className={styles.recentGame}>
                  <span className={styles.recentDate}>{g.date}</span>
                  <span className={styles.recentTeams}>{g.homeName} {g.homeScore} — {g.awayScore} {g.awayName}</span>
                </div>
              ))
          }
        </div>

        {/* Schedule */}
        <div className={styles.card}>
          <div className={styles.cardHead}><span className={styles.cardTitle}>Schedule</span></div>
          <div className={styles.scheduleForm}>
            <input className={styles.schedInput} placeholder="Home vs Away"
              value={upTeams} onChange={e => setUpTeams(e.target.value)} />
            <input className={styles.schedInput} type="date"
              value={upDate} onChange={e => setUpDate(e.target.value)} style={{ maxWidth: 130 }} />
            <button className={styles.addGameBtn} onClick={addUpcoming}>+ Add</button>
          </div>
          {upcoming.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((g, i) => (
            <div key={i} className={styles.schedItem}>
              <span className={styles.schedDate}>{g.date ? new Date(g.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}</span>
              <span className={styles.schedTeams}>{g.teams}</span>
              <button className={styles.delUpcoming} onClick={() => removeUpcoming(i)}>✕</button>
            </div>
          ))}
          {upcoming.length === 0 && <div className={styles.empty}>No scheduled games.</div>}
        </div>

      </div>
    </div>
  )
}
