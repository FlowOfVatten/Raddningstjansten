import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { useListWebSocket } from '../hooks/useListWebSocket'
import type { ListItem } from '../types'
import styles from './ListScreen.module.css'

const GROUP_LABELS: Record<string, string> = {
  produce: 'Frukt & grönt',
  bread: 'Bröd',
  meat: 'Kött & chark',
  dairy: 'Mejeri',
  pantry: 'Skafferi',
  frozen: 'Fryst',
  household: 'Hushåll',
  other: 'Övrigt',
}

export default function ListScreen() {
  const token = useAppStore((s) => s.token)
  const lists = useAppStore((s) => s.lists)
  const activeListId = useAppStore((s) => s.activeListId)
  const upsertList = useAppStore((s) => s.upsertList)
  const setScreen = useAppStore((s) => s.setScreen)
  const setActiveTrip = useAppStore((s) => s.setActiveTrip)

  const list = lists.find((l) => l.id === activeListId)

  const [newName, setNewName] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useListWebSocket(activeListId)

  useEffect(() => {
    if (!activeListId || !token) return
    api.get<typeof list>(`/lists/${activeListId}`, token).then((l) => {
      if (l) upsertList(l)
    })
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

  async function addItem(name: string) {
    if (!name.trim() || !list) return
    await api.post(`/lists/${activeListId}/items`, token, { name: name.trim() })
    setNewName('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  async function toggleItem(item: ListItem) {
    await api.patch(`/lists/${activeListId}/items/${item.id}`, token, {
      status: item.status === 'remaining' ? 'checked' : 'remaining',
    })
  }

  async function clearChecked() {
    await api.post(`/lists/${activeListId}/clear-checked`, token)
  }

  async function startTrip() {
    const trip = await api.post<ReturnType<typeof setActiveTrip>>(`/lists/${activeListId}/trips`, token)
    setActiveTrip(trip as never)
    setScreen('trip')
  }

  if (!list) return <p className={styles.muted}>Laddar lista…</p>

  const remaining = list.items.filter((i) => i.status === 'remaining')
  const checked = list.items.filter((i) => i.status === 'checked')

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => setScreen('lists')} className={styles.back}>←</button>
        <h1>{list.name}</h1>
        <button onClick={startTrip} className={styles.tripBtn}>🛒</button>
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
      <span className={styles.group}>{GROUP_LABELS[item.group] ?? item.group}</span>
    </li>
  )
}
