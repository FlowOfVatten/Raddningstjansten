const STATUS = {
  scheduled: 'scheduled',
  checkedIn: 'checkedIn',
  blocked: 'blocked',
};

const STORAGE_KEY = 'schemaDemoStateV2';
const LEGACY_STORAGE_KEY = 'schemaDemoStateV1';
const MAX_AUDIT_ENTRIES = 120;

let schedules = [];
let auditLog = [];
let adminName = 'Admin';
let lastSavedAt = '';
let searchQuery = '';
let pendingPhotoBaseId = '';

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

function loadStateFromCache() {
  const fallbackState = {
    schedules: [],
    auditLog: [],
    adminName: 'Admin',
    lastSavedAt: '',
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
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
        schedules: Array.isArray(legacyParsed) ? legacyParsed : [],
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
  renderMeta();
}

function addAuditEntry(entry) {
  auditLog.unshift(entry);
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog = auditLog.slice(0, MAX_AUDIT_ENTRIES);
  }
}

function markPersonUpdated(person) {
  person.lastUpdatedAt = new Date().toISOString();
  person.lastUpdatedBy = adminName;
}

function getPersonBaseId(person) {
  return person.basePersonId || person.id;
}

function getUniquePersons() {
  const map = new Map();

  schedules.forEach((schedule) => {
    (schedule.persons || []).forEach((person) => {
      const baseId = getPersonBaseId(person);
      const existing = map.get(baseId);
      if (!existing) {
        map.set(baseId, {
          baseId,
          displayPerson: person,
          schedules: [schedule.title === 'Kiosk' ? 'Kravall' : schedule.title],
          phones: [person.phone || ''],
        });
        return;
      }

      existing.schedules.push(schedule.title === 'Kiosk' ? 'Kravall' : schedule.title);
      if (person.phone && !existing.phones.includes(person.phone)) {
        existing.phones.push(person.phone);
      }

      if (person.status === STATUS.checkedIn) {
        existing.displayPerson = person;
      }
    });
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      schedules: Array.from(new Set(item.schedules)),
      phones: item.phones.filter(Boolean),
    }))
    .sort((a, b) => a.displayPerson.name.localeCompare(b.displayPerson.name, 'sv'));
}

function personMatchesSearch(personEntry) {
  if (!searchQuery) {
    return true;
  }

  const haystack = [
    personEntry.displayPerson.name || '',
    personEntry.phones.join(' '),
    personEntry.schedules.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(searchQuery);
}

function setFieldForBasePerson(baseId, updater) {
  schedules.forEach((schedule) => {
    (schedule.persons || []).forEach((person) => {
      if (getPersonBaseId(person) !== baseId) {
        return;
      }
      updater(person);
      markPersonUpdated(person);
    });
  });
}

function renderMeta() {
  const meta = document.getElementById('accreditationMeta');
  const persons = getUniquePersons();
  const checkedInCount = persons.filter((entry) => entry.displayPerson.status === STATUS.checkedIn).length;
  meta.textContent = `Personer: ${persons.length} • Incheckade: ${checkedInCount} • Senast sparad lokalt: ${formatTimestamp(lastSavedAt)}`;
}

function getStatusText(status) {
  if (status === STATUS.checkedIn) {
    return 'Incheckad';
  }
  if (status === STATUS.blocked) {
    return 'Blockerad';
  }
  return 'Ej incheckad';
}

function renderList() {
  const listEl = document.getElementById('accreditationList');
  const persons = getUniquePersons().filter(personMatchesSearch);

  if (persons.length === 0) {
    listEl.innerHTML = '<p class="accreditation-empty">Ingen person matchar sökningen.</p>';
    return;
  }

  listEl.innerHTML = persons
    .map((entry) => {
      const person = entry.displayPerson;
      const checkinClass = person.status === STATUS.checkedIn ? 'active' : '';
      const tshirtClass = person.hasTshirt ? 'active' : '';
      const foodClass = person.hasFood ? 'active' : '';
      const hasUploadedPhoto = Boolean(person.photoFileName);
      const photoClass = hasUploadedPhoto ? 'has-photo' : '';
      const photoLabel = hasUploadedPhoto ? 'Foto uppdaterat' : 'Ta foto';
      return `
        <section class="accreditation-card" data-base-person-id="${entry.baseId}">
          <div>
            <p class="accreditation-name">${person.name}</p>
            <p class="accreditation-meta">${entry.phones[0] || '-'} • ${getStatusText(person.status)} • ${entry.schedules.join(', ')}</p>
          </div>
          <div class="accreditation-actions">
            <button class="accreditation-action-btn ${checkinClass}" data-action="toggle-checkin" data-base-person-id="${entry.baseId}">Incheckad</button>
            <button class="accreditation-action-btn ${tshirtClass}" data-action="toggle-tshirt" data-base-person-id="${entry.baseId}">T-shirt</button>
            <button class="accreditation-action-btn ${foodClass}" data-action="toggle-food" data-base-person-id="${entry.baseId}">Matbiljett</button>
            <button class="accreditation-photo-btn ${photoClass}" data-action="take-photo" data-base-person-id="${entry.baseId}">📷 ${photoLabel}</button>
          </div>
        </section>
      `;
    })
    .join('');
}

function sanitizePhotoFileName(name) {
  const safeBase = (name || 'person')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return `${safeBase || 'person'}-foto.jpg`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Kunde inte lasa bildfilen.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Kunde inte tolka bilden.'));
    image.src = dataUrl;
  });
}

async function createOptimizedPhoto(file) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);

  const maxDimension = 720;
  const width = image.width || 1;
  const height = image.height || 1;
  const scale = Math.min(1, maxDimension / Math.max(width, height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    return originalDataUrl;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.78);
}

async function savePhotoForBasePerson(baseId, file) {
  const representative = findRepresentative(baseId);
  if (!representative) {
    return;
  }

  const optimizedPhoto = await createOptimizedPhoto(file);
  const fileName = sanitizePhotoFileName(representative.person.name);

  setFieldForBasePerson(baseId, (person) => {
    person.photo = optimizedPhoto;
    person.photoFileName = fileName;
  });

  addAuditEntry({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    at: new Date().toISOString(),
    by: adminName,
    action: 'Foto uppdaterat',
    personId: representative.person.id,
    personName: representative.person.name,
    scheduleTitle: representative.schedule.title,
    details: fileName,
  });

  saveStateToCache();
  renderMeta();
  renderList();
}

function findRepresentative(baseId) {
  for (const schedule of schedules) {
    for (const person of schedule.persons || []) {
      if (getPersonBaseId(person) === baseId) {
        return { schedule, person };
      }
    }
  }
  return null;
}

function toggleCheckinByBase(baseId) {
  const representative = findRepresentative(baseId);
  if (!representative) {
    return;
  }

  const nextStatus = representative.person.status === STATUS.checkedIn ? STATUS.scheduled : STATUS.checkedIn;
  setFieldForBasePerson(baseId, (person) => {
    person.status = nextStatus;
  });

  addAuditEntry({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    at: new Date().toISOString(),
    by: adminName,
    action: nextStatus === STATUS.checkedIn ? 'Incheckad' : 'Avcheckad',
    personId: representative.person.id,
    personName: representative.person.name,
    scheduleTitle: representative.schedule.title,
    details: 'Ackreditering',
  });

  saveStateToCache();
  renderMeta();
  renderList();
}

function toggleTshirtByBase(baseId) {
  const representative = findRepresentative(baseId);
  if (!representative) {
    return;
  }

  const nextValue = !representative.person.hasTshirt;
  setFieldForBasePerson(baseId, (person) => {
    person.hasTshirt = nextValue;
  });

  addAuditEntry({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    at: new Date().toISOString(),
    by: adminName,
    action: nextValue ? 'T-shirt utdelad' : 'T-shirt aterstalld',
    personId: representative.person.id,
    personName: representative.person.name,
    scheduleTitle: representative.schedule.title,
    details: 'Ackreditering',
  });

  saveStateToCache();
  renderMeta();
  renderList();
}

function toggleFoodByBase(baseId) {
  const representative = findRepresentative(baseId);
  if (!representative) {
    return;
  }

  const nextValue = !representative.person.hasFood;
  setFieldForBasePerson(baseId, (person) => {
    person.hasFood = nextValue;
  });

  addAuditEntry({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    at: new Date().toISOString(),
    by: adminName,
    action: nextValue ? 'Mat utdelad' : 'Mat aterstalld',
    personId: representative.person.id,
    personName: representative.person.name,
    scheduleTitle: representative.schedule.title,
    details: 'Ackreditering',
  });

  saveStateToCache();
  renderMeta();
  renderList();
}

function setupEventListeners() {
  const searchInput = document.getElementById('accreditationSearch');
  const adminInput = document.getElementById('adminInput');
  const listEl = document.getElementById('accreditationList');
  const photoInput = document.getElementById('photoCaptureInput');

  adminInput.value = adminName;

  adminInput.addEventListener('change', (event) => {
    const trimmed = (event.target.value || '').trim();
    adminName = trimmed || 'Admin';
    event.target.value = adminName;
    saveStateToCache();
  });

  searchInput.addEventListener('input', (event) => {
    searchQuery = (event.target.value || '').toLowerCase().trim();
    renderList();
  });

  listEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      return;
    }

    const baseId = button.dataset.basePersonId;
    if (!baseId) {
      return;
    }

    const action = button.dataset.action;
    if (action === 'toggle-checkin') {
      toggleCheckinByBase(baseId);
      return;
    }

    if (action === 'toggle-tshirt') {
      toggleTshirtByBase(baseId);
      return;
    }

    if (action === 'toggle-food') {
      toggleFoodByBase(baseId);
      return;
    }

    if (action === 'take-photo') {
      pendingPhotoBaseId = baseId;
      photoInput.value = '';
      photoInput.click();
    }
  });

  photoInput.addEventListener('change', async (event) => {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file || !pendingPhotoBaseId) {
      return;
    }

    try {
      await savePhotoForBasePerson(pendingPhotoBaseId, file);
    } catch (error) {
      alert('Kunde inte spara foto. Prova med en mindre bild.');
    } finally {
      pendingPhotoBaseId = '';
      input.value = '';
    }
  });
}

function initialize() {
  const cachedState = loadStateFromCache();
  schedules = cachedState.schedules;
  auditLog = cachedState.auditLog;
  adminName = cachedState.adminName;
  lastSavedAt = cachedState.lastSavedAt;

  setupEventListeners();
  renderMeta();
  renderList();
}

initialize();
