import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import type { ShoppingList } from '../types'
import ProfileDrawer from './ProfileDrawer'
import styles from './ListsScreen.module.css'

function initials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2)
}

export default function ListsScreen() {
  const token = useAppStore((s) => s.token)
  const user = useAppStore((s) => s.user)
  const lists = useAppStore((s) => s.lists)
  const setLists = useAppStore((s) => s.setLists)
  const setActiveList = useAppStore((s) => s.setActiveList)
  const upsertList = useAppStore((s) => s.upsertList)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Handle pending invite (when joining via QR link)
  useEffect(() => {
    const pendingInvite = sessionStorage.getItem('fl_pending_invite')
    if (pendingInvite && token) {
      sessionStorage.removeItem('fl_pending_invite')
      api.post('/households/join', token, { token: pendingInvite }).catch(() => {})
    }
  }, [token])

  useEffect(() => {
    api.get<ShoppingList[]>('/lists', token)
      .then(setLists)
      .finally(() => setLoading(false))
  }, [token, setLists])

  async function createList(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const list = await api.post<ShoppingList>('/lists', token, { name: newName.trim() })
    upsertList(list)
    setNewName('')
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Familjelistan</h1>
        <button
          className={styles.avatarBtn}
          onClick={() => setDrawerOpen(true)}
          aria-label="Profil och inställningar"
        >
          {user ? initials(user.displayName) : '?'}
        </button>
      </header>

      <form onSubmit={createList} className={styles.newForm}>
        <input
          placeholder="Ny lista…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className={styles.addBtn}>+</button>
      </form>

      {loading ? (
        <p className={styles.muted}>Laddar…</p>
      ) : lists.length === 0 ? (
        <p className={styles.muted}>Inga listor ännu. Skapa en ovan.</p>
      ) : (
        <ul className={styles.list}>
          {lists.map((l) => (
            <li key={l.id}>
              <button className={styles.listRow} onClick={() => setActiveList(l.id)}>
                <span className={styles.listName}>{l.name}</span>
                <span className={styles.listMeta}>
                  {l.items.filter((i) => i.status === 'remaining').length} kvar
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
