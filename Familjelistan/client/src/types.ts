// ── Domain types ──────────────────────────────────────────────

export interface User {
  id: string
  email: string
  displayName: string
}

export interface Household {
  id: string
  name: string
  members: HouseholdMember[]
}

export interface HouseholdMember {
  userId: string
  displayName: string
  role: 'owner' | 'member'
}

export interface Store {
  id: string
  name: string
  chain: string
  lat: number
  lng: number
  icaId?: string
  osmId?: string
}

export interface HouseholdStore {
  storeId: string
  store: Store
  isDefault: boolean
  isFavorite: boolean
  autoSelectRadius: number | null // metres, null = disabled
}

export type ItemStatus = 'remaining' | 'checked'

export type ItemGroup =
  | 'produce'       // Frukt & grönt
  | 'bread'         // Bröd
  | 'meat'          // Kött & chark
  | 'dairy'         // Mejeri
  | 'pantry'        // Skafferi
  | 'frozen'        // Fryst
  | 'household'     // Hushåll
  | 'other'         // Övrigt

export interface ListItem {
  id: string
  listId: string
  name: string
  quantity?: string
  note?: string
  status: ItemStatus
  group: ItemGroup
  sortOrder: number
  offer?: Offer
  createdBy: string
  createdAt: string
  checkedAt?: string
  checkedBy?: string
}

export interface ShoppingList {
  id: string
  householdId: string
  name: string
  storeId?: string
  store?: Store
  items: ListItem[]
  createdAt: string
}

export interface Trip {
  id: string
  listId: string
  storeId: string
  store: Store
  startedAt: string
  endedAt?: string
  /** Items in trip-sorted order */
  sortedItems: ListItem[]
}

export interface Offer {
  id: string
  storeId: string
  title: string
  dealType: string
  validFrom: string
  validTo: string
}

// ── API response wrappers ──────────────────────────────────────

export interface ApiOk<T> {
  ok: true
  data: T
}

export interface ApiError {
  ok: false
  error: string
}

export type ApiResult<T> = ApiOk<T> | ApiError
