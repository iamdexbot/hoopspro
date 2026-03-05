'use client'
import { useState, useEffect } from 'react'
import { ScoreboardDB, formatClock, formatShotClock, getTheme } from '@/lib/game'
import type { ScoreboardState } from '@/types'
import styles from './viewer.module.css'

export default function ViewerPage() {
  const [sb, setSb] = useState<ScoreboardState | null>(null)

  useEffect(() => {
    const refresh = () => setSb(ScoreboardDB.get())
    refresh()
    const id = setInterval(refresh, 50)
    return () => clearInterval(id)
  }, [])

  if (!sb) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#333', letterSpacing: 4 }}>
      WAITING FOR GAME...
    </div>
  )

  const theme = getTheme(sb.theme)
  const qFmt = formatClock(sb.quarterClock)
  const scFmt = formatShotClock(sb.shotClock)
  const scWarn = sb.shotClock <= 800
  const scCrit = sb.shotClock <= 500
  const period = sb.period <= 4 ? ['1ST','2ND','3RD','4TH'][sb.period - 1] : `OT${sb.period - 4}`

  return (
    <div className={styles.shell} style={{
      background: theme.bg,
      '--home-color': theme.homeColor,
      '--away-color': theme.awayColor,
    } as React.CSSProperties}>
      <div className={styles.board}>

        {/* ── HOME ──────────────────────────────────────── */}
        <div className={styles.teamPane}>
          {/* Possession arrow */}
          <div className={styles.possWrap}>
            {sb.possession === 'home' && (
              <div className={styles.possArrow} style={{ color: theme.homeColor }}>▶</div>
            )}
          </div>

          {/* Logo */}
          {sb.homeLogoData
            ? <img className={styles.logo} src={sb.homeLogoData} alt="Home logo" />
            : <div className={styles.logoPlaceholder} style={{ borderColor: theme.homeColor }} />
          }

          <div className={styles.teamName} style={{ color: theme.homeColor }}>{sb.homeName}</div>
          <div className={styles.bigScore} style={{ color: theme.homeColor }}>{sb.homeScore}</div>

          {/* Foul indicator */}
          <div className={styles.indicatorBlock}>
            <div className={styles.indicatorLabel}>FOULS</div>
            <div className={styles.foulRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={styles.foulPip + (i < sb.homeFouls ? ' ' + styles.foulPipOn : '')} />
              ))}
              <span className={styles.indicatorCount} style={{ color: theme.homeColor }}>{sb.homeFouls}</span>
            </div>
          </div>

          {/* Timeout indicator */}
          <div className={styles.indicatorBlock}>
            <div className={styles.indicatorLabel}>TIMEOUTS</div>
            <div className={styles.toRow}>
              {Array.from({ length: sb.maxTimeouts }).map((_, i) => (
                <div key={i} className={styles.toPip + (i < sb.homeTimeouts ? ' ' + styles.toPipOn : '')} />
              ))}
              <span className={styles.indicatorCount} style={{ color: theme.homeColor }}>{sb.homeTimeouts}</span>
            </div>
          </div>
        </div>

        {/* ── CENTER ────────────────────────────────────── */}
        <div className={styles.center}>
          <div className={styles.period}>{period}</div>
          <div className={styles.clock + (sb.timerRunning ? ' ' + styles.clockRunning : '')}>{qFmt}</div>
          <div className={styles.scBlock}>
            <div className={styles.scLabel}>SHOT CLOCK</div>
            <div className={styles.shotClock + (scCrit ? ' ' + styles.scCrit : scWarn ? ' ' + styles.scWarn : '')}>{scFmt}</div>
          </div>
          <div className={styles.leagueName}>{sb.leagueName}</div>
        </div>

        {/* ── AWAY ──────────────────────────────────────── */}
        <div className={styles.teamPane + ' ' + styles.awayPane}>
          {/* Possession arrow */}
          <div className={styles.possWrap}>
            {sb.possession === 'away' && (
              <div className={styles.possArrow} style={{ color: theme.awayColor }}>▶</div>
            )}
          </div>

          {/* Logo */}
          {sb.awayLogoData
            ? <img className={styles.logo} src={sb.awayLogoData} alt="Away logo" />
            : <div className={styles.logoPlaceholder} style={{ borderColor: theme.awayColor }} />
          }

          <div className={styles.teamName} style={{ color: theme.awayColor }}>{sb.awayName}</div>
          <div className={styles.bigScore} style={{ color: theme.awayColor }}>{sb.awayScore}</div>

          {/* Foul indicator */}
          <div className={styles.indicatorBlock}>
            <div className={styles.indicatorLabel}>FOULS</div>
            <div className={styles.foulRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={styles.foulPip + (i < sb.awayFouls ? ' ' + styles.foulPipOn : '')} />
              ))}
              <span className={styles.indicatorCount} style={{ color: theme.awayColor }}>{sb.awayFouls}</span>
            </div>
          </div>

          {/* Timeout indicator */}
          <div className={styles.indicatorBlock}>
            <div className={styles.indicatorLabel}>TIMEOUTS</div>
            <div className={styles.toRow}>
              {Array.from({ length: sb.maxTimeouts }).map((_, i) => (
                <div key={i} className={styles.toPip + (i < sb.awayTimeouts ? ' ' + styles.toPipOn : '')} />
              ))}
              <span className={styles.indicatorCount} style={{ color: theme.awayColor }}>{sb.awayTimeouts}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
