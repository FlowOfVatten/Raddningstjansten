import { useAppStore } from '../store/useAppStore'
import { api } from '../api/client'
import type { ListItem, Trip } from '../types'
import styles from './TripScreen.module.css'

export default function TripScreen() {
  const token = useAppStore((s) => s.token)
  const trip = useAppStore((s) => s.activeTrip) as Trip | null
  const setActiveTrip = useAppStore((s) => s.setActiveTrip)
  const setScreen = useAppStore((s) => s.setScreen)

  if (!trip) return null

  const remaining = trip.sortedItems.filter((i) => i.status === 'remaining')
  const [current, ...rest] = remaining
  const upcoming = rest.slice(0, 3)
  const further = rest.slice(3)
  const checked = trip.sortedItems.filter((i) => i.status === 'checked')

  async function checkOff(item: ListItem) {
    await api.patch(`/lists/${trip!.listId}/items/${item.id}`, token, { status: 'checked' })
    // WebSocket will update the store; optimistically update trip copy
    const updated = trip!.sortedItems.map((i) =>
      i.id === item.id ? { ...i, status: 'checked' as const, checkedAt: new Date().toISOString() } : i
    )
    setActiveTrip({ ...trip!, sortedItems: updated })
  }

  async function endTrip() {
    await api.post(`/trips/${trip!.id}/end`, token)
    setActiveTrip(null)
    setScreen('list')
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Handlar i {trip.store.name}</h1>
        <button onClick={endTrip} className={styles.endBtn}>Avsluta</button>
      </header>

      {current ? (
        <section className={styles.now}>
          <p className={styles.label}>Nu</p>
          <button className={styles.bigItem} onClick={() => checkOff(current)}>
            <span className={styles.itemName}>{current.name}</span>
            {current.quantity && <span className={styles.qty}>{current.quantity}</span>}
            {current.offer && <span className={styles.badge}>{current.offer.dealType}</span>}
            <span className={styles.checkHint}>Tryck för att bocka av ✓</span>
          </button>
        </section>
      ) : (
        <section className={styles.done}>
          <p>🎉 Allt avbockat!</p>
          <button onClick={endTrip} className={styles.endBtnLarge}>Avsluta runda</button>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className={styles.upcoming}>
          <p className={styles.label}>Härnäst</p>
          <ul>
            {upcoming.map((item) => (
              <li key={item.id} className={styles.upcomingItem}>
                <span>{item.name}</span>
                {item.offer && <span className={styles.badge}>{item.offer.dealType}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {further.length > 0 && (
        <section className={styles.further}>
          <p className={styles.label}>Resten ({further.length})</p>
          <ul>
            {further.map((item) => (
              <li key={item.id} className={styles.furtherItem}>{item.name}</li>
            ))}
          </ul>
        </section>
      )}

      {checked.length > 0 && (
        <p className={styles.checkedCount}>✓ {checked.length} avbockade</p>
      )}
    </div>
  )
}
