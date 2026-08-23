import { useState } from 'react'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import type { User } from '../types'
import styles from './LoginScreen.module.css'

export default function LoginScreen() {
  const setAuth = useAppStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
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
      setAuth(res.user, res.token)
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
