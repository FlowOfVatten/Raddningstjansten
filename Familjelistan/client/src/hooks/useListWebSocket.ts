import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { ListItem } from '../types'

type WsMessage =
  | { type: 'item:upsert'; listId: string; item: ListItem }
  | { type: 'item:delete'; listId: string; itemId: string }
  | { type: 'list:update'; listId: string; name: string }

export function useListWebSocket(listId: string | null) {
  const token = useAppStore((s) => s.token)
  const upsertList = useAppStore((s) => s.upsertList)
  const lists = useAppStore((s) => s.lists)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!listId || !token) return

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${location.host}/ws?token=${token}&list=${listId}`)
    wsRef.current = ws

    ws.onmessage = (ev) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data)
        const list = lists.find((l) => l.id === msg.listId)
        if (!list) return

        if (msg.type === 'item:upsert') {
          const items = list.items.filter((i) => i.id !== msg.item.id)
          items.push(msg.item)
          items.sort((a, b) => a.sortOrder - b.sortOrder)
          upsertList({ ...list, items })
        } else if (msg.type === 'item:delete') {
          upsertList({ ...list, items: list.items.filter((i) => i.id !== msg.itemId) })
        }
      } catch {
        // ignore malformed messages
      }
    }

    return () => ws.close()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, token])

  return wsRef
}
