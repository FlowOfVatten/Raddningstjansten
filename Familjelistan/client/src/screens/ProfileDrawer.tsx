import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import styles from './ProfileDrawer.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ProfileDrawer({ open, onClose }: Props) {
  const user = useAppStore((s) => s.user)
  const token = useAppStore((s) => s.token)
  const clearAuth = useAppStore((s) => s.clearAuth)
  const setAuth = useAppStore((s) => s.setAuth)

  // Password section
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Invite section
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setPwMsg(null)
      setEmailMsg(null)
      setCopied(false)
    }
  }, [open])

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    setPwLoading(true)
    try {
      const res = await api.post<{ user: typeof user; token: string }>(
        '/auth/change-password',
        token,
        { currentPassword: pwCurrent, newPassword: pwNew }
      )
      const remember = !!localStorage.getItem('fl_token')
      setAuth(res.user!, res.token, remember)
      setPwCurrent('')
      setPwNew('')
      setPwMsg({ ok: true, text: 'Lösenordet är ändrat!' })
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Något gick fel' })
    } finally {
      setPwLoading(false)
    }
  }

  async function generateInvite() {
    setInviteLoading(true)
    setInviteUrl(null)
    try {
      const res = await api.post<{ token: string; url: string }>('/households/invite', token)
      setInviteUrl(res.url)
    } catch {
      // ignore – let user retry
    } finally {
      setInviteLoading(false)
    }
  }

  async function copyLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function addByEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailMsg(null)
    setEmailLoading(true)
    try {
      const res = await api.post<{ ok: boolean; addedUser: { displayName: string } }>(
        '/households/add-by-email',
        token,
        { email: inviteEmail }
      )
      setEmailMsg({ ok: true, text: `${res.addedUser.displayName} lades till i hushållet!` })
      setInviteEmail('')
    } catch (err) {
      setEmailMsg({ ok: false, text: err instanceof Error ? err.message : 'Något gick fel' })
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`} role="dialog" aria-modal="true">
        <div className={styles.handle} onClick={onClose} />

        {/* User info */}
        <div className={styles.userHeader}>
          <div className={styles.avatar}>{user ? initials(user.displayName) : '?'}</div>
          <div>
            <p className={styles.userName}>{user?.displayName}</p>
            <p className={styles.userEmail}>{user?.email}</p>
          </div>
        </div>

        <div className={styles.scroll}>
          {/* Change password */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Byt lösenord</h2>
            <form onSubmit={changePassword} className={styles.form}>
              <input
                type="password"
                placeholder="Nuvarande lösenord"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
              />
              <input
                type="password"
                placeholder="Nytt lösenord (minst 8 tecken)"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              {pwMsg && (
                <p className={pwMsg.ok ? styles.ok : styles.err}>{pwMsg.text}</p>
              )}
              <button type="submit" className={styles.btn} disabled={pwLoading}>
                {pwLoading ? '…' : 'Spara nytt lösenord'}
              </button>
            </form>
          </section>

          {/* Invite */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Bjud in familjemedlem</h2>

            {inviteUrl ? (
              <div className={styles.qrWrap}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(inviteUrl)}`}
                  alt="QR-kod för inbjudan"
                  className={styles.qrImg}
                  width={200}
                  height={200}
                />
                <p className={styles.qrHint}>Skannas med kameran · gäller 7 dagar</p>
                <button className={styles.copyBtn} onClick={copyLink}>
                  {copied ? '✓ Kopierat!' : 'Kopiera länk'}
                </button>
                <button className={styles.btnSecondary} onClick={generateInvite} disabled={inviteLoading}>
                  Ny kod
                </button>
              </div>
            ) : (
              <button className={styles.btn} onClick={generateInvite} disabled={inviteLoading}>
                {inviteLoading ? '…' : 'Skapa QR-inbjudan'}
              </button>
            )}

            <div className={styles.divider}>eller lägg till via e-post</div>

            <form onSubmit={addByEmail} className={styles.form}>
              <input
                type="email"
                placeholder="Familjemedlemmens e-post"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {emailMsg && (
                <p className={emailMsg.ok ? styles.ok : styles.err}>{emailMsg.text}</p>
              )}
              <button type="submit" className={styles.btn} disabled={emailLoading}>
                {emailLoading ? '…' : 'Lägg till'}
              </button>
            </form>
          </section>
        </div>

        {/* Logout */}
        <button className={styles.logoutBtn} onClick={clearAuth}>
          Logga ut
        </button>
      </div>
    </>
  )
}
