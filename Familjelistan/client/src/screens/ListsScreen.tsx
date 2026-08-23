import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import type { ShoppingList } from '../types'
import ProfileDrawer from './ProfileDrawer'
import styles from './ListsScreen.module.css'

const ACTION_WIDTH = 192

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
  const removeList = useAppStore((s) => s.removeList)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [storePickerList, setStorePickerList] = useState<ShoppingList | null>(null)
  const [storeDraftName, setStoreDraftName] = useState('')

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

  async function renameList(list: ShoppingList) {
    const nextName = window.prompt('Nytt namn på listan', list.name)?.trim()
    if (!nextName || nextName === list.name) return

    const previous = list
    upsertList({ ...list, name: nextName })
    setOpenActionsId(null)
    try {
      const updated = await api.patch<ShoppingList>(`/lists/${list.id}`, token, { name: nextName })
      upsertList(updated)
    } catch {
      upsertList(previous)
    }
  }

  async function deleteList(list: ShoppingList) {
    const confirmed = window.confirm(`Radera listan "${list.name}"?`)
    if (!confirmed) return

    removeList(list.id)
    setOpenActionsId(null)
    try {
      await api.delete<{ ok: boolean }>(`/lists/${list.id}`, token)
    } catch {
      upsertList(list)
    }
  }

  function chooseStore(list: ShoppingList) {
    setStorePickerList(list)
    setStoreDraftName(list.store?.name ?? '')
    setOpenActionsId(null)
  }

  async function saveStoreChoice(list: ShoppingList, nextStoreName: string) {
    const trimmed = nextStoreName.trim()
    const previous = list
    const optimisticStore = trimmed
      ? {
          id: list.store?.id ?? `temp-store-${Date.now()}`,
          name: trimmed,
          chain: trimmed,
          lat: 0,
          lng: 0,
        }
      : undefined

    upsertList({
      ...list,
      storeId: trimmed ? optimisticStore?.id : undefined,
      store: optimisticStore,
    })
    setStorePickerList(null)
    setStoreDraftName('')

    try {
      const updated = await api.patch<ShoppingList>(`/lists/${list.id}`, token, { storeName: trimmed })
      upsertList(updated)
    } catch {
      upsertList(previous)
    }
  }

  const knownStores = Array.from(
    new Set(
      lists
        .map((entry) => entry.store?.name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  )

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
            <ListRow
              key={l.id}
              list={l}
              isOpen={openActionsId === l.id}
              onOpenActions={() => setOpenActionsId(l.id)}
              onCloseActions={() => setOpenActionsId(null)}
              onOpenList={() => setActiveList(l.id)}
              onChooseStore={() => chooseStore(l)}
              onRename={() => renameList(l)}
              onDelete={() => deleteList(l)}
            />
          ))}
        </ul>
      )}

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <StorePicker
        open={Boolean(storePickerList)}
        draftName={storeDraftName}
        knownStores={knownStores}
        onChangeDraft={setStoreDraftName}
        onClose={() => {
          setStorePickerList(null)
          setStoreDraftName('')
        }}
        onSave={() => {
          if (storePickerList) saveStoreChoice(storePickerList, storeDraftName)
        }}
      />
    </div>
  )
}

function StorePicker({
  open,
  draftName,
  knownStores,
  onChangeDraft,
  onClose,
  onSave,
}: {
  open: boolean
  draftName: string
  knownStores: string[]
  onChangeDraft: (value: string) => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <>
      <div
        className={`${styles.sheetBackdrop} ${open ? styles.sheetBackdropVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`${styles.sheet} ${open ? styles.sheetOpen : ''}`} role="dialog" aria-modal="true">
        <div className={styles.sheetHandle} />
        <div className={styles.sheetBody}>
          <h2 className={styles.sheetTitle}>Välj affär</h2>
          <p className={styles.sheetHint}>Listan sorteras olika beroende på vald butik.</p>

          {knownStores.length > 0 && (
            <div className={styles.storeChipGrid}>
              {knownStores.map((storeName) => (
                <button
                  key={storeName}
                  type="button"
                  className={`${styles.storeChip} ${draftName.trim().toLowerCase() === storeName.toLowerCase() ? styles.storeChipActive : ''}`}
                  onClick={() => onChangeDraft(storeName)}
                >
                  {storeName}
                </button>
              ))}
            </div>
          )}

          <input
            className={styles.sheetInput}
            placeholder="Skriv affärens namn"
            value={draftName}
            onChange={(e) => onChangeDraft(e.target.value)}
          />

          <div className={styles.sheetActions}>
            <button type="button" className={styles.sheetClearBtn} onClick={() => onChangeDraft('')}>Ta bort affär</button>
            <button type="button" className={styles.sheetSaveBtn} onClick={onSave}>Spara</button>
          </div>
        </div>
      </div>
    </>
  )
}

function ListRow({
  list,
  isOpen,
  onOpenActions,
  onCloseActions,
  onOpenList,
  onChooseStore,
  onRename,
  onDelete,
}: {
  list: ShoppingList
  isOpen: boolean
  onOpenActions: () => void
  onCloseActions: () => void
  onOpenList: () => void
  onChooseStore: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchStartReveal, setTouchStartReveal] = useState(0)
  const [dragReveal, setDragReveal] = useState<number | null>(null)

  const effectiveReveal = dragReveal ?? (isOpen ? ACTION_WIDTH : 0)

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0]?.clientX ?? null)
    setTouchStartReveal(isOpen ? ACTION_WIDTH : 0)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX == null) return
    const currentX = e.touches[0]?.clientX ?? touchStartX
    const delta = touchStartX - currentX
    const nextReveal = Math.max(0, Math.min(ACTION_WIDTH, touchStartReveal + delta))
    setDragReveal(nextReveal)
  }

  function handleTouchEnd() {
    if (touchStartX == null) return
    const endReveal = dragReveal ?? (isOpen ? ACTION_WIDTH : 0)
    if (endReveal > ACTION_WIDTH / 2) onOpenActions()
    else onCloseActions()
    setTouchStartX(null)
    setTouchStartReveal(0)
    setDragReveal(null)
  }

  return (
    <li className={styles.listItemShell}>
      <div className={styles.listActions}>
        <button type="button" className={styles.storeBtn} onClick={onChooseStore}>Affär</button>
        <button type="button" className={styles.renameBtn} onClick={onRename}>Ändra</button>
        <button type="button" className={styles.deleteBtn} onClick={onDelete}>Radera</button>
      </div>

      <div
        className={`${styles.listRowWrap} ${isOpen ? styles.listRowWrapOpen : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(-${effectiveReveal}px)` }}
      >
        <button
          className={styles.listRow}
          onClick={() => {
            if (isOpen) {
              onCloseActions()
              return
            }
            onOpenList()
          }}
        >
          <span>
            <span className={styles.listName}>{list.name}</span>
            {list.store?.name && <span className={styles.storeMeta}>{list.store.name}</span>}
          </span>
          <span className={styles.listMeta}>
            {list.items.filter((i) => i.status === 'remaining').length} kvar
          </span>
        </button>
        <button
          type="button"
          className={styles.moreBtn}
          onClick={() => {
            setDragReveal(null)
            isOpen ? onCloseActions() : onOpenActions()
          }}
          aria-label="Visa liståtgärder"
        >
          ⋯
        </button>
      </div>
    </li>
  )
}
