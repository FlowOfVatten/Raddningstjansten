import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import type { User } from '../types'
import styles from './LoginScreen.module.css'

export default function LoginScreen() {
  const setAuth = useAppStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Capture invite token from URL so it survives login/register
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) sessionStorage.setItem('fl_pending_invite', invite)
  }, [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<{ user: User; token: string }>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        null,
        { email, password }
      )
      setAuth(res.user, res.token, remember)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.logo}>🛒 Familjelistan</h1>
        <form onSubmit={submit} className={styles.form}>
          <input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {error && <p className={styles.error}>{error}</p>}
          <label className={styles.rememberLabel}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Kom ihåg mig på den här enheten
          </label>
          <button type="submit" className={styles.primary} disabled={loading}>
            {loading ? '…' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
          </button>
        </form>
        <button
          className={styles.toggle}
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Skapa nytt konto' : 'Logga in istället'}
        </button>
      </div>
    </div>
  )
}
