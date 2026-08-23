import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { useListWebSocket } from '../hooks/useListWebSocket'
import type { ListItem } from '../types'
import styles from './ListScreen.module.css'

export default function ListScreen() {
  const token = useAppStore((s) => s.token)
  const lists = useAppStore((s) => s.lists)
  const activeListId = useAppStore((s) => s.activeListId)
  const upsertList = useAppStore((s) => s.upsertList)
  const setScreen = useAppStore((s) => s.setScreen)

  const list = lists.find((l) => l.id === activeListId)

  const [newName, setNewName] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const suppressNextPollRef = useRef(false)

  useListWebSocket(activeListId)

  useEffect(() => {
    if (!activeListId || !token) return
    api.get<typeof list>(`/lists/${activeListId}`, token).then((l) => {
      if (l) upsertList(l)
    })
  }, [activeListId, token, upsertList])

  useEffect(() => {
    if (!activeListId || !token) return

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return

      // Skip one polling cycle right after a local optimistic mutation so
      // the server does not briefly overwrite the just-updated UI.
      if (suppressNextPollRef.current) {
        suppressNextPollRef.current = false
        return
      }

      api.get<typeof list>(`/lists/${activeListId}`, token)
        .then((l) => {
          if (l) upsertList(l)
        })
        .catch(() => {})
    }, 4000)

    return () => window.clearInterval(interval)
  }, [activeListId, token, upsertList])

  useEffect(() => {
    if (!newName.trim() || !token) { setSuggestions([]); return }
    const timer = setTimeout(() => {
      api.get<string[]>(`/lists/${activeListId}/suggestions?q=${encodeURIComponent(newName)}`, token)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
    }, 200)
    return () => clearTimeout(timer)
  }, [newName, activeListId, token])

  // Optimistic: update UI immediately, sync server in background
  function optimisticUpdate(updatedItems: ListItem[]) {
    if (!list) return
    upsertList({ ...list, items: updatedItems })
  }

  async function addItem(name: string) {
    if (!name.trim() || !list) return
    setNewName('')
    setSuggestions([])
    inputRef.current?.focus()
    suppressNextPollRef.current = true
    const newItem: ListItem = {
      id: `temp-${Date.now()}`,
      listId: list.id,
      name: name.trim(),
      status: 'remaining',
      group: 'other',
      sortOrder: list.items.length + 1,
      createdBy: '',
      createdAt: new Date().toISOString(),
    }
    optimisticUpdate([...list.items, newItem])
    try {
      const saved = await api.post<ListItem>(`/lists/${activeListId}/items`, token, { name: name.trim() })
      // replace temp item with real one from server
      upsertList({ ...list, items: [...list.items.filter((i) => i.id !== newItem.id), saved] })
    } catch {
      // rollback
      optimisticUpdate(list.items)
    }
  }

  async function toggleItem(item: ListItem) {
    if (!list) return
    const newStatus = item.status === 'remaining' ? 'checked' : 'remaining'
    suppressNextPollRef.current = true
    // Optimistic
    optimisticUpdate(list.items.map((i) => i.id === item.id ? { ...i, status: newStatus } : i))
    try {
      await api.patch(`/lists/${activeListId}/items/${item.id}`, token, { status: newStatus })
    } catch {
      // rollback
      optimisticUpdate(list.items)
    }
  }

  async function clearChecked() {
    if (!list) return
    const kept = list.items.filter((i) => i.status !== 'checked')
    suppressNextPollRef.current = true
    // Optimistic
    optimisticUpdate(kept)
    try {
      await api.post(`/lists/${activeListId}/clear-checked`, token)
    } catch {
      // rollback
      optimisticUpdate(list.items)
    }
  }

  if (!list) return <p className={styles.muted}>Laddar lista…</p>

  const remaining = list.items.filter((i) => i.status === 'remaining')
  const checked = list.items.filter((i) => i.status === 'checked')

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => setScreen('lists')} className={styles.back}>←</button>
        <h1>{list.name}</h1>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); addItem(newName) }}
        className={styles.addForm}
      >
        <input
          ref={inputRef}
          placeholder="Lägg till vara…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className={styles.addBtn}>+</button>
      </form>

      {suggestions.length > 0 && (
        <ul className={styles.suggestions}>
          {suggestions.map((s) => (
            <li key={s}>
              <button onClick={() => addItem(s)}>{s}</button>
            </li>
          ))}
        </ul>
      )}

      <ul className={styles.items}>
        {remaining.map((item) => (
          <ItemRow key={item.id} item={item} onToggle={toggleItem} />
        ))}
      </ul>

      {checked.length > 0 && (
        <>
          <div className={styles.checkedHeader}>
            <span>Avbockade ({checked.length})</span>
            <button onClick={clearChecked} className={styles.clearBtn}>Rensa</button>
          </div>
          <ul className={styles.items}>
            {checked.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={toggleItem} dimmed />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function ItemRow({
  item,
  onToggle,
  dimmed = false,
}: {
  item: ListItem
  onToggle: (item: ListItem) => void
  dimmed?: boolean
}) {
  return (
    <li className={`${styles.itemRow} ${dimmed ? styles.dimmed : ''}`}>
      <button
        className={styles.checkbox}
        onClick={() => onToggle(item)}
        aria-label={item.status === 'remaining' ? 'Bocka av' : 'Ångra'}
      >
        {item.status === 'checked' ? '✓' : ''}
      </button>
      <span className={styles.itemName}>
        {item.name}
        {item.quantity && <span className={styles.qty}> {item.quantity}</span>}
        {item.note && <span className={styles.note}> · {item.note}</span>}
      </span>
      {item.offer && (
        <span className={styles.badge}>{item.offer.dealType}</span>
      )}
    </li>
  )
}
