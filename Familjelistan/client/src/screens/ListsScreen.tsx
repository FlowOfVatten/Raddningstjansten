import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import type { ShoppingList } from '../types'
import styles from './ListsScreen.module.css'

export default function ListsScreen() {
  const token = useAppStore((s) => s.token)
  const lists = useAppStore((s) => s.lists)
  const setLists = useAppStore((s) => s.setLists)
  const setActiveList = useAppStore((s) => s.setActiveList)
  const upsertList = useAppStore((s) => s.upsertList)
  const clearAuth = useAppStore((s) => s.clearAuth)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

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
        <button onClick={clearAuth} className={styles.logoutBtn} aria-label="Logga ut">
          ↩
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
    </div>
  )
}
