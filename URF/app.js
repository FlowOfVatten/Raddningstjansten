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

let cars = [];
let keys = [];
let bookings = [];
let currentBookingDay = 'friday';
let currentBookingHour = null;
let currentBookingCarId = null;
let currentModal = null;
let currentItemId = null;
let currentItemType = null;
let saveDebounceTimer = null;
let pendingRemoteSave = false;
let isRemoteSyncInProgress = false;

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

function updateSyncStatus(text, stateClass = 'is-ok') {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `sync-status ${stateClass}`;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadCarsFromStorage();
    loadKeysFromStorage();
    loadBookingsFromStorage();

    renderCars();
    renderKeys();
    renderBookingGrid();

    const localUpdatedAt = getLocalUpdatedAt();
    updateSyncStatus(
        localUpdatedAt ? `Last sync: ${formatSyncTime(localUpdatedAt)} (cache)` : 'Last sync: lokal cache',
        localUpdatedAt ? 'is-ok' : 'is-pending'
    );

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
    return CARS_DATA.map(car => ({
        id: car.id,
        icon: car.icon,
        regNumber: `URF-${String(car.id).padStart(3, '0')}`,
        borrowed: false,
        borrowerName: ''
    }));
}

function createDefaultItems() {
    return KEYS_DATA.map(item => ({
        id: item.id,
        keyName: `Pryl ${item.id}`,
        borrowed: false,
        borrowerName: ''
    }));
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
            borrowerName: String(item?.borrowerName || '')
        };
    });
}

function getStatePayload() {
    return {
        version: 1,
        cars,
        keys,
        bookings
    };
}

function saveLocalSnapshot() {
    localStorage.setItem('urf_cars', JSON.stringify(cars));
    localStorage.setItem('urf_keys', JSON.stringify(keys));
    localStorage.setItem('urf_bookings', JSON.stringify(bookings));
}

function scheduleRemoteSave() {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }

    pendingRemoteSave = true;
    updateSyncStatus('Last sync: osynkade lokala ändringar', 'is-pending');

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
    cars = Array.isArray(payload.cars) && payload.cars.length ? payload.cars : cars;
    keys = normalizeItems(payload.keys);
    bookings = Array.isArray(payload.bookings) ? payload.bookings : bookings;
    saveLocalSnapshot();
    if (remoteUpdatedAt) {
        setLocalUpdatedAt(new Date(remoteUpdatedAt).toISOString());
    }
    renderCars();
    renderKeys();
    renderBookingGrid();
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
        updateSyncStatus('Last sync: synkar...', 'is-syncing');
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
            updateSyncStatus('Last sync: väntar på databas...', 'is-pending');
            return false;
        }

        pendingRemoteSave = false;
        updateSyncStatus(`Last sync: ${formatSyncTime(timestamp)}`, 'is-ok');
        return true;
    } catch (error) {
        // Keep running with local cache if remote save fails.
        pendingRemoteSave = true;
        updateSyncStatus('Last sync: väntar på databas...', 'is-pending');
        console.warn('URF: kunde inte spara state till API, sparat lokalt.', error);
        return false;
    }
}

async function syncWithRemoteOnce() {
    if (isRemoteSyncInProgress) return false;
    isRemoteSyncInProgress = true;

    try {
        updateSyncStatus('Last sync: kontaktar databas...', 'is-syncing');
        const result = await loadStateFromApi();
        if (!result.ok) {
            updateSyncStatus('Last sync: DB sover, använder cache', 'is-pending');
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
                remoteUpdatedAt ? `Last sync: ${formatSyncTime(remoteUpdatedAt)}` : 'Last sync: ansluten',
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
    if (stored) {
        cars = JSON.parse(stored);
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
    if (stored) {
        keys = normalizeItems(JSON.parse(stored));
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
    const now = new Date();
    const dayOfWeek = now.getDay(); // 5 = Friday, 6 = Saturday, 0 = Sunday
    const hour = now.getHours();
    let day = null;
    // Hours 0-2 belong to the previous night's day
    if (hour <= 2) {
        if (dayOfWeek === 6) day = 'friday';       // Saturday 00-02 = Friday night
        else if (dayOfWeek === 0) day = 'saturday'; // Sunday 00-02 = Saturday night
    } else {
        if (dayOfWeek === 5) day = 'friday';
        else if (dayOfWeek === 6) day = 'saturday';
    }
    if (!day) return null;
    return bookings.find(b => b.carId === carId && b.day === day && b.hour === hour) || null;
}

function getCurrentScheduleContext() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 5 = Friday, 6 = Saturday, 0 = Sunday
    const hour = now.getHours();
    let day = null;

    if (hour <= 2) {
        if (dayOfWeek === 6) day = 'friday';       // Saturday 00-02 belongs to Friday schedule
        else if (dayOfWeek === 0) day = 'saturday'; // Sunday 00-02 belongs to Saturday schedule
    } else {
        if (dayOfWeek === 5) day = 'friday';
        else if (dayOfWeek === 6) day = 'saturday';
    }

    return { day, hour };
}

function getNextBookingForCar(carId) {
    const { day, hour } = getCurrentScheduleContext();
    if (!day) return null;

    const candidates = bookings
        .filter(b => b.carId === carId && b.day === day && b.startHour !== undefined && b.startHour > hour)
        .sort((a, b) => a.startHour - b.startHour);

    return candidates.length > 0 ? candidates[0] : null;
}

// Render all cars
function renderCars() {
    const container = document.getElementById('carsContainer');
    container.innerHTML = '';

    cars.forEach(car => {
        const card = document.createElement('div');
        card.className = 'car-card';

        let buttonClass, buttonText, borrowerHTML;

        if (car.borrowed) {
            buttonClass = 'btn-taken';
            buttonText = 'UPPTAGEN';
            borrowerHTML = `<div class="borrower-info"><p class="borrower-name">${car.borrowerName}</p></div>`;
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
            <div class="car-icon">${car.icon}</div>
            <div class="car-reg-container">
                <label class="car-reg-label">Reg.nr</label>
                <input 
                    type="text" 
                    class="car-reg-input" 
                    value="${car.regNumber}"
                    onchange="updateRegNumber(${car.id}, this.value)"
                    maxlength="10"
                >
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

// Update key name
function updateKeyName(keyId, newKeyName) {
    const key = keys.find(k => k.id === keyId);
    if (key) {
        key.keyName = newKeyName.trim();
        saveKeysToStorage();
        renderKeys();
    }
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
            borrowerHTML = `
                <div class="borrower-info">
                    <p class="borrower-name">${key.borrowerName}</p>
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
    document.getElementById('borrowCarInfo').textContent = `Reg.nr: ${car.regNumber}`;
    // Prefill name from active booking if available
    document.getElementById('borrowName').value = activeBooking ? activeBooking.bookerName : '';

    const nextBooking = getNextBookingForCar(car.id);
    if (nextBooking) {
        const fromTime = `${String(nextBooking.startHour).padStart(2, '0')}:00`;
        notice.textContent = `Notis: Denna bil är bokad från ${fromTime} och behöver vara tillbaka då.`;
        notice.style.display = 'block';
    } else {
        notice.style.display = 'none';
        notice.textContent = '';
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
        saveCarsToStorage();
        renderCars();
        closeModal();
    }
}

// Confirm return
function confirmReturn() {
    const car = cars.find(c => c.id === currentItemId);
    if (car) {
        car.borrowed = false;
        car.borrowerName = '';
        saveCarsToStorage();
        renderCars();
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
        key.borrowerName = '';
        saveKeysToStorage();
        renderKeys();
        closeModal();
    }
}

// Close modal
function closeModal() {
    ['borrowModal','returnModal','borrowKeyModal','returnKeyModal','newBookingModal','cancelBookingModal'].forEach(id => {
        document.getElementById(id).classList.remove('show');
    });
    currentModal = null;
    currentItemId = null;
    currentItemType = null;
}

// Switch between tabs
function switchTab(tabName) {
    ['cars-section','keys-section','booking-section'].forEach(id => {
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
                html += `<td class="booking-cell booked"${spanAttr} onclick="handleCancelBooking(${booking.id})">${booking.bookerName}<br><small>${timeLabel}</small>${commentHtml}</td>`;
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
            comment: comment
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
    document.getElementById('cancelBookingInfo').textContent =
        `${dayName} ${timeLabel} — ${car.regNumber} — ${booking.bookerName}${commentPart}`;
    document.getElementById('cancelBookingModal').classList.add('show');
    currentItemId = bookingId;
    currentItemType = 'booking';
}

function confirmCancelBooking() {
    bookings = bookings.filter(b => b.id !== currentItemId);
    saveBookingsToStorage();
    renderBookingGrid();
    closeModal();
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const borrowModal = document.getElementById('borrowModal');
    const returnModal = document.getElementById('returnModal');
    const borrowKeyModal = document.getElementById('borrowKeyModal');
    const returnKeyModal = document.getElementById('returnKeyModal');
    
    const modalIds = ['borrowModal','returnModal','borrowKeyModal','returnKeyModal','newBookingModal','cancelBookingModal'];
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
