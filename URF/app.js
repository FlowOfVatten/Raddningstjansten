// Cars data
const CARS_DATA = [
    { id: 1, icon: '🚗', color: 'red' },
    { id: 2, icon: '🚙', color: 'blue' },
    { id: 3, icon: '🚕', color: 'yellow' },
    { id: 4, icon: '🚐', color: 'green' },
    { id: 5, icon: '🚌', color: 'purple' }
];

const KEYS_DATA = [
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
    { id: 5 }
];

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];
const API_BASE_URL = (window.URF_API_BASE_URL || '').replace(/\/$/, '');
const STATE_ENDPOINT = `${API_BASE_URL}/api/state`;
const STATE_ID = 'urf:lending:state:v1';
const REMOTE_REQUEST_TIMEOUT_MS = 8000;
const REMOTE_STARTUP_RETRIES = 8;
const REMOTE_RETRY_DELAY_MS = 5000;
const REMOTE_BACKGROUND_SYNC_MS = 60000;
const ORDER_ADDED_SOUND_URL = window.URF_ORDER_SOUND_URL || 'https://cdn.freesound.org/previews/44/44703_14771-lq.mp3';

let cars = [];
let keys = [];
let bookings = [];
let contacts = [];
let orders = [];
let completedOrdersHistory = [];
let currentBookingDay = 'friday';
let currentBookingHour = null;
let currentBookingCarId = null;
let currentModal = null;
let currentItemId = null;
let currentItemType = null;
let currentBorrowBookingId = null;
let currentDeleteCarId = null;
let currentEditCarId = null;
let saveDebounceTimer = null;
let pendingRemoteSave = false;
let isRemoteSyncInProgress = false;
let hasInitializedRemoteOrderNotifications = false;
let newlySyncedOrderIds = new Set();
// Backups to prevent losing non-empty data via empty overwrites
let lastKnownGoodCars = [];
let lastKnownGoodKeys = [];
let lastKnownGoodBookings = [];
let lastKnownGoodContacts = [];
let lastKnownGoodOrders = [];

// Get all unique borrower names from cars and keys history (including past borrowers)
function getHistoricalBorrowerNames() {
    const names = new Set();
    
    // Collect names from current borrowers (active loans)
    cars.forEach(car => {
        if (car.borrowerName && String(car.borrowerName).trim()) {
            names.add(String(car.borrowerName).trim());
        }
    });
    keys.forEach(key => {
        if (key.borrowerName && String(key.borrowerName).trim()) {
            names.add(String(key.borrowerName).trim());
        }
    });
    
    // Collect names from borrow history (past borrowers)
    cars.forEach(car => {
        if (car.borrowHistory && Array.isArray(car.borrowHistory)) {
            car.borrowHistory.forEach(name => {
                if (name && String(name).trim()) {
                    names.add(String(name).trim());
                }
            });
        }
    });
    keys.forEach(key => {
        if (key.borrowHistory && Array.isArray(key.borrowHistory)) {
            key.borrowHistory.forEach(name => {
                if (name && String(name).trim()) {
                    names.add(String(name).trim());
                }
            });
        }
    });
    
    return Array.from(names).sort();
}

// Update the datalist with historical borrower names
function updateBorrowerNamesList() {
    const datalist = document.getElementById('borrowerNamesList');
    if (!datalist) return;
    
    const names = getHistoricalBorrowerNames();
    datalist.innerHTML = names
        .map(name => `<option value="${name}"></option>`)
        .join('');
}

// Load completed orders history from localStorage
function loadCompletedOrdersHistory() {
    const stored = localStorage.getItem('urf_completed_orders_history');
    if (stored) {
        try {
            completedOrdersHistory = JSON.parse(stored);
        } catch (e) {
            completedOrdersHistory = [];
        }
    } else {
        completedOrdersHistory = [];
    }
}

// Save completed orders history to localStorage
function saveCompletedOrdersHistory() {
    localStorage.setItem('urf_completed_orders_history', JSON.stringify(completedOrdersHistory));
}

// Export completed orders to CSV/Excel
function exportOrdersToExcel() {
    if (completedOrdersHistory.length === 0) {
        alert('Ingen levererad beställning att exportera ännu.');
        return;
    }

    // Prepare CSV data
    const headers = ['Artikel', 'Plats', 'Beställare', 'Beställtid', 'Leveranstid'];
    const rows = completedOrdersHistory.map(order => {
        const createdDate = new Date(order.createdAt);
        const createdTime = createdDate.toLocaleString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const completedDate = new Date(order.completedAt || order.deletedAt);
        const completedTime = completedDate.toLocaleString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Escape quotes and handle multiline content
        const article = String(order.article || '')
            .replace(/"/g, '""')           // Escape quotes for CSV
            .replace(/\r?\n/g, '\r\n');     // Convert to Windows line breaks
        const location = String(order.location || '')
            .replace(/"/g, '""')
            .replace(/\r?\n/g, '\r\n');
        const orderer = String(order.orderer || '')
            .replace(/"/g, '""')
            .replace(/\r?\n/g, '\r\n');

        return [
            `"${article}"`,
            `"${location}"`,
            `"${orderer}"`,
            `"${createdTime}"`,
            `"${completedTime}"`
        ].join(',');
    });

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...rows
    ].join('\r\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const filename = `Beställningslogg_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatSyncTime(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit'
    });
}

function formatBorrowedTime(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
    });
}

function getVehicleIcon(type) {
    return type === 'minibus' ? '🚌' : '🚗';
}

function getVehicleTypeLabel(type) {
    return type === 'minibus' ? 'Minibuss' : 'Bil';
}

function getScheduleOverrideFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const dayParam = String(params.get('urfDay') || '').toLowerCase();
    const hourParam = params.get('urfHour');

    const day = (dayParam === 'friday' || dayParam === 'saturday') ? dayParam : null;
    const parsedHour = Number.parseInt(hourParam, 10);
    const hour = Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23 ? parsedHour : null;

    return { day, hour };
}

function updateScheduleTestBadge() {
    const badge = document.getElementById('scheduleTestBadge');
    if (!badge) return;

    const override = getScheduleOverrideFromUrl();
    if (!override.day && override.hour === null) {
        badge.style.display = 'none';
        badge.textContent = '';
        return;
    }

    const dayLabel = override.day === 'friday' ? 'Fredag' : (override.day === 'saturday' ? 'Lördag' : 'Auto');
    const hourLabel = override.hour === null ? 'Auto' : `${String(override.hour).padStart(2, '0')}:00`;
    badge.textContent = `Testläge: ${dayLabel}, ${hourLabel}`;
    badge.style.display = 'inline-block';
}

function updateSyncStatus(text, stateClass = 'is-ok') {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `sync-status ${stateClass}`;
}

async function handleRefreshSync() {
    const button = document.getElementById('refreshButton');
    if (!button) return;
    
    // Disable and add spinner
    button.disabled = true;
    button.classList.add('is-syncing');
    
    try {
        await syncWithRemoteOnce();
    } finally {
        // Re-enable and remove spinner
        button.disabled = false;
        button.classList.remove('is-syncing');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadCarsFromStorage();
    loadKeysFromStorage();
    loadBookingsFromStorage();
    loadContactsFromStorage();
    loadOrdersFromStorage();
    loadCompletedOrdersHistory();

    renderCars();
    renderKeys();
    renderBookingGrid();
    renderContacts();
    renderOrders();

    const localUpdatedAt = getLocalUpdatedAt();
    updateSyncStatus(
        localUpdatedAt ? `Last data: ${formatSyncTime(localUpdatedAt)} (cache)` : 'Last data: lokal cache',
        localUpdatedAt ? 'is-ok' : 'is-pending'
    );
    updateScheduleTestBadge();

    // Non-blocking remote sync: app is instantly usable even if DB is sleeping.
    startRemoteSyncWithRetry();
    setInterval(() => {
        syncWithRemoteOnce();
    }, REMOTE_BACKGROUND_SYNC_MS);
});

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getLocalUpdatedAt() {
    return localStorage.getItem('urf_state_updated_at') || '';
}

function setLocalUpdatedAt(ts) {
    localStorage.setItem('urf_state_updated_at', ts);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REMOTE_REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

function createDefaultCars() {
    return [];
}

function createDefaultItems() {
    return KEYS_DATA.map(item => ({
        id: item.id,
        keyName: `Pryl ${item.id}`,
        borrowed: false,
        borrowerName: '',
        borrowedAt: ''
    }));
}

function normalizeCars(carItems) {
    if (!Array.isArray(carItems) || carItems.length === 0) {
        return [];
    }

    return carItems.map((car, index) => {
        const normalizedType = car?.vehicleType === 'minibus' ? 'minibus' : 'car';
        return {
        id: car?.id ?? index + 1,
        icon: car?.icon || getVehicleIcon(normalizedType),
        vehicleType: normalizedType,
        modelName: String(car?.modelName || ''),
        regNumber: String(car?.regNumber || `URF-${String(index + 1).padStart(3, '0')}`),
        borrowed: Boolean(car?.borrowed),
        borrowerName: String(car?.borrowerName || ''),
        borrowedAt: String(car?.borrowedAt || ''),
        borrowedFromBookingId: String(car?.borrowedFromBookingId || '')
        };
    });
}

function normalizeItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return createDefaultItems();
    }

    return items.map((item, index) => {
        const fallbackName = `Pryl ${index + 1}`;
        const currentName = String(item?.keyName || '').trim();
        const migratedName = currentName.replace(/^Nyckel\s+/i, 'Pryl ');

        return {
            id: item?.id ?? index + 1,
            keyName: migratedName || fallbackName,
            borrowed: Boolean(item?.borrowed),
            borrowerName: String(item?.borrowerName || ''),
            borrowedAt: String(item?.borrowedAt || '')
        };
    });
}

function normalizeOrders(ordersList) {
    if (!Array.isArray(ordersList)) {
        return [];
    }

    return ordersList.map((order, index) => ({
        id: order?.id ?? Date.now() + index,
        article: String(order?.article || ''),
        location: String(order?.location || ''),
        orderer: String(order?.orderer || ''),
        deliveryType: (order?.deliveryType === 'asap' || order?.deliveryType === 'scheduled') ? order.deliveryType : 'asap',
        deliveryTime: String(order?.deliveryTime || ''),
        createdAt: String(order?.createdAt || new Date().toISOString()),
        completed: Boolean(order?.completed)
    }));
}

function getStatePayload() {
    // Safeguard: Never overwrite DB with empty data if we had non-empty data before
    const carsToSave = cars.length > 0 ? cars : (lastKnownGoodCars.length > 0 ? lastKnownGoodCars : []);
    const keysToSave = keys.length > 0 ? keys : (lastKnownGoodKeys.length > 0 ? lastKnownGoodKeys : []);
    const bookingsToSave = bookings.length > 0 ? bookings : (lastKnownGoodBookings.length > 0 ? lastKnownGoodBookings : []);
    const contactsToSave = contacts.length > 0 ? contacts : (lastKnownGoodContacts.length > 0 ? lastKnownGoodContacts : []);
    const ordersToSave = orders.length > 0 ? orders : (lastKnownGoodOrders.length > 0 ? lastKnownGoodOrders : []);
    return {
        version: 1,
        cars: carsToSave,
        keys: keysToSave,
        bookings: bookingsToSave,
        contacts: contactsToSave,
        orders: ordersToSave
    };
}

function saveLocalSnapshot() {
    localStorage.setItem('urf_cars', JSON.stringify(cars));
    localStorage.setItem('urf_keys', JSON.stringify(keys));
    localStorage.setItem('urf_bookings', JSON.stringify(bookings));
    localStorage.setItem('urf_contacts', JSON.stringify(contacts));
    localStorage.setItem('urf_orders', JSON.stringify(orders));
    // Always keep backups of non-empty data
    if (cars.length > 0) {
        localStorage.setItem('urf_cars_backup', JSON.stringify(cars));
        lastKnownGoodCars = cars;
    }
    if (keys.length > 0) {
        localStorage.setItem('urf_keys_backup', JSON.stringify(keys));
        lastKnownGoodKeys = keys;
    }
    if (bookings.length > 0) {
        localStorage.setItem('urf_bookings_backup', JSON.stringify(bookings));
        lastKnownGoodBookings = bookings;
    }
    if (contacts.length > 0) {
        localStorage.setItem('urf_contacts_backup', JSON.stringify(contacts));
        lastKnownGoodContacts = contacts;
    }
    if (orders.length > 0) {
        localStorage.setItem('urf_orders_backup', JSON.stringify(orders));
        lastKnownGoodOrders = orders;
    }
}

function scheduleRemoteSave() {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }

    pendingRemoteSave = true;
    updateSyncStatus('Last data: osynkade lokala ändringar', 'is-pending');

    saveDebounceTimer = setTimeout(() => {
        saveStateToApi();
    }, 200);
}

function persistState() {
    saveLocalSnapshot();
    setLocalUpdatedAt(new Date().toISOString());
    scheduleRemoteSave();
}

function applyRemotePayload(payload, remoteUpdatedAt) {
    let shouldPlayRemoteOrderSound = false;

    // Safeguard: Keep local/backup data if remote is empty, to avoid data loss
    if (Array.isArray(payload.cars)) {
        if (payload.cars.length > 0) {
            cars = normalizeCars(payload.cars);
            lastKnownGoodCars = cars;  // Update backup on successful sync
        } else if (cars.length === 0 && lastKnownGoodCars.length > 0) {
            cars = lastKnownGoodCars;
        }
    }
    if (Array.isArray(payload.keys)) {
        keys = normalizeItems(payload.keys);
        if (keys.length > 0) {
            lastKnownGoodKeys = keys;
        } else if (keys.length === 0 && lastKnownGoodKeys.length > 0) {
            keys = lastKnownGoodKeys;
        }
    }
    if (Array.isArray(payload.bookings)) {
        if (payload.bookings.length > 0) {
            bookings = payload.bookings;
            lastKnownGoodBookings = payload.bookings;  // Update backup on successful sync
        } else if (bookings.length === 0 && lastKnownGoodBookings.length > 0) {
            bookings = lastKnownGoodBookings;
        }
    }
    if (Array.isArray(payload.contacts)) {
        if (payload.contacts.length > 0) {
            contacts = payload.contacts;
            lastKnownGoodContacts = payload.contacts;  // Update backup on successful sync
        } else if (contacts.length === 0 && lastKnownGoodContacts.length > 0) {
            contacts = lastKnownGoodContacts;
        }
    }
    if (Array.isArray(payload.orders)) {
        if (payload.orders.length > 0) {
            const existingOrderIds = new Set(orders.map(order => String(order.id)));
            const normalizedRemoteOrders = normalizeOrders(payload.orders);
            const detectedNewOrderIds = normalizedRemoteOrders
                .filter(order => !existingOrderIds.has(String(order.id)))
                .map(order => String(order.id));

            newlySyncedOrderIds = new Set(detectedNewOrderIds);

            if (hasInitializedRemoteOrderNotifications) {
                shouldPlayRemoteOrderSound = detectedNewOrderIds.length > 0;
            }

            orders = normalizedRemoteOrders;
            lastKnownGoodOrders = orders;  // Update backup on successful sync
        } else if (orders.length === 0 && lastKnownGoodOrders.length > 0) {
            orders = lastKnownGoodOrders;
            newlySyncedOrderIds = new Set();
        } else {
            newlySyncedOrderIds = new Set();
        }

        if (!hasInitializedRemoteOrderNotifications) {
            hasInitializedRemoteOrderNotifications = true;
        }
    }
    saveLocalSnapshot();
    if (remoteUpdatedAt) {
        setLocalUpdatedAt(new Date(remoteUpdatedAt).toISOString());
    }
    renderCars();
    renderKeys();
    renderBookingGrid();
    renderContacts();
    renderOrders();

    if (shouldPlayRemoteOrderSound) {
        playOrderAddedSound();
    }
}

async function loadStateFromApi() {
    try {
        const response = await fetchWithTimeout(`${STATE_ENDPOINT}?id=${encodeURIComponent(STATE_ID)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            return { ok: false };
        }

        const rows = await response.json();
        const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
        const payload = row ? row.payload : null;
        if (!payload || typeof payload !== 'object') {
            return { ok: true, payload: null, updatedAt: row?.updated_at || null };
        }
        return { ok: true, payload, updatedAt: row?.updated_at || null };
    } catch (error) {
        return { ok: false, error };
    }
}

async function saveStateToApi() {
    try {
        const timestamp = getLocalUpdatedAt() || new Date().toISOString();
        updateSyncStatus('Last data: synkar...', 'is-syncing');
        const response = await fetchWithTimeout(STATE_ENDPOINT, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: STATE_ID,
                payload: getStatePayload(),
                updated_at: timestamp
            })
        });

        if (!response.ok) {
            pendingRemoteSave = true;
            updateSyncStatus('Last data: väntar på databas...', 'is-pending');
            return false;
        }

        pendingRemoteSave = false;
        updateSyncStatus(`Last data: ${formatSyncTime(timestamp)}`, 'is-ok');
        return true;
    } catch (error) {
        // Keep running with local cache if remote save fails.
        pendingRemoteSave = true;
        updateSyncStatus('Last data: väntar på databas...', 'is-pending');
        console.warn('URF: kunde inte spara state till API, sparat lokalt.', error);
        return false;
    }
}

async function syncWithRemoteOnce() {
    if (isRemoteSyncInProgress) return false;
    isRemoteSyncInProgress = true;

    try {
        updateSyncStatus('Last data: kontaktar databas...', 'is-syncing');
        const result = await loadStateFromApi();
        if (!result.ok) {
            updateSyncStatus('Last data: DB sover, använder cache', 'is-pending');
            return false;
        }

        const remoteUpdatedAt = result.updatedAt ? new Date(result.updatedAt).toISOString() : '';
        const localUpdatedAt = getLocalUpdatedAt();

        if (result.payload) {
            const remoteIsNewer = !localUpdatedAt || (remoteUpdatedAt && remoteUpdatedAt >= localUpdatedAt);
            if (remoteIsNewer) {
                applyRemotePayload(result.payload, remoteUpdatedAt);
            } else {
                pendingRemoteSave = true;
            }
        }

        if (pendingRemoteSave) {
            await saveStateToApi();
        } else {
            updateSyncStatus(
                remoteUpdatedAt ? `Last data: ${formatSyncTime(remoteUpdatedAt)}` : 'Last data: ansluten',
                'is-ok'
            );
        }

        return true;
    } finally {
        isRemoteSyncInProgress = false;
    }
}

async function startRemoteSyncWithRetry() {
    for (let attempt = 1; attempt <= REMOTE_STARTUP_RETRIES; attempt += 1) {
        const ok = await syncWithRemoteOnce();
        if (ok) {
            return;
        }
        await wait(REMOTE_RETRY_DELAY_MS);
    }
}

// Load cars from localStorage
function loadCarsFromStorage() {
    const stored = localStorage.getItem('urf_cars');
    const backup = localStorage.getItem('urf_cars_backup');
    lastKnownGoodCars = (backup ? normalizeCars(JSON.parse(backup)) : []);
    if (stored) {
        cars = normalizeCars(JSON.parse(stored));
        // If local is empty but backup has data, use backup as starting point
        if (cars.length === 0 && lastKnownGoodCars.length > 0) {
            cars = lastKnownGoodCars;
        }
    } else {
        cars = createDefaultCars();
        saveLocalSnapshot();
    }
}

// Save cars to localStorage
function saveCarsToStorage() {
    persistState();
}

// Load keys from localStorage
function loadKeysFromStorage() {
    const stored = localStorage.getItem('urf_keys');
    const backup = localStorage.getItem('urf_keys_backup');
    lastKnownGoodKeys = (backup ? JSON.parse(backup) : []);
    if (stored) {
        keys = normalizeItems(JSON.parse(stored));
        // If local is empty but backup has data, use backup as starting point
        if (keys.length === 0 && lastKnownGoodKeys.length > 0) {
            keys = normalizeItems(lastKnownGoodKeys);
        }
        saveLocalSnapshot();
    } else {
        keys = createDefaultItems();
        saveLocalSnapshot();
    }
}

// Save keys to localStorage
function saveKeysToStorage() {
    persistState();
}

// Get current booking for a car (based on today's day and current hour)
function getCurrentBookingForCar(carId) {
    const { day, hour } = getCurrentScheduleContext();
    if (!day) return null;
    return bookings.find(b => sameCarId(b.carId, carId) && b.day === day && b.hour === hour && !b.isReturned) || null;
}

function getCurrentScheduleContext() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 5 = Friday, 6 = Saturday, 0 = Sunday
    let hour = now.getHours();
    let day = null;

    if (hour <= 2) {
        if (dayOfWeek === 6) day = 'friday';       // Saturday 00-02 belongs to Friday schedule
        else if (dayOfWeek === 0) day = 'saturday'; // Sunday 00-02 belongs to Saturday schedule
    } else {
        if (dayOfWeek === 5) day = 'friday';
        else if (dayOfWeek === 6) day = 'saturday';
    }

    const override = getScheduleOverrideFromUrl();
    if (override.day) {
        day = override.day;
    }
    if (override.hour !== null) {
        hour = override.hour;
    }

    return { day, hour };
}

function sameCarId(leftId, rightId) {
    return Number(leftId) === Number(rightId);
}

function getNextBookingForCar(carId) {
    const { day, hour } = getCurrentScheduleContext();
    if (!day) return null;

    const candidates = bookings
        .filter(b => sameCarId(b.carId, carId) && b.day === day && b.startHour !== undefined && b.startHour > hour && !b.isReturned)
        .sort((a, b) => a.startHour - b.startHour);

    return candidates.length > 0 ? candidates[0] : null;
}

function formatHourLabel(hour) {
    const normalizedHour = hour === 3 ? 3 : Number(hour);
    return `${String(normalizedHour).padStart(2, '0')}:00`;
}

function getAvailabilityEndHourForCar(carId) {
    const { day } = getCurrentScheduleContext();
    if (!day) return null;
    const nextBooking = getNextBookingForCar(carId);
    return nextBooking ? nextBooking.startHour : 3;
}

function getAvailabilityScore(endHour) {
    const { hour } = getCurrentScheduleContext();
    const nowIdx = HOURS.indexOf(hour);
    const endIdx = endHour === 3 ? HOURS.length : HOURS.indexOf(endHour);
    if (nowIdx === -1 || endIdx === -1) return -1;
    return endIdx - nowIdx;
}

function getBestAlternativeCar(currentCarId) {
    const currentCar = cars.find(car => sameCarId(car.id, currentCarId));
    const wantedType = currentCar?.vehicleType === 'minibus' ? 'minibus' : 'car';
    const { day } = getCurrentScheduleContext();
    if (!day) return null;

    const allCandidates = cars
        .filter(car => !sameCarId(car.id, currentCarId))
        .filter(car => !car.borrowed)
        .filter(car => !getCurrentBookingForCar(car.id))
        .map(car => {
            const availableUntilHour = getAvailabilityEndHourForCar(car.id);
            if (availableUntilHour === null) return null;

            return {
                id: car.id,
                regNumber: car.regNumber,
                vehicleType: car.vehicleType === 'minibus' ? 'minibus' : 'car',
                availableUntilHour,
                score: getAvailabilityScore(availableUntilHour)
            };
        })
        .filter(Boolean);

    const sameTypeCandidates = allCandidates
        .filter(candidate => candidate.vehicleType === wantedType)
        .sort((a, b) => b.score - a.score);
    if (sameTypeCandidates.length > 0) {
        return { ...sameTypeCandidates[0], usedFallbackType: false };
    }

    const fallbackCandidates = allCandidates.sort((a, b) => b.score - a.score);
    if (fallbackCandidates.length > 0) {
        return { ...fallbackCandidates[0], usedFallbackType: true, wantedType };
    }

    return null;
}

function switchBorrowCar(targetCarId) {
    const currentName = document.getElementById('borrowName').value;
    const targetCar = cars.find(car => sameCarId(car.id, targetCarId));
    if (!targetCar) return;

    currentItemId = targetCar.id;
    const activeBooking = getCurrentBookingForCar(targetCar.id);
    showBorrowModal(targetCar, activeBooking);

    // Keep whatever user already typed in the name field when switching car.
    document.getElementById('borrowName').value = currentName;
}

// Render all cars
function renderCars() {
    const container = document.getElementById('carsContainer');
    container.innerHTML = '';

    if (!cars.length) {
        container.innerHTML = '<div class="empty-state-card">Inga fordon ännu. Klicka på Ny Bil för att lägga till bil eller minibuss.</div>';
        return;
    }

    cars.forEach(car => {
        const card = document.createElement('div');
        card.className = 'car-card';

        let buttonClass, buttonText, borrowerHTML;

        if (car.borrowed) {
            buttonClass = 'btn-taken';
            buttonText = 'UPPTAGEN';
            const borrowedAtText = formatBorrowedTime(car.borrowedAt);
            borrowerHTML = `<div class="borrower-info"><p class="borrower-name">${car.borrowerName}${borrowedAtText ? ` <span class="borrowed-at">(${borrowedAtText})</span>` : ''}</p></div>`;
        } else {
            const activeBooking = getCurrentBookingForCar(car.id);
            if (activeBooking) {
                buttonClass = 'btn-booked';
                buttonText = 'BOKAD';
                borrowerHTML = `<div class="borrower-info"><p class="borrower-booked">📅 ${activeBooking.bookerName}${activeBooking.comment ? ' — ' + activeBooking.comment : ''}</p></div>`;
            } else {
                buttonClass = 'btn-available';
                buttonText = 'LÅNA';
                borrowerHTML = `<div class="borrower-info"><p class="empty-borrower">Ledig</p></div>`;
            }
        }

        card.innerHTML = `
            <button type="button" class="car-icon car-icon-button" onclick="openEditCarModal(${car.id})" aria-label="Redigera fordon ${car.regNumber || car.id}">${car.icon || getVehicleIcon(car.vehicleType)}</button>
            <div class="car-reg-container">
                <div class="car-reg-label">${getVehicleTypeLabel(car.vehicleType)}</div>
                <div class="car-reg-value">${car.regNumber}</div>
                <div class="car-model-value">${car.modelName || 'Okänd modell'}</div>
            </div>
            <div class="car-content">
                <button class="action-button ${buttonClass}" onclick="handleCarAction(${car.id})">
                    ${buttonText}
                </button>
                ${borrowerHTML}
            </div>
        `;

        container.appendChild(card);
    });
}

// Update registration number
function updateRegNumber(carId, newRegNumber) {
    const car = cars.find(c => c.id === carId);
    if (car) {
        car.regNumber = newRegNumber.toUpperCase().trim();
        saveCarsToStorage();
        renderCars();
    }
}

function openNewCarModal() {
    const modelInput = document.getElementById('newCarModel');
    const regInput = document.getElementById('newCarReg');
    const typeSelect = document.getElementById('newCarType');
    const title = document.getElementById('newCarModalTitle');
    const saveButton = document.getElementById('saveCarButton');
    const deleteButton = document.getElementById('deleteCarFromEditButton');
    if (!modelInput || !regInput || !typeSelect) return;

    currentEditCarId = null;
    modelInput.value = '';
    regInput.value = '';
    typeSelect.value = 'car';
    if (title) title.textContent = 'Ny bil / minibuss';
    if (saveButton) saveButton.textContent = 'Lägg till';
    if (deleteButton) deleteButton.style.display = 'none';
    document.getElementById('newCarModal').classList.add('show');
    modelInput.focus();
}

function openEditCarModal(carId) {
    const car = cars.find(c => sameCarId(c.id, carId));
    if (!car) return;

    const modelInput = document.getElementById('newCarModel');
    const regInput = document.getElementById('newCarReg');
    const typeSelect = document.getElementById('newCarType');
    const title = document.getElementById('newCarModalTitle');
    const saveButton = document.getElementById('saveCarButton');
    const deleteButton = document.getElementById('deleteCarFromEditButton');
    if (!modelInput || !regInput || !typeSelect) return;

    currentEditCarId = car.id;
    modelInput.value = String(car.modelName || '');
    regInput.value = String(car.regNumber || '');
    typeSelect.value = car.vehicleType === 'minibus' ? 'minibus' : 'car';
    if (title) title.textContent = 'Redigera fordon';
    if (saveButton) saveButton.textContent = 'Spara';
    if (deleteButton) deleteButton.style.display = 'block';
    document.getElementById('newCarModal').classList.add('show');
    modelInput.focus();
}

function confirmNewCar() {
    const modelName = String(document.getElementById('newCarModel').value || '').trim();
    const regNumber = String(document.getElementById('newCarReg').value || '').toUpperCase().trim();
    const vehicleType = String(document.getElementById('newCarType').value || 'car') === 'minibus' ? 'minibus' : 'car';

    if (!modelName) {
        alert('Vänligen fyll i modell!');
        return;
    }
    if (!regNumber) {
        alert('Vänligen fyll i reg.nr!');
        return;
    }

    if (currentEditCarId !== null) {
        cars = cars.map(car => {
            if (!sameCarId(car.id, currentEditCarId)) return car;
            return {
                ...car,
                icon: getVehicleIcon(vehicleType),
                vehicleType,
                modelName,
                regNumber
            };
        });
    } else {
        const nextId = cars.reduce((maxId, car) => Math.max(maxId, Number(car.id) || 0), 0) + 1;

        cars.push({
            id: nextId,
            icon: getVehicleIcon(vehicleType),
            vehicleType,
            modelName,
            regNumber,
            borrowed: false,
            borrowerName: '',
            borrowedAt: '',
            borrowedFromBookingId: ''
        });
    }

    saveCarsToStorage();
    renderCars();
    renderBookingGrid();
    closeModal();
}

function deleteEditedCar() {
    if (currentEditCarId === null) return;
    const car = cars.find(c => sameCarId(c.id, currentEditCarId));
    if (!car) return;

    const confirmed = window.confirm(`Ta bort fordon ${car.regNumber} (${car.modelName || getVehicleTypeLabel(car.vehicleType)})?`);
    if (!confirmed) return;

    cars = cars.filter(item => !sameCarId(item.id, currentEditCarId));
    bookings = bookings.filter(booking => !sameCarId(booking.carId, currentEditCarId));

    persistState();
    renderCars();
    renderBookingGrid();
    closeModal();
}

function openDeleteCarModal(carId) {
    const car = cars.find(c => sameCarId(c.id, carId));
    if (!car) return;

    currentDeleteCarId = car.id;
    const info = document.getElementById('deleteCarInfo');
    if (info) {
        info.textContent = `Är du säker på att du vill ta bort detta fordon: ${car.regNumber} (${car.modelName || getVehicleTypeLabel(car.vehicleType)})?`;
    }

    document.getElementById('deleteCarModal').classList.add('show');
}

function confirmDeleteCar() {
    if (currentDeleteCarId === null) return;

    cars = cars.filter(car => !sameCarId(car.id, currentDeleteCarId));
    bookings = bookings.filter(booking => !sameCarId(booking.carId, currentDeleteCarId));

    persistState();
    renderCars();
    renderBookingGrid();
    closeModal();
}

// Update key name
function updateKeyName(keyId, newKeyName) {
    const key = keys.find(k => k.id === keyId);
    if (key) {
        key.keyName = newKeyName.trim();
        saveKeysToStorage();
        renderKeys();
    }
}

function addKeyItem() {
    const nextId = keys.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
    const nextNumber = keys.length + 1;

    keys.push({
        id: nextId,
        keyName: `Pryl ${nextNumber}`,
        borrowed: false,
        borrowerName: '',
        borrowedAt: ''
    });

    saveKeysToStorage();
    renderKeys();
}

// Render all keys
function renderKeys() {
    const container = document.getElementById('keysContainer');
    container.innerHTML = '';

    keys.forEach(key => {
        const card = document.createElement('div');
        card.className = 'key-card';
        
        const buttonClass = key.borrowed ? 'btn-taken' : 'btn-available';
        const buttonText = key.borrowed ? 'UPPTAGEN' : 'LÅNA';
        
        let borrowerHTML = '';
        if (key.borrowed) {
            const borrowedAtText = formatBorrowedTime(key.borrowedAt);
            borrowerHTML = `
                <div class="borrower-info">
                    <p class="borrower-name">${key.borrowerName}${borrowedAtText ? ` <span class="borrowed-at">(${borrowedAtText})</span>` : ''}</p>
                </div>
            `;
        } else {
            borrowerHTML = `
                <div class="borrower-info">
                    <p class="empty-borrower">Ledig</p>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="key-reg-container">
                <label class="key-reg-label">Pryl</label>
                <input 
                    type="text" 
                    class="key-reg-input" 
                    value="${key.keyName}"
                    onchange="updateKeyName(${key.id}, this.value)"
                >
            </div>
            <div class="car-content">
                <button class="action-button ${buttonClass}" onclick="handleKeyAction(${key.id})">
                    ${buttonText}
                </button>
                ${borrowerHTML}
            </div>
        `;

        container.appendChild(card);
    });
}

// Handle car action (borrow or return)
function handleCarAction(carId) {
    const car = cars.find(c => c.id === carId);
    if (!car) return;

    currentItemId = carId;
    currentItemType = 'car';

    if (car.borrowed) {
        showReturnModal(car);
    } else {
        const activeBooking = getCurrentBookingForCar(car.id);
        showBorrowModal(car, activeBooking);
    }
}

// Handle key action (borrow or return)
function handleKeyAction(keyId) {
    const key = keys.find(k => k.id === keyId);
    if (!key) return;

    currentItemId = keyId;
    currentItemType = 'key';

    if (key.borrowed) {
        // Show return modal
        showReturnKeyModal(key);
    } else {
        // Show borrow modal
        showBorrowKeyModal(key);
    }
}

// Show borrow modal
function showBorrowModal(car, activeBooking) {
    const modal = document.getElementById('borrowModal');
    const notice = document.getElementById('borrowCarNotice');
    const suggestion = document.getElementById('borrowCarSuggestion');
    document.getElementById('borrowCarInfo').textContent = `Reg.nr: ${car.regNumber}`;
    // Prefill name from active booking if available
    document.getElementById('borrowName').value = activeBooking ? activeBooking.bookerName : '';
    currentBorrowBookingId = activeBooking && !activeBooking.isReturned ? String(activeBooking.id) : null;
    // Update autocomplete suggestions
    updateBorrowerNamesList();

    const nextBooking = getNextBookingForCar(car.id);
    if (nextBooking && sameCarId(nextBooking.carId, car.id)) {
        const fromTime = `${String(nextBooking.startHour).padStart(2, '0')}:00`;
        notice.textContent = `Notis: Denna bil är bokad från ${fromTime} och behöver vara tillbaka då.`;
        notice.style.display = 'block';

        const alternative = getBestAlternativeCar(car.id);
        if (alternative) {
            const untilLabel = formatHourLabel(alternative.availableUntilHour);
            const altLabel = alternative.regNumber || `Bil ${alternative.id}`;
            const fallbackInfo = alternative.usedFallbackType
                ? `<br><strong>Ingen ledig ${getVehicleTypeLabel(alternative.wantedType).toLowerCase()} hittades just nu.</strong>`
                : '';
            suggestion.innerHTML = `Om du behöver bilen längre än så rekommenderar jag ${altLabel}. Den är ledig fram till ${untilLabel}.${fallbackInfo}<br><button type="button" class="borrow-switch-btn" onclick="switchBorrowCar(${alternative.id})">Vill du byta till ${altLabel}?</button>`;
            suggestion.style.display = 'block';
        } else {
            suggestion.style.display = 'none';
            suggestion.innerHTML = '';
        }
    } else {
        notice.style.display = 'none';
        notice.textContent = '';
        suggestion.style.display = 'none';
        suggestion.innerHTML = '';
    }

    modal.classList.add('show');
    currentModal = 'borrow';
    document.getElementById('borrowName').focus();
}

// Show return modal
function showReturnModal(car) {
    const modal = document.getElementById('returnModal');
    document.getElementById('returnCarInfo').textContent = `Reg.nr: ${car.regNumber} - Lånad av: ${car.borrowerName}`;
    modal.classList.add('show');
    currentModal = 'return';
}

// Show borrow key modal
function showBorrowKeyModal(key) {
    const modal = document.getElementById('borrowKeyModal');
    document.getElementById('borrowKeyInfo').textContent = `Pryl: ${key.keyName}`;
    document.getElementById('borrowKeyName').value = '';
    // Update autocomplete suggestions
    updateBorrowerNamesList();
    modal.classList.add('show');
    currentModal = 'borrowKey';
    document.getElementById('borrowKeyName').focus();
}

// Show return key modal
function showReturnKeyModal(key) {
    const modal = document.getElementById('returnKeyModal');
    document.getElementById('returnKeyInfo').textContent = `Pryl: ${key.keyName} - Lånad av: ${key.borrowerName}`;
    modal.classList.add('show');
    currentModal = 'returnKey';
}

// Confirm borrow
function confirmBorrow() {
    const name = document.getElementById('borrowName').value.trim();

    if (!name) {
        alert('Vänligen fyll i namn!');
        return;
    }

    const car = cars.find(c => c.id === currentItemId);
    if (car) {
        car.borrowed = true;
        car.borrowerName = name;
        car.borrowedAt = new Date().toISOString();
        car.borrowedFromBookingId = currentBorrowBookingId || '';
        // Add to borrow history for autocomplete
        if (!car.borrowHistory) car.borrowHistory = [];
        if (!car.borrowHistory.includes(name)) {
            car.borrowHistory.push(name);
        }
        saveCarsToStorage();
        renderCars();
        closeModal();
    }
}

// Confirm return
function confirmReturn() {
    const car = cars.find(c => c.id === currentItemId);
    if (car) {
        const linkedBookingId = String(car.borrowedFromBookingId || '');
        if (linkedBookingId) {
            bookings = bookings.map(booking => {
                if (String(booking.id) !== linkedBookingId) return booking;
                if (booking.isReturned) return booking;
                return {
                    ...booking,
                    isReturned: true,
                    returnedAt: new Date().toISOString()
                };
            });
        }
        car.borrowed = false;
        // Keep borrowerName in borrowHistory, but clear current borrow info
        car.borrowedAt = '';
        car.borrowedFromBookingId = '';
        // Don't clear borrowerName yet - we'll clear it after saving to history
        if (!car.borrowHistory) car.borrowHistory = [];
        if (car.borrowerName && !car.borrowHistory.includes(car.borrowerName)) {
            car.borrowHistory.push(car.borrowerName);
        }
        car.borrowerName = '';
        saveCarsToStorage();
        renderCars();
        renderBookingGrid();
        closeModal();
    }
}

// Confirm borrow key
function confirmBorrowKey() {
    const name = document.getElementById('borrowKeyName').value.trim();

    if (!name) {
        alert('Vänligen fyll i namn!');
        return;
    }

    const key = keys.find(k => k.id === currentItemId);
    if (key) {
        key.borrowed = true;
        key.borrowerName = name;
        key.borrowedAt = new Date().toISOString();
        // Add to borrow history for autocomplete
        if (!key.borrowHistory) key.borrowHistory = [];
        if (!key.borrowHistory.includes(name)) {
            key.borrowHistory.push(name);
        }
        saveKeysToStorage();
        renderKeys();
        closeModal();
    }
}

// Confirm return key
function confirmReturnKey() {
    const key = keys.find(k => k.id === currentItemId);
    if (key) {
        key.borrowed = false;
        // Keep borrowerName in borrowHistory, but clear current borrow info
        if (!key.borrowHistory) key.borrowHistory = [];
        if (key.borrowerName && !key.borrowHistory.includes(key.borrowerName)) {
            key.borrowHistory.push(key.borrowerName);
        }
        key.borrowerName = '';
        key.borrowedAt = '';
        saveKeysToStorage();
        renderKeys();
        closeModal();
    }
}

// Close modal
function closeModal() {
    ['borrowModal','returnModal','borrowKeyModal','returnKeyModal','newBookingModal','cancelBookingModal','newContactModal','newCarModal','deleteCarModal','newOrderModal'].forEach(id => {
        document.getElementById(id).classList.remove('show');
    });
    const notice = document.getElementById('borrowCarNotice');
    const suggestion = document.getElementById('borrowCarSuggestion');
    if (notice) {
        notice.style.display = 'none';
        notice.textContent = '';
    }
    if (suggestion) {
        suggestion.style.display = 'none';
        suggestion.innerHTML = '';
    }
    currentModal = null;
    currentItemId = null;
    currentItemType = null;
    currentBorrowBookingId = null;
    currentDeleteCarId = null;
    currentEditCarId = null;
}

// Switch between tabs
function switchTab(tabName) {
    ['cars-section','keys-section','booking-section','contacts-section','orders-section'].forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

    if (tabName === 'cars') {
        document.getElementById('cars-section').classList.add('active');
        document.querySelectorAll('.tab-button')[0].classList.add('active');
    } else if (tabName === 'keys') {
        document.getElementById('keys-section').classList.add('active');
        document.querySelectorAll('.tab-button')[1].classList.add('active');
    } else if (tabName === 'booking') {
        document.getElementById('booking-section').classList.add('active');
        document.querySelectorAll('.tab-button')[2].classList.add('active');
        renderBookingGrid();
    } else if (tabName === 'contacts') {
        document.getElementById('contacts-section').classList.add('active');
        document.querySelectorAll('.tab-button')[3].classList.add('active');
        renderContacts();
    } else if (tabName === 'orders') {
        document.getElementById('orders-section').classList.add('active');
        document.querySelectorAll('.tab-button')[4].classList.add('active');
        renderOrders();
    }
}

// ---- Booking functions ----

function loadBookingsFromStorage() {
    const stored = localStorage.getItem('urf_bookings');
    bookings = stored ? JSON.parse(stored) : [];
}

function saveBookingsToStorage() {
    persistState();
}

function loadContactsFromStorage() {
    const stored = localStorage.getItem('urf_contacts');
    const backup = localStorage.getItem('urf_contacts_backup');
    lastKnownGoodContacts = (backup ? JSON.parse(backup) : []);
    contacts = stored ? JSON.parse(stored) : [];
    // If local is empty but backup has data, use backup as starting point
    if (contacts.length === 0 && lastKnownGoodContacts.length > 0) {
        contacts = lastKnownGoodContacts;
    }
}

function loadBookingsFromStorage() {
    const stored = localStorage.getItem('urf_bookings');
    const backup = localStorage.getItem('urf_bookings_backup');
    lastKnownGoodBookings = (backup ? JSON.parse(backup) : []);
    bookings = stored ? JSON.parse(stored) : [];
    // If local is empty but backup has data, use backup as starting point
    if (bookings.length === 0 && lastKnownGoodBookings.length > 0) {
        bookings = lastKnownGoodBookings;
    }
}

function saveContactsToStorage() {
    persistState();
}

function loadOrdersFromStorage() {
    const stored = localStorage.getItem('urf_orders');
    const backup = localStorage.getItem('urf_orders_backup');
    lastKnownGoodOrders = (backup ? normalizeOrders(JSON.parse(backup)) : []);
    orders = stored ? normalizeOrders(JSON.parse(stored)) : [];
    // If local is empty but backup has data, use backup as starting point
    if (orders.length === 0 && lastKnownGoodOrders.length > 0) {
        orders = lastKnownGoodOrders;
    }
}

function saveOrdersToStorage() {
    persistState();
}

function toTelHref(phone) {
    const raw = String(phone || '').trim();
    if (!raw) return '';
    const cleaned = raw.replace(/[^\d+]/g, '');
    return cleaned ? `tel:${cleaned}` : '';
}

function renderContacts() {
    const container = document.getElementById('contactsContainer');
    if (!container) return;

    if (!contacts.length) {
        container.innerHTML = '<div class="contact-row"><div class="contact-col contact-empty">Inga kontakter ännu</div></div>';
        return;
    }

    container.innerHTML = '';
    contacts.forEach(contact => {
        const telHref = toTelHref(contact.phone);
        const callAction = telHref
            ? `<a class="contact-call-btn" href="${telHref}">Ring</a>`
            : '<button class="contact-call-btn is-disabled" type="button" disabled>Ring</button>';

        const row = document.createElement('div');
        row.className = 'contact-row';
        row.innerHTML = `
            <div class="contact-col contact-name">${contact.name || '-'}</div>
            <div class="contact-col contact-phone">${contact.phone || '-'}</div>
            <div class="contact-col contact-note">${contact.note || '-'}</div>
            <div class="contact-actions">${callAction}</div>
            <button class="contact-delete-btn" onclick="removeContact(${contact.id})" aria-label="Ta bort kontakt">X</button>
        `;
        container.appendChild(row);
    });
}

function openNewContactModal() {
    document.getElementById('contactName').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactNote').value = '';
    document.getElementById('newContactModal').classList.add('show');
    document.getElementById('contactName').focus();
}

function confirmNewContact() {
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const note = document.getElementById('contactNote').value.trim();

    if (!name) {
        alert('Vänligen fyll i namn!');
        return;
    }

    contacts.push({
        id: Date.now(),
        name,
        phone,
        note
    });

    saveContactsToStorage();
    renderContacts();
    closeModal();
}

function removeContact(contactId) {
    contacts = contacts.filter(contact => contact.id !== contactId);
    saveContactsToStorage();
    renderContacts();
}

function switchBookingDay(day) {
    currentBookingDay = day;
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));
    const idx = day === 'friday' ? 0 : 1;
    document.querySelectorAll('.day-btn')[idx].classList.add('active');
    renderBookingGrid();
}

function renderBookingGrid() {
    const container = document.getElementById('bookingGrid');
    if (!container) return;

    let html = '<div class="booking-table-wrapper"><table class="booking-table"><thead><tr><th>Tid</th>';
    cars.forEach(car => {
        html += `<th>${car.regNumber || 'Bil ' + car.id}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Track which cells have been merged (rowspanned)
    const skipped = {}; // key = `${carId}_${hour}`

    HOURS.forEach(hour => {
        html += `<tr><td class="hour-cell">${String(hour).padStart(2,'0')}:00</td>`;
        cars.forEach(car => {
            const key = `${car.id}_${hour}`;
            if (skipped[key]) return; // already covered by a rowspan

            const booking = bookings.find(b => b.carId === car.id && b.day === currentBookingDay && b.hour === hour);
            if (booking) {
                const startIdx = HOURS.indexOf(booking.startHour);
                const endIdx = booking.endHour === 3 ? HOURS.length : HOURS.indexOf(booking.endHour);
                const span = endIdx - startIdx;
                // Mark subsequent hours as skipped
                for (let i = startIdx + 1; i < endIdx; i++) {
                    skipped[`${car.id}_${HOURS[i]}`] = true;
                }
                const spanAttr = span > 1 ? ` rowspan="${span}"` : '';
                const endLabel = booking.endHour === 3 ? '03:00' : `${String(booking.endHour).padStart(2,'0')}:00`;
                const timeLabel = `${String(booking.startHour).padStart(2,'0')}:00–${endLabel}`;
                const commentHtml = booking.comment ? `<br><span class="booking-comment">${booking.comment}</span>` : '';
                const returnedHtml = booking.isReturned ? '<br><small class="booking-returned-label">Återlämnad</small>' : '';
                const bookedClass = booking.isReturned ? 'booked returned' : 'booked';
                html += `<td class="booking-cell ${bookedClass}"${spanAttr} onclick="handleCancelBooking(${booking.id})">${booking.bookerName}<br><small>${timeLabel}</small>${commentHtml}${returnedHtml}</td>`;
            } else {
                html += `<td class="booking-cell free" onclick="handleNewBooking('${currentBookingDay}', ${hour}, ${car.id})">Ledig</td>`;
            }
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function handleNewBooking(day, hour, carId) {
    currentBookingDay = day;
    currentBookingHour = hour;
    currentBookingCarId = carId;

    const car = cars.find(c => c.id === carId);
    const dayName = day === 'friday' ? 'Fredag' : 'Lördag';
    document.getElementById('newBookingInfo').textContent =
        `${dayName} — ${car.regNumber}`;

    // Populate end-hour dropdown: from start+1 up to last available hour for this car
    const select = document.getElementById('bookingEndHour');
    select.innerHTML = '';
    const startIdx = HOURS.indexOf(hour);
    for (let i = startIdx + 1; i <= HOURS.length; i++) {
        // Check if any hour between start and this index is already booked
        const hoursInRange = HOURS.slice(startIdx, i);
        const blocked = hoursInRange.some(h =>
            bookings.some(b => b.carId === carId && b.day === day && b.hour === h)
        );
        if (blocked) break;
        const endHourVal = i < HOURS.length ? HOURS[i] : 3; // 3 = one past 02:00
        const endLabel = i < HOURS.length ? `${String(HOURS[i]).padStart(2,'0')}:00` : '03:00';
        const duration = i - startIdx;
        const opt = document.createElement('option');
        opt.value = endHourVal;
        opt.textContent = `${endLabel}  (${duration} tim)`;
        if (i === startIdx + 1) opt.selected = true;
        select.appendChild(opt);
    }

    document.getElementById('bookingName').value = '';
    document.getElementById('bookingComment').value = '';
    document.getElementById('newBookingModal').classList.add('show');
    document.getElementById('bookingName').focus();
}

function confirmNewBooking() {
    const name = document.getElementById('bookingName').value.trim();
    if (!name) {
        alert('Vänligen fyll i namn!');
        return;
    }
    const endHour = parseInt(document.getElementById('bookingEndHour').value);
    const comment = document.getElementById('bookingComment').value.trim();
    const bookingId = Date.now();
    // Create one booking entry per hour spanned
    const startIdx = HOURS.indexOf(currentBookingHour);
    const endIdx = endHour === 3 ? HOURS.length : HOURS.indexOf(endHour);
    for (let i = startIdx; i < endIdx; i++) {
        bookings.push({
            id: bookingId,
            carId: currentBookingCarId,
            day: currentBookingDay,
            hour: HOURS[i],
            startHour: currentBookingHour,
            endHour: endHour,
            bookerName: name,
            comment: comment,
            isReturned: false,
            returnedAt: ''
        });
    }
    saveBookingsToStorage();
    renderBookingGrid();
    closeModal();
}

function handleCancelBooking(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const car = cars.find(c => c.id === booking.carId);
    const dayName = booking.day === 'friday' ? 'Fredag' : 'Lördag';
    const timeLabel = `${String(booking.startHour).padStart(2,'0')}:00–${String(booking.endHour).padStart(2,'0')}:00`;
    const commentPart = booking.comment ? ` — "${booking.comment}"` : '';
    const returnedPart = booking.isReturned ? ' — återlämnad' : '';
    document.getElementById('cancelBookingInfo').textContent =
        `${dayName} ${timeLabel} — ${car.regNumber} — ${booking.bookerName}${commentPart}${returnedPart}`;

    const markReturnedButton = document.getElementById('markReturnedBookingBtn');
    if (markReturnedButton) {
        markReturnedButton.disabled = Boolean(booking.isReturned);
        markReturnedButton.textContent = booking.isReturned ? 'Redan återlämnad' : 'Återlämnad';
    }

    document.getElementById('cancelBookingModal').classList.add('show');
    currentItemId = bookingId;
    currentItemType = 'booking';
}

function confirmReturnBooking() {
    const selectedBooking = bookings.find(booking => String(booking.id) === String(currentItemId));

    bookings = bookings.map(booking => {
        if (String(booking.id) !== String(currentItemId)) return booking;
        return {
            ...booking,
            isReturned: true,
            returnedAt: new Date().toISOString()
        };
    });

    // Keep Cars page in sync: if this booking car is currently marked as borrowed, release it.
    if (selectedBooking) {
        cars = cars.map(car => {
            const linkedMatch = String(car.borrowedFromBookingId || '') === String(currentItemId);
            const legacyMatch = !car.borrowedFromBookingId
                && car.borrowed
                && sameCarId(car.id, selectedBooking.carId)
                && String(car.borrowerName || '').trim() === String(selectedBooking.bookerName || '').trim();

            if (!linkedMatch && !legacyMatch) return car;

            return {
                ...car,
                borrowed: false,
                borrowerName: '',
                borrowedAt: '',
                borrowedFromBookingId: ''
            };
        });
    }

    saveBookingsToStorage();
    renderCars();
    renderBookingGrid();
    closeModal();
}

function confirmCancelBooking() {
    bookings = bookings.filter(b => b.id !== currentItemId);
    saveBookingsToStorage();
    renderBookingGrid();
    closeModal();
}

// ---- Order (Inköpslista) functions ----

function renderOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    if (!orders.length) {
        container.innerHTML = '<div class="order-row"><div class="order-col order-empty">Ingen beställning än</div></div>';
        return;
    }

    container.innerHTML = '';
    orders.forEach(order => {
        const row = document.createElement('div');
        row.className = `order-row${order.completed ? ' order-completed' : ''}`;
        const isNewSyncedOrder = newlySyncedOrderIds.has(String(order.id));
        
        const deliveryText = order.deliveryType === 'asap' 
            ? 'Levereras snarast'
            : `Före ${order.deliveryTime}`;
        
        const createdDate = new Date(order.createdAt);
        const createdTime = createdDate.toLocaleString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });

        const completedClass = order.completed ? ' order-completed-text' : '';
        
        row.innerHTML = `
            <div class="order-col order-article"><strong>${order.article}</strong>${isNewSyncedOrder ? '<span class="order-new-badge">Ny</span>' : ''}</div>
            <div class="order-col order-location">${order.location}</div>
            <div class="order-col order-orderer">${order.orderer}</div>
            <div class="order-col order-delivery">${deliveryText}</div>
            <div class="order-col order-created">${createdTime}</div>
            <div class="order-actions">
                ${order.completed 
                    ? '<span class="order-status-completed">✓ Levererad</span>' 
                    : `<button class="order-complete-btn" onclick="markOrderCompleted(${order.id})">Markera</button>`
                }
                <button class="order-delete-btn" onclick="deleteOrder(${order.id})" aria-label="Ta bort beställning">X</button>
            </div>
        `;
        container.appendChild(row);
    });
}

function openNewOrderModal() {
    document.getElementById('orderArticle').value = '';
    document.getElementById('orderLocation').value = '';
    document.getElementById('orderOrderer').value = '';
    document.querySelectorAll('input[name="deliveryType"]').forEach(radio => {
        radio.checked = radio.value === 'asap';
    });
    document.getElementById('deliveryTimeGroup').style.display = 'none';
    document.getElementById('orderDeliveryTime').value = '';
    document.getElementById('newOrderModal').classList.add('show');
    document.getElementById('orderArticle').focus();
}

function toggleDeliveryTime() {
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    const timeGroup = document.getElementById('deliveryTimeGroup');
    if (deliveryType === 'scheduled') {
        timeGroup.style.display = 'block';
        document.getElementById('orderDeliveryTime').focus();
    } else {
        timeGroup.style.display = 'none';
        document.getElementById('orderDeliveryTime').value = '';
    }
}

function playOrderAddedSound() {
    if (!ORDER_ADDED_SOUND_URL) return;

    try {
        const audio = new Audio(ORDER_ADDED_SOUND_URL);
        audio.volume = 0.9;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(error => {
                console.warn('URF: kunde inte spela upp beställningsljud.', error);
            });
        }
    } catch (error) {
        console.warn('URF: kunde inte initiera beställningsljud.', error);
    }
}

function confirmNewOrder() {
    const article = document.getElementById('orderArticle').value.trim();
    const location = document.getElementById('orderLocation').value.trim();
    const orderer = document.getElementById('orderOrderer').value.trim();
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    const deliveryTime = document.getElementById('orderDeliveryTime').value.trim();

    if (!article) {
        alert('Vänligen fyll i artikel!');
        return;
    }
    if (!location) {
        alert('Vänligen fyll i leveransplats!');
        return;
    }
    if (!orderer) {
        alert('Vänligen fyll i beställare!');
        return;
    }
    if (deliveryType === 'scheduled' && !deliveryTime) {
        alert('Vänligen fyll i klockslag!');
        return;
    }

    orders.push({
        id: Date.now(),
        article,
        location,
        orderer,
        deliveryType,
        deliveryTime: deliveryType === 'scheduled' ? deliveryTime : '',
        createdAt: new Date().toISOString(),
        completed: false
    });

    saveOrdersToStorage();
    renderOrders();
    closeModal();
}

function markOrderCompleted(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.completed = true;
        order.completedAt = new Date().toISOString();
        // Save to history
        const historyEntry = {
            ...order,
            savedToHistoryAt: new Date().toISOString()
        };
        completedOrdersHistory.push(historyEntry);
        saveOrdersToStorage();
        saveCompletedOrdersHistory();
        renderOrders();
    }
}

function deleteOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    // If order is completed, save to history before deletion
    if (order && order.completed) {
        const historyEntry = {
            ...order,
            deletedAt: new Date().toISOString()
        };
        if (!completedOrdersHistory.find(h => h.id === order.id)) {
            completedOrdersHistory.push(historyEntry);
            saveCompletedOrdersHistory();
        }
    }
    orders = orders.filter(order => order.id !== orderId);
    saveOrdersToStorage();
    renderOrders();
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const borrowModal = document.getElementById('borrowModal');
    const returnModal = document.getElementById('returnModal');
    const borrowKeyModal = document.getElementById('borrowKeyModal');
    const returnKeyModal = document.getElementById('returnKeyModal');
    
    const modalIds = ['borrowModal','returnModal','borrowKeyModal','returnKeyModal','newBookingModal','cancelBookingModal','newContactModal','newCarModal','deleteCarModal','newOrderModal'];
    if (modalIds.some(id => e.target === document.getElementById(id))) {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
