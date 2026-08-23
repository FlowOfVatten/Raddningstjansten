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
  removeList: (id: string) => void

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

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('fl_user') ?? sessionStorage.getItem('fl_user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  user: loadUser(),
  token: localStorage.getItem('fl_token') ?? sessionStorage.getItem('fl_token'),
  setAuth: (user, token, remember = false) => {
    const userJson = JSON.stringify(user)
    if (remember) {
      localStorage.setItem('fl_token', token)
      localStorage.setItem('fl_user', userJson)
      sessionStorage.removeItem('fl_token')
      sessionStorage.removeItem('fl_user')
    } else {
      sessionStorage.setItem('fl_token', token)
      sessionStorage.setItem('fl_user', userJson)
      localStorage.removeItem('fl_token')
      localStorage.removeItem('fl_user')
    }
    set({ user, token, screen: 'lists' })
  },
  clearAuth: () => {
    localStorage.removeItem('fl_token')
    localStorage.removeItem('fl_user')
    sessionStorage.removeItem('fl_token')
    sessionStorage.removeItem('fl_user')
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
  removeList: (id) => {
    const { lists, activeListId } = get()
    const nextLists = lists.filter((list) => list.id !== id)
    set({
      lists: nextLists,
      activeListId: activeListId === id ? null : activeListId,
      screen: activeListId === id ? 'lists' : get().screen,
    })
  },

  activeTrip: null,
  setActiveTrip: (trip) => set({ activeTrip: trip }),

  screen: (localStorage.getItem('fl_token') || sessionStorage.getItem('fl_token')) ? 'lists' : 'login',
  setScreen: (screen) => set({ screen }),
}))
