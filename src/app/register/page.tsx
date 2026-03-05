'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const supabase = createClient()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  async function handleRegister() {
    setErr(''); setOk('')
    if (!displayName) { setErr('Please enter a display name.'); return }
    if (!email)       { setErr('Please enter your email.'); return }
    if (pw.length < 8){ setErr('Password must be at least 8 characters.'); return }
    if (pw !== pw2)   { setErr('Passwords do not match.'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email, password: pw,
      options: { data: { display_name: displayName } },
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    if (data.user && !data.session) {
      setOk('Account created! Check your email to confirm, then sign in.')
    } else if (data.session) {
      window.location.href = '/dashboard'
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setErr(error.message)
  }

  return (
    <div className="auth-body">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="auth-card">
        <div className="auth-top">
          <div className="auth-brand">🏀 Hoops Pro</div>
          <div className="auth-sub">Create Your Account</div>
        </div>
        <div className="auth-body-inner">
          <div className="auth-title">Sign Up</div>
          {err && <div className="msg err">{err}</div>}
          {ok  && <div className="msg ok">{ok}</div>}
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input className="form-input" type="text" placeholder="Your name or league name"
              value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@email.com"
              value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="At least 8 characters"
              value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
            <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--muted)', marginTop: 4 }}>Minimum 8 characters</div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" placeholder="Same password again"
              value={pw2} onChange={e => setPw2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()} autoComplete="new-password" />
          </div>
          <button className="btn-primary" onClick={handleRegister} disabled={loading}>
            {loading ? <><span className="spinner"/>Creating...</> : 'Create Account'}
          </button>
          <div className="divider-line"><span>or</span></div>
          <button className="btn-google" onClick={handleGoogle}>
            <GoogleIcon />
            Sign Up with Google
          </button>
          <div className="auth-footer">
            Already have an account? <Link href="/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
