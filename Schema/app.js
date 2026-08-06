const scheduleContainer = document.getElementById('scheduleContainer');

const STATUS = {
  scheduled: 'scheduled',
  checkedIn: 'checkedIn',
  blocked: 'blocked',
};

const STORAGE_KEY = 'schemaDemoStateV2';
const LEGACY_STORAGE_KEY = 'schemaDemoStateV1';
const MAX_AUDIT_ENTRIES = 120;

const sampleData = [
  {
    id: 'schedule-1',
    title: 'Grind',
    description: 'Inpassering',
    shifts: ['08:00-12:00', '12:00-16:00'],
    mainContact: { name: 'Linda Svensson', phone: '070-123 45 67' },
    persons: [
      { id: 'p-1', name: 'Anna Andersson', phone: '070-111 22 33', status: STATUS.scheduled, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Anna' },
      { id: 'p-2', name: 'Bjorn Bergstrom', phone: '070-222 33 44', status: STATUS.checkedIn, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Bjorn' },
      { id: 'p-3', name: 'Carina Carlsson', phone: '070-333 44 55', status: STATUS.scheduled, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Carina' },
      { id: 'p-4', name: 'David Dahlberg', phone: '070-444 55 66', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=David' },
      { id: 'p-5', name: 'Elin Eriksson', phone: '070-555 66 77', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Elin' },
      { id: 'p-6', name: 'Filip Feldt', phone: '070-666 77 88', status: STATUS.checkedIn, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Filip' },
      { id: 'p-7', name: 'Greta Gustafsson', phone: '070-777 88 99', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Greta' },
    ],
  },
  {
    id: 'schedule-2',
    title: 'Entre',
    description: 'Mottagning',
    shifts: ['09:00-13:00', '13:00-17:00'],
    mainContact: { name: 'Oscar Nilsson', phone: '070-234 56 78' },
    persons: [
      { id: 'p-8', name: 'Hanna Hansson', phone: '070-888 99 00', status: STATUS.checkedIn, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Hanna' },
      { id: 'p-9', name: 'Isak Ivarsson', phone: '070-999 00 11', status: STATUS.scheduled, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Isak' },
      { id: 'p-10', name: 'Jenny Johansson', phone: '070-101 01 01', status: STATUS.scheduled, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Jenny' },
      { id: 'p-11', name: 'Kalle Karlsson', phone: '070-202 02 02', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Kalle' },
      { id: 'p-12', name: 'Lena Lundberg', phone: '070-303 03 03', status: STATUS.checkedIn, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Lena' },
      { id: 'p-13', name: 'Mats Mattsson', phone: '070-404 04 04', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Mats' },
    ],
  },
  {
    id: 'schedule-3',
    title: 'Stad',
    description: 'Lokalskotsel',
    shifts: ['07:30-11:30', '11:30-15:30'],
    mainContact: { name: 'Sara Eriksson', phone: '070-345 67 89' },
    persons: [
      { id: 'p-14', name: 'Nina Nilsson', phone: '070-505 05 05', status: STATUS.scheduled, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Nina' },
      { id: 'p-15', name: 'Oskar Omersson', phone: '070-606 06 06', status: STATUS.checkedIn, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Oskar' },
      { id: 'p-16', name: 'Pia Persson', phone: '070-707 07 07', status: STATUS.scheduled, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Pia' },
      { id: 'p-17', name: 'Quentin Qvarnstrom', phone: '070-808 08 08', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Quentin' },
      { id: 'p-18', name: 'Rosa Rosen', phone: '070-909 09 09', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Rosa' },
      { id: 'p-19', name: 'Simon Sandberg', phone: '070-121 21 21', status: STATUS.checkedIn, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Simon' },
      { id: 'p-20', name: 'Tina Toresson', phone: '070-232 32 32', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Tina' },
    ],
  },
  {
    id: 'schedule-4',
    title: 'Kravall',
    description: 'Forsaljning',
    shifts: ['08:00-16:00', '16:00-20:00'],
    mainContact: { name: 'Erik Andersson', phone: '070-456 78 90' },
    persons: [
      { id: 'p-21', name: 'Ulf Ulvsson', phone: '070-343 43 43', status: STATUS.scheduled, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Ulf' },
      { id: 'p-22', name: 'Vera Viklund', phone: '070-454 54 54', status: STATUS.checkedIn, shiftIndex: 0, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Vera' },
      { id: 'p-23', name: 'William Westerberg', phone: '070-565 65 65', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=William' },
      { id: 'p-24', name: 'Xena Xandersson', phone: '070-676 76 76', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Xena' },
      { id: 'p-25', name: 'Ylva Yngstrom', phone: '070-787 87 87', status: STATUS.scheduled, shiftIndex: 1, hasTshirt: false, hasFood: false, photo: 'https://via.placeholder.com/320?text=Ylva' },
    ],
  },
];

let schedules = [];
let draggingId = null;
let currentOpenPersonId = null;
let pendingFillTarget = null;
let reservePickerCandidates = [];
let activeFilter = 'all';
let searchQuery = '';
let auditLog = [];
let adminName = 'Admin';
let lastSavedAt = '';

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getDefaultSchedules() {
  const cloned = deepClone(sampleData);
  cloned.forEach((schedule) => {
    schedule.persons = schedule.persons.map((person) => normalizePerson(person));
  });
  return cloned;
}

function normalizePerson(person) {
  return {
    basePersonId: person.basePersonId || person.id,
    hasTshirt: false,
    hasFood: false,
    radioCode: '',
    lastUpdatedAt: '',
    lastUpdatedBy: '',
    ...person,
  };
}

function normalizeSchedules(cachedSchedules) {
  if (!Array.isArray(cachedSchedules)) {
    return getDefaultSchedules();
  }

  const defaultMap = new Map(sampleData.map((schedule) => [schedule.id, schedule]));

  const normalized = cachedSchedules
    .map((schedule) => {
      const fallback = defaultMap.get(schedule.id);
      if (!fallback) {
        return null;
      }

      const normalizedPersons = Array.isArray(schedule.persons)
        ? schedule.persons.map((person) => normalizePerson(person))
        : [];

      const migratedTitle = schedule.title === 'Kiosk' ? 'Kravall' : schedule.title;

      return {
        ...fallback,
        ...schedule,
        title: migratedTitle,
        shifts: Array.isArray(schedule.shifts) && schedule.shifts.length > 0 ? schedule.shifts : fallback.shifts,
        persons: normalizedPersons,
      };
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : getDefaultSchedules();
}

function loadStateFromCache() {
  const fallbackState = {
    schedules: getDefaultSchedules(),
    auditLog: [],
    adminName: 'Admin',
    lastSavedAt: '',
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        schedules: normalizeSchedules(parsed.schedules),
        auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
        adminName: parsed.adminName || 'Admin',
        lastSavedAt: parsed.lastSavedAt || '',
      };
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      return {
        ...fallbackState,
        schedules: normalizeSchedules(legacyParsed),
      };
    }

    return fallbackState;
  } catch (error) {
    return fallbackState;
  }
}

function saveStateToCache() {
  lastSavedAt = new Date().toISOString();
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schedules,
        auditLog,
        adminName,
        lastSavedAt,
      }),
    );
  } catch (error) {
    // Ignore storage errors in demo mode.
  }
  renderMetaInfo();
}

function clearCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    // Ignore storage errors in demo mode.
  }
}

function formatTimestamp(isoValue) {
  if (!isoValue) {
    return '-';
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('sv-SE');
}

function renderMetaInfo() {
  const lastSavedInfo = document.getElementById('lastSavedInfo');
  if (lastSavedInfo) {
    lastSavedInfo.textContent = `Senast sparad lokalt: ${formatTimestamp(lastSavedAt)}`;
  }
}

function createAuditEntry(action, person, schedule, details = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    at: new Date().toISOString(),
    by: adminName,
    action,
    personId: person.id,
    personName: person.name,
    scheduleTitle: schedule.title,
    details,
  };
}

function addAuditEntry(entry) {
  auditLog.unshift(entry);
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog = auditLog.slice(0, MAX_AUDIT_ENTRIES);
  }
}

function renderAuditLog() {
  const list = document.getElementById('auditLogList');
  if (!list) {
    return;
  }

  if (auditLog.length === 0) {
    list.innerHTML = '<li class="audit-empty">Inga handelser annu.</li>';
    return;
  }

  list.innerHTML = auditLog
    .map(
      (entry) => `
        <li class="audit-log-item">
          <strong>${entry.personName}</strong> -> ${entry.action}
          ${entry.details ? `<span> (${entry.details})</span>` : ''}
          <div>${entry.scheduleTitle} | ${formatTimestamp(entry.at)} | ${entry.by}</div>
        </li>
      `,
    )
    .join('');
}

function markPersonUpdated(person) {
  person.lastUpdatedAt = new Date().toISOString();
  person.lastUpdatedBy = adminName;
}

function getPersonBaseId(person) {
  return person.basePersonId || person.id;
}

function createAssignmentCopy(person, slotIndex) {
  return {
    ...person,
    id: `${getPersonBaseId(person)}-a-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    basePersonId: getPersonBaseId(person),
    shiftIndex: slotIndex,
    status: person.status || STATUS.scheduled,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: adminName,
  };
}

function parseShiftRange(shiftLabel) {
  if (!shiftLabel || typeof shiftLabel !== 'string') {
    return null;
  }

  const match = shiftLabel.trim().match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const start = Number(match[1]) * 60 + Number(match[2]);
  let end = Number(match[3]) * 60 + Number(match[4]);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }

  if (end <= start) {
    end += 24 * 60;
  }

  return { start, end };
}

function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function findOverlappingAssignmentsForPerson(basePersonId, targetScheduleId, targetSlotIndex, excludePersonId = '') {
  const targetSchedule = schedules.find((item) => item.id === targetScheduleId);
  if (!targetSchedule) {
    return [];
  }

  const targetShift = targetSchedule.shifts[targetSlotIndex];
  const targetRange = parseShiftRange(targetShift);
  if (!targetRange) {
    return [];
  }

  const overlaps = [];

  for (const schedule of schedules) {
    for (const person of schedule.persons) {
      if (getPersonBaseId(person) !== basePersonId) {
        continue;
      }

      if (excludePersonId && person.id === excludePersonId) {
        continue;
      }

      const existingShift = schedule.shifts[person.shiftIndex || 0];
      const existingRange = parseShiftRange(existingShift);
      if (!existingRange) {
        continue;
      }

      if (rangesOverlap(targetRange, existingRange)) {
        overlaps.push({ schedule, person });
      }
    }
  }

  return overlaps;
}

function hasOverlapForPerson(basePersonId, targetScheduleId, targetSlotIndex, excludePersonId = '') {
  return findOverlappingAssignmentsForPerson(basePersonId, targetScheduleId, targetSlotIndex, excludePersonId).length > 0;
}

function moveAssignmentToSlot(source, destinationSchedule, slotIndex) {
  const sourceSchedule = source.schedule;
  const person = source.person;

  if (sourceSchedule.id === destinationSchedule.id) {
    person.shiftIndex = slotIndex;
    markPersonUpdated(person);
    return person;
  }

  sourceSchedule.persons = sourceSchedule.persons.filter((item) => item.id !== person.id);
  person.shiftIndex = slotIndex;
  markPersonUpdated(person);
  destinationSchedule.persons.push(person);
  return person;
}

function confirmOverlapIfNeeded(person, targetScheduleId, targetSlotIndex, excludePersonId = '') {
  const basePersonId = getPersonBaseId(person);
  const overlaps = findOverlappingAssignmentsForPerson(basePersonId, targetScheduleId, targetSlotIndex, excludePersonId);
  if (overlaps.length === 0) {
    return { allowed: true, hadOverlap: false, overlaps: [] };
  }

  const targetSchedule = schedules.find((item) => item.id === targetScheduleId);
  const targetShift = targetSchedule?.shifts?.[targetSlotIndex] || '';
  const firstOverlap = overlaps[0];
  const firstOverlapShift = firstOverlap.schedule.shifts[firstOverlap.person.shiftIndex || 0] || '';
  const shouldProceed = confirm(
    `Tidskrock: ${person.name} ar redan schemalagd i ${firstOverlap.schedule.title}${firstOverlapShift ? ` (${firstOverlapShift})` : ''}.\n\nAr du saker pa att du vill fortsatta med ${targetSchedule?.title || 'detta pass'} ${targetShift ? `(${targetShift})` : ''}?`,
  );

  return { allowed: shouldProceed, hadOverlap: true, overlaps };
}

function initialize() {
  const cachedState = loadStateFromCache();
  schedules = cachedState.schedules;
  auditLog = cachedState.auditLog;
  adminName = cachedState.adminName;
  lastSavedAt = cachedState.lastSavedAt;

  renderSchedules();
  renderAuditLog();
  renderMetaInfo();
  setupEventListeners();
}

function setupEventListeners() {
  const resetBtn = document.getElementById('resetBtn');
  const exportBtn = document.getElementById('exportBtn');
  const searchInput = document.getElementById('searchInput');
  const adminInput = document.getElementById('adminInput');
  const filterBar = document.getElementById('filterBar');
  const radioBtn = document.getElementById('radioBtn');
  const closeBarcodeBtn = document.getElementById('closeBarcodeBtn');
  const closeScanBtn = document.getElementById('closeScanBtn');
  const closeReservePickerBtn = document.getElementById('closeReservePickerBtn');
  const reservePickerList = document.getElementById('reservePickerList');
  const reservePickerSearch = document.getElementById('reservePickerSearch');

  adminInput.value = adminName;

  resetBtn.addEventListener('click', () => {
    clearCache();
    schedules = getDefaultSchedules();
    auditLog = [];
    activeFilter = 'all';
    searchQuery = '';
    searchInput.value = '';
    renderSchedules();
    renderAuditLog();
    saveStateToCache();
  });

  exportBtn.addEventListener('click', exportCsv);

  adminInput.addEventListener('change', (event) => {
    const trimmed = (event.target.value || '').trim();
    adminName = trimmed || 'Admin';
    event.target.value = adminName;
    saveStateToCache();
  });

  searchInput.addEventListener('input', (event) => {
    searchQuery = (event.target.value || '').toLowerCase();
    renderSchedules();
  });

  filterBar.addEventListener('click', (event) => {
    const target = event.target.closest('[data-filter]');
    if (!target) {
      return;
    }

    activeFilter = target.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.filter === activeFilter);
    });
    renderSchedules();
  });

  radioBtn.addEventListener('click', () => {
    openBarcodeScanner();
  });

  closeBarcodeBtn.addEventListener('click', closeBarcodeScanner);
  closeScanBtn.addEventListener('click', closeBarcodeScanner);

  closeReservePickerBtn.addEventListener('click', closeReservePicker);
  reservePickerList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="select-reserve"]');
    if (!button) {
      return;
    }
    assignReserveToPendingSlot(button.dataset.personId);
  });

  reservePickerSearch.addEventListener('input', (event) => {
    renderReservePickerList(event.target.value || '');
  });
}

function personMatchesFilters(person) {
  if (searchQuery && !person.name.toLowerCase().includes(searchQuery)) {
    return false;
  }

  if (activeFilter === 'all') {
    return true;
  }

  if (activeFilter === 'scheduled') {
    return person.status === STATUS.scheduled;
  }

  if (activeFilter === 'checkedIn') {
    return person.status === STATUS.checkedIn;
  }

  if (activeFilter === 'blocked') {
    return person.status === STATUS.blocked;
  }

  if (activeFilter === 'missingTshirt') {
    return !person.hasTshirt;
  }

  if (activeFilter === 'missingFood') {
    return !person.hasFood;
  }

  return true;
}

function renderSchedules() {
  scheduleContainer.innerHTML = schedules.map(renderSchedule).join('');
  attachGroupListeners();
  attachCardListeners();
  attachSlotListeners();
}

function renderSchedule(schedule) {
  return `
    <section class="schedule-card">
      <header class="schedule-header">
        <div>
          <h2>${schedule.title}</h2>
          <span>${schedule.description}</span>
          <div class="main-contact">Huvudansvarig: ${schedule.mainContact.name} • ${schedule.mainContact.phone}</div>
        </div>
        <span>${schedule.persons.length} personer</span>
      </header>
      <div class="group-list">
        ${schedule.shifts.map((shift, index) => renderScheduleSlot(schedule, index)).join('')}
      </div>
    </section>
  `;
}

function renderScheduleSlot(schedule, slotIndex) {
  const slotPersons = schedule.persons.filter((person) => (person.shiftIndex || 0) === slotIndex);
  const visiblePersons = slotPersons.filter((person) => personMatchesFilters(person));

  return `
    <div class="group-card" data-schedule-id="${schedule.id}" data-slot-index="${slotIndex}" draggable="false">
      <div class="slot-header">
        <div class="group-title">${schedule.shifts[slotIndex]}</div>
        <div class="slot-actions">
          <span class="slot-counter">${visiblePersons.length}/${slotPersons.length}</span>
          <button class="fill-slot-btn" data-action="fill-slot" data-schedule-id="${schedule.id}" data-slot-index="${slotIndex}">Fyll lucka</button>
        </div>
      </div>
      <div class="person-list">
        ${visiblePersons.map((person) => renderPerson(person, schedule.id)).join('')}
      </div>
    </div>
  `;
}

function renderPerson(person, scheduleId) {
  const blockButtonClass = person.status === STATUS.blocked ? 'block-active' : '';

  return `
    <div class="person-card" draggable="true" data-person-id="${person.id}" data-status="${person.status}" data-schedule-id="${scheduleId}">
      <div>
        <p class="person-name">${person.name}</p>
      </div>
      <div class="person-actions">
        <button class="person-button icon-button icon-small ${blockButtonClass}" title="Blockera" data-action="toggle-block" data-person-id="${person.id}">X</button>
      </div>
    </div>
  `;
}

function attachSlotListeners() {
  const fillButtons = document.querySelectorAll('[data-action="fill-slot"]');
  fillButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const scheduleId = button.dataset.scheduleId;
      const slotIndex = Number(button.dataset.slotIndex || 0);
      openReservePicker(scheduleId, slotIndex);
    });
  });
}

function attachGroupListeners() {
  const groups = document.querySelectorAll('.group-card');
  groups.forEach((group) => {
    group.addEventListener('dragover', handleGroupDragOver);
    group.addEventListener('dragleave', handleGroupDragLeave);
    group.addEventListener('drop', handleGroupDrop);
  });
}

function attachCardListeners() {
  const cards = document.querySelectorAll('.person-card');
  cards.forEach((card) => {
    card.addEventListener('dragstart', handleCardDragStart);
    card.addEventListener('dragend', handleCardDragEnd);

    const blockButton = card.querySelector('[data-action="toggle-block"]');
    const personId = card.dataset.personId;

    blockButton.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleBlock(personId);
    });

    card.addEventListener('click', () => {
      openPersonPopup(personId);
    });
  });
}

function handleCardDragStart(event) {
  const card = event.currentTarget;
  draggingId = card.dataset.personId;
  card.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggingId);
}

function handleCardDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  draggingId = null;
}

function handleGroupDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}

function handleGroupDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

function handleGroupDrop(event) {
  event.preventDefault();
  const groupEl = event.currentTarget;
  groupEl.classList.remove('drag-over');

  const personId = event.dataTransfer.getData('text/plain');
  if (!personId) {
    return;
  }

  const targetScheduleId = groupEl.dataset.scheduleId;
  const targetSlotIndex = Number(groupEl.dataset.slotIndex || 0);
  movePersonToGroup(personId, targetScheduleId, targetSlotIndex);
}

function findPerson(personId) {
  for (const schedule of schedules) {
    const person = schedule.persons.find((item) => item.id === personId);
    if (person) {
      return { schedule, person };
    }
  }
  return null;
}

function movePersonToGroup(personId, scheduleId, slotIndex = 0) {
  const source = findPerson(personId);
  if (!source) {
    return;
  }

  const destinationSchedule = schedules.find((item) => item.id === scheduleId);
  if (!destinationSchedule) {
    return;
  }

  const sourceSlotIndex = source.person.shiftIndex || 0;
  if (source.schedule.id === scheduleId && sourceSlotIndex === slotIndex) {
    return;
  }

  const overlapCheck = confirmOverlapIfNeeded(source.person, scheduleId, slotIndex, source.person.id);
  if (!overlapCheck.allowed) {
    return;
  }

  const fromTitle = source.schedule.title;
  const fromShift = source.schedule.shifts[sourceSlotIndex] || '';
  const assignment = moveAssignmentToSlot(source, destinationSchedule, slotIndex);

  const moveDetails = destinationSchedule.shifts[slotIndex] || '';
  const moveDetailsWithOverlap = `${fromTitle}${fromShift ? ` (${fromShift})` : ''} -> ${destinationSchedule.title}${moveDetails ? ` (${moveDetails})` : ''}${overlapCheck.hadOverlap ? ' • Tidskrock godkand manuellt' : ''}`;

  addAuditEntry(createAuditEntry('Flyttad mellan pass', assignment, destinationSchedule, moveDetailsWithOverlap));
  renderSchedules();
  renderAuditLog();
  saveStateToCache();
}

function updateModalUI(found) {
  const radioValueEl = document.getElementById('personModalRadio');
  const accreditationEl = document.getElementById('personModalAccreditation');
  const updatedAtEl = document.getElementById('personModalUpdatedAt');
  const updatedByEl = document.getElementById('personModalUpdatedBy');
  const tshirtIcon = found.person.hasTshirt ? '✅👕' : '⬜👕';
  const foodIcon = found.person.hasFood ? '✅🎫' : '⬜🎫';

  radioValueEl.textContent = found.person.radioCode || 'Ej tilldelad';
  accreditationEl.textContent = `${tshirtIcon}  ${foodIcon}`;
  updatedAtEl.textContent = formatTimestamp(found.person.lastUpdatedAt);
  updatedByEl.textContent = found.person.lastUpdatedBy || '-';
}

function openPersonPopup(personId) {
  currentOpenPersonId = personId;
  const found = findPerson(personId);
  if (!found) {
    return;
  }

  const modal = document.getElementById('personModal');
  const photo = document.getElementById('personPhoto');
  const nameEl = document.getElementById('personModalName');
  const roleEl = document.getElementById('personModalRole');
  const phoneEl = document.getElementById('personModalPhone');
  const assignedTimeEl = document.getElementById('personModalAssignedTime');
  const statusEl = document.getElementById('personModalStatus');

  const scheduleShifts = found.schedule.shifts || [found.schedule.shift];
  const assignedShift = scheduleShifts[found.person.shiftIndex || 0] || 'Ingen tilldelad tid';

  photo.src = found.person.photo || 'https://via.placeholder.com/320?text=Foto';
  photo.alt = `Foto av ${found.person.name}`;
  nameEl.textContent = found.person.name;
  roleEl.textContent = `${found.schedule.title} - ${found.schedule.description}`;
  phoneEl.textContent = found.person.phone;
  assignedTimeEl.textContent = assignedShift;
  statusEl.textContent = found.person.status === STATUS.blocked ? 'Blockerad' : found.person.status === STATUS.checkedIn ? 'Incheckad' : 'Ej incheckad';

  updateModalUI(found);
  modal.classList.remove('hidden');
}

function closePersonPopup() {
  const modal = document.getElementById('personModal');
  modal.classList.add('hidden');
  currentOpenPersonId = null;
}

function openBarcodeScanner() {
  const personModal = document.getElementById('personModal');
  const barcodeModal = document.getElementById('barcodeModal');
  const video = document.getElementById('barcodeVideo');
  const barcodeResult = document.getElementById('barcodeResult');

  personModal.classList.add('hidden');
  barcodeModal.classList.remove('hidden');
  barcodeResult.textContent = 'Vantar pa kod...';
  barcodeResult.style.color = '';

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
      video.srcObject = stream;
      video.play();

      setTimeout(() => {
        const found = findPerson(currentOpenPersonId);
        if (!found) {
          return;
        }

        const barcodeCode = `RADIO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        found.person.radioCode = barcodeCode;
        markPersonUpdated(found.person);

        addAuditEntry(createAuditEntry('Radio tilldelad', found.person, found.schedule, barcodeCode));
        barcodeResult.textContent = `Kod skannad: ${barcodeCode}`;
        barcodeResult.style.color = '#22c55e';

        updateModalUI(found);
        renderSchedules();
        renderAuditLog();
        saveStateToCache();
      }, 1200);
    })
    .catch((err) => {
      alert('Kunde inte oppna kamera: ' + err.message);
      closeBarcodeScanner();
    });
}

function closeBarcodeScanner() {
  const personModal = document.getElementById('personModal');
  const barcodeModal = document.getElementById('barcodeModal');
  const video = document.getElementById('barcodeVideo');

  if (video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
  }

  barcodeModal.classList.add('hidden');
  personModal.classList.remove('hidden');
}

function getAllAssignableCandidates() {
  const candidateMap = new Map();

  schedules.forEach((schedule) => {
    schedule.persons.forEach((person) => {
      const basePersonId = getPersonBaseId(person);
      const existing = candidateMap.get(basePersonId);
      if (!existing) {
        candidateMap.set(basePersonId, { schedule, person });
      }
    });
  });

  const candidates = Array.from(candidateMap.values());
  candidates.sort((a, b) => a.person.name.localeCompare(b.person.name, 'sv'));

  return candidates;
}

function openReservePicker(scheduleId, slotIndex) {
  const targetSchedule = schedules.find((item) => item.id === scheduleId);
  if (!targetSchedule) {
    return;
  }

  pendingFillTarget = { scheduleId, slotIndex };
  const modal = document.getElementById('reservePickerModal');
  const targetEl = document.getElementById('reservePickerTarget');
  const reservePickerSearch = document.getElementById('reservePickerSearch');

  targetEl.textContent = `${targetSchedule.title} - ${targetSchedule.shifts[slotIndex] || ''}`;

  reservePickerCandidates = getAllAssignableCandidates();
  reservePickerSearch.value = '';
  renderReservePickerList('');

  modal.classList.remove('hidden');
}

function renderReservePickerList(query) {
  const listEl = document.getElementById('reservePickerList');
  const normalizedQuery = (query || '').toLowerCase().trim();

  const filteredCandidates = reservePickerCandidates.filter(({ schedule, person }) => {
    if (!normalizedQuery) {
      return true;
    }

    const shiftLabel = schedule.shifts[person.shiftIndex || 0] || '';
    const searchable = `${person.name} ${schedule.title} ${shiftLabel}`.toLowerCase();
    return searchable.includes(normalizedQuery);
  });

  if (filteredCandidates.length === 0) {
    listEl.innerHTML = '<p class="reserve-picker-empty">Ingen träff på sökningen.</p>';
    return;
  }

  listEl.innerHTML = filteredCandidates
    .map(({ schedule, person }) => {
      const shiftLabel = schedule.shifts[person.shiftIndex || 0] || '';
      return `
        <button class="reserve-picker-item" data-action="select-reserve" data-person-id="${person.id}">
          <strong>${person.name}</strong>
          <span>${schedule.title} • ${shiftLabel}</span>
        </button>
      `;
    })
    .join('');
}

function closeReservePicker() {
  const modal = document.getElementById('reservePickerModal');
  const reservePickerSearch = document.getElementById('reservePickerSearch');
  const listEl = document.getElementById('reservePickerList');
  modal.classList.add('hidden');
  reservePickerSearch.value = '';
  listEl.innerHTML = '';
  reservePickerCandidates = [];
  pendingFillTarget = null;
}

function assignReserveToPendingSlot(personId) {
  if (!pendingFillTarget) {
    return;
  }

  const source = findPerson(personId);
  const destinationSchedule = schedules.find((item) => item.id === pendingFillTarget.scheduleId);
  const destinationSlotIndex = pendingFillTarget.slotIndex;

  if (!source || !destinationSchedule) {
    closeReservePicker();
    return;
  }

  const basePersonId = getPersonBaseId(source.person);
  const overlappingAssignments = findOverlappingAssignmentsForPerson(basePersonId, pendingFillTarget.scheduleId, destinationSlotIndex);

  let assignment;
  let details = destinationSchedule.shifts[destinationSlotIndex] || '';
  let action = 'Manuell tilldelning fyllde lucka';

  if (overlappingAssignments.length > 0) {
    const assignmentToMove = overlappingAssignments.find((item) => item.person.id === source.person.id) || overlappingAssignments[0];
    const sourceSlotIndex = assignmentToMove.person.shiftIndex || 0;
    const fromShift = assignmentToMove.schedule.shifts[sourceSlotIndex] || '';
    const toShift = destinationSchedule.shifts[destinationSlotIndex] || '';

    if (assignmentToMove.schedule.id === destinationSchedule.id && sourceSlotIndex === destinationSlotIndex) {
      closeReservePicker();
      return;
    }

    const shouldMove = confirm(
      `${source.person.name} ar redan schemalagd i ${assignmentToMove.schedule.title}${fromShift ? ` (${fromShift})` : ''}.\n\nVill du flytta personen till ${destinationSchedule.title}${toShift ? ` (${toShift})` : ''}?`,
    );

    if (!shouldMove) {
      return;
    }

    assignment = moveAssignmentToSlot(assignmentToMove, destinationSchedule, destinationSlotIndex);
    action = 'Flyttad for att fylla lucka';
    details = `${assignmentToMove.schedule.title}${fromShift ? ` (${fromShift})` : ''} -> ${destinationSchedule.title}${toShift ? ` (${toShift})` : ''}`;
  } else {
    assignment = createAssignmentCopy(source.person, destinationSlotIndex);
    destinationSchedule.persons.push(assignment);
  }

  addAuditEntry(
    createAuditEntry(
      action,
      assignment,
      destinationSchedule,
      details,
    ),
  );

  closeReservePicker();
  renderSchedules();
  renderAuditLog();
  saveStateToCache();
}

const closeModalButton = document.getElementById('closeModalBtn');
if (closeModalButton) {
  closeModalButton.addEventListener('click', closePersonPopup);
}

const personModal = document.getElementById('personModal');
if (personModal) {
  personModal.addEventListener('click', (event) => {
    if (event.target === personModal) {
      closePersonPopup();
    }
  });
}

const reservePickerModal = document.getElementById('reservePickerModal');
if (reservePickerModal) {
  reservePickerModal.addEventListener('click', (event) => {
    if (event.target === reservePickerModal) {
      closeReservePicker();
    }
  });
}

function toggleBlock(personId) {
  const found = findPerson(personId);
  if (!found) {
    return;
  }

  found.person.status = found.person.status === STATUS.blocked ? STATUS.scheduled : STATUS.blocked;
  markPersonUpdated(found.person);

  addAuditEntry(createAuditEntry(found.person.status === STATUS.blocked ? 'Markerad blockerad' : 'Avblockerad', found.person, found.schedule));

  renderSchedules();
  renderAuditLog();
  saveStateToCache();
}

function toggleCheckin(personId) {
  const found = findPerson(personId);
  if (!found) {
    return;
  }

  if (found.person.status === STATUS.checkedIn) {
    found.person.status = STATUS.scheduled;
  } else {
    found.person.status = STATUS.checkedIn;
  }

  markPersonUpdated(found.person);
  addAuditEntry(createAuditEntry(found.person.status === STATUS.checkedIn ? 'Incheckad' : 'Avcheckad', found.person, found.schedule));

  renderSchedules();
  renderAuditLog();
  saveStateToCache();
}

function escapeCsv(value) {
  const asString = String(value ?? '');
  if (asString.includes('"') || asString.includes(',') || asString.includes('\n')) {
    return `"${asString.replace(/"/g, '""')}"`;
  }
  return asString;
}

function exportCsv() {
  const rows = [
    [
      'personId',
      'name',
      'phone',
      'schedule',
      'slot',
      'status',
      'tshirt',
      'food',
      'radioCode',
      'lastUpdatedAt',
      'lastUpdatedBy',
    ],
  ];

  schedules.forEach((schedule) => {
    schedule.persons.forEach((person) => {
      rows.push([
        person.id,
        person.name,
        person.phone,
        schedule.title,
        schedule.shifts[person.shiftIndex || 0] || '',
        person.status,
        person.hasTshirt ? 'yes' : 'no',
        person.hasFood ? 'yes' : 'no',
        person.radioCode || '',
        person.lastUpdatedAt || '',
        person.lastUpdatedBy || '',
      ]);
    });
  });

  const csv = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `schema-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

initialize();
