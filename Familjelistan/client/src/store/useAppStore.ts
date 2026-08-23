import { create } from 'zustand'
import type { User, Household, ShoppingList, Trip } from '../types'

interface AppState {
  // Auth
  user: User | null
  token: string | null
  setAuth: (user: User, token: string, remember?: boolean) => void
  clearAuth: () => void

  // Household
  household: Household | null
  setHousehold: (h: Household) => void

  // Lists
  lists: ShoppingList[]
  activeListId: string | null
  setLists: (lists: ShoppingList[]) => void
  setActiveList: (id: string) => void
  upsertList: (list: ShoppingList) => void

  // Active trip
  activeTrip: Trip | null
  setActiveTrip: (trip: Trip | null) => void

  // UI
  screen: Screen
  setScreen: (screen: Screen) => void
}

export type Screen =
  | 'login'
  | 'lists'
  | 'list'
  | 'trip'
  | 'stores-nearby'
  | 'stores'
  | 'household'
  | 'settings'

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  token: localStorage.getItem('fl_token') ?? sessionStorage.getItem('fl_token'),
  setAuth: (user, token, remember = false) => {
    if (remember) {
      localStorage.setItem('fl_token', token)
      sessionStorage.removeItem('fl_token')
    } else {
      sessionStorage.setItem('fl_token', token)
      localStorage.removeItem('fl_token')
    }
    set({ user, token, screen: 'lists' })
  },
  clearAuth: () => {
    localStorage.removeItem('fl_token')
    sessionStorage.removeItem('fl_token')
    set({ user: null, token: null, screen: 'login' })
  },

  household: null,
  setHousehold: (household) => set({ household }),

  lists: [],
  activeListId: null,
  setLists: (lists) => set({ lists }),
  setActiveList: (id) => set({ activeListId: id, screen: 'list' }),
  upsertList: (list) => {
    const { lists } = get()
    const idx = lists.findIndex((l) => l.id === list.id)
    if (idx >= 0) {
      const next = [...lists]
      next[idx] = list
      set({ lists: next })
    } else {
      set({ lists: [list, ...lists] })
    }
  },

  activeTrip: null,
  setActiveTrip: (trip) => set({ activeTrip: trip }),

  screen: (localStorage.getItem('fl_token') || sessionStorage.getItem('fl_token')) ? 'lists' : 'login',
  setScreen: (screen) => set({ screen }),
}))
