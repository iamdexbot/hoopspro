'use client'
import { useState, useEffect } from 'react'
import { ScoreboardDB, formatClock, formatShotClock, getTheme } from '@/lib/game'
import type { ScoreboardState } from '@/types'
import styles from './overlay.module.css'

export default function OverlayPage() {
  const [sb, setSb] = useState<ScoreboardState | null>(null)

  useEffect(() => {
    const id = setInterval(() => setSb(ScoreboardDB.get()), 50)
    return () => clearInterval(id)
  }, [])

  if (!sb) return null

  const theme = getTheme(sb.theme)
  const qFmt = formatClock(sb.quarterClock)
  const scFmt = formatShotClock(sb.shotClock)
  const scWarn = sb.shotClock <= 800
  const scCrit = sb.shotClock <= 500
  const period = sb.period <= 4 ? ['1ST','2ND','3RD','4TH'][sb.period - 1] : `OT${sb.period - 4}`

  // Derive a subtle tinted bg from theme
  const boxBg = `rgba(8,8,8,.93)`
  const accentColor = theme.accent

  return (
    <div className={styles.shell}>
      <div className={styles.box} style={{ '--accent': accentColor, '--home': theme.homeColor, '--away': theme.awayColor } as React.CSSProperties}>

        {/* Header bar — tinted with accent */}
        <div className={styles.header} style={{ borderBottomColor: accentColor + '40' }}>
          <span className={styles.league} style={{ color: accentColor }}>{sb.leagueName}</span>
          <span className={styles.period}>{period}</span>
          <span className={styles.clock + (sb.timerRunning ? ' ' + styles.clockRunning : '')}>{qFmt}</span>
        </div>

        {/* Home row */}
        <div className={styles.row} style={{ borderBottomColor: theme.homeColor + '18' }}>
          {/* Possession indicator — left of logo */}
          <div className={styles.possSlot}>
            {sb.possession === 'home' && (
              <span className={styles.possIcon} style={{ color: theme.homeColor }}>🏀</span>
            )}
          </div>

          {/* Logo */}
          {sb.homeLogoData
            ? <img className={styles.logo} src={sb.homeLogoData} alt="" />
            : <div className={styles.logoColor} style={{ background: theme.homeColor }} />
          }

          {/* Team name */}
          <span className={styles.name} style={{ color: theme.homeColor }}>{sb.homeName}</span>

          {/* Fouls + Timeouts */}
          <div className={styles.meta}>
            <span className={styles.metaItem} style={{ color: theme.homeColor + 'cc' }}>
              <span className={styles.metaNum}>{sb.homeFouls}</span>
              <span className={styles.metaKey}>F</span>
            </span>
            <span className={styles.metaItem} style={{ color: theme.homeColor + 'cc' }}>
              <span className={styles.metaNum}>{sb.homeTimeouts}</span>
              <span className={styles.metaKey}>TO</span>
            </span>
          </div>

          {/* Score */}
          <span className={styles.score} style={{ color: theme.homeColor }}>{sb.homeScore}</span>
        </div>

        {/* Away row */}
        <div className={styles.row} style={{ borderBottomColor: theme.awayColor + '18' }}>
          {/* Possession indicator — left of logo */}
          <div className={styles.possSlot}>
            {sb.possession === 'away' && (
              <span className={styles.possIcon} style={{ color: theme.awayColor }}>🏀</span>
            )}
          </div>

          {/* Logo */}
          {sb.awayLogoData
            ? <img className={styles.logo} src={sb.awayLogoData} alt="" />
            : <div className={styles.logoColor} style={{ background: theme.awayColor }} />
          }

          {/* Team name */}
          <span className={styles.name} style={{ color: theme.awayColor }}>{sb.awayName}</span>

          {/* Fouls + Timeouts */}
          <div className={styles.meta}>
            <span className={styles.metaItem} style={{ color: theme.awayColor + 'cc' }}>
              <span className={styles.metaNum}>{sb.awayFouls}</span>
              <span className={styles.metaKey}>F</span>
            </span>
            <span className={styles.metaItem} style={{ color: theme.awayColor + 'cc' }}>
              <span className={styles.metaNum}>{sb.awayTimeouts}</span>
              <span className={styles.metaKey}>TO</span>
            </span>
          </div>

          {/* Score */}
          <span className={styles.score} style={{ color: theme.awayColor }}>{sb.awayScore}</span>
        </div>

        {/* Footer — shot clock RIGHT side */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <span className={styles.footerLabel}>QUARTER {sb.period <= 4 ? sb.period : `OT`}</span>
          </div>
          <div className={styles.shotClockWrap}>
            <span className={styles.shotClockLabel}>SHOT</span>
            <span
              className={styles.shotClock + (scCrit ? ' ' + styles.scCrit : scWarn ? ' ' + styles.scWarn : '')}
              style={!scWarn && !scCrit ? { color: accentColor } : {}}
            >{scFmt}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
