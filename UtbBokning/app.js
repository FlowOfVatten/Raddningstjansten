const DB_NAME = "utbbokning-local-db";
const DB_VERSION = 1;
const RESOURCE_STORE = "resources";
const BOOKING_STORE = "bookings";
const API_ENDPOINT = resolveApiEndpoint();
const LEGACY_RESOURCE_RENAMES = {
  Rokcontainer: "Rökcontainer",
  "Viktoria ovningsfalt": "Viktoria övningsfält"
};
const INSTRUCTOR_OPTIONS = [
  "Anna Berg",
  "Johan Lind",
  "Sara Nord",
  "Mikael Holm",
  "Elin Sjöberg"
];
const MOMENT_LOCATION_DETAIL_OPTIONS = {
  "4b - flamman": ["Papper och penna", "Projektor", "Ljud"],
  "4c - gnistan (grovlektionssal)": ["Papper och penna", "Projektor", "Ljud"],
  "16 - sparlågan (grovlektionssal)": ["Papper och penna", "Projektor", "Ljud"],
  "22 - branden": ["Papper och penna", "Projektor", "Ljud"],
  "23 - glöden": ["Papper och penna", "Projektor", "Ljud"],
  "19 rökövningshus": ["Rökskydd", "Värmekamera", "Larmställ"],
  "31 kallrökövningshus": ["Rökskydd", "Värmekamera", "Larmställ"],
  "18 containersystem": ["Rökskydd", "Värmekamera", "Larmställ"],
  "9 körplan": ["Bilar", "Klippverktyg"],
  "fika och pausyta": ["Kaffe / Te", "Smörgåsar"]
};

const STATIC_LOCATIONS = [
  // Lektionssalar
  "4B - Flamman",
  "4C - Gnistan (Grovlektionssal)",
  "16 - Sparlågan (Grovlektionssal)",
  "22 - Branden",
  "23 - Glöden",
  // Övningsytor
  "4D Bursystem",
  "9 Körplan",
  "11 Gasolcontainer",
  "12 Övningstorn",
  "13 Kaj",
  "14a Lergrop",
  "14b Cistern",
  "17 Brandförloppscontainer",
  "18 Containersystem",
  "19 Rökövningshus",
  "25 Övningsyta",
  "26 Liggande buss",
  "26a Liggande buss - lyft",
  "27a Tankvagn",
  "27b Övningsyta",
  "27c Perrong",
  "27d Liggande tågvagn",
  "28 Snedtak",
  "29 Inträngningsbyggnad",
  "30 Handbrandsläckarplatta",
  "31 Kallrökövningshus",
  // Övrigt
  "Fika och pausyta"
];
const STATIC_LOCATION_KEYS = new Set([
  ...STATIC_LOCATIONS.map((name) => normalizeResourceName(name)),
  // Gamla lokalnamn som kan finnas kvar i DB
  "rökcontainer",
  "fordonsyta",
  "teorisal",
  "viktoria övningsfält",
  "fika och pausyta"
]);
const DEFAULT_DETAIL_RESOURCES = [
  {
    id: "res-detail-paper-pen",
    name: "Papper och penna",
    category: "Tillval",
    notes: "Tillval för Teorisal.",
    totalQuantity: 0
  },
  {
    id: "res-detail-projector",
    name: "Projektor",
    category: "Tillval",
    notes: "Tillval för Teorisal.",
    totalQuantity: 0
  },
  {
    id: "res-detail-audio",
    name: "Ljud",
    category: "Tillval",
    notes: "Tillval för Teorisal.",
    totalQuantity: 0
  },
  {
    id: "res-detail-coffee-tea",
    name: "Kaffe / Te",
    category: "Tillval",
    notes: "Tillval för Fika och pausyta.",
    totalQuantity: 0
  },
  {
    id: "res-detail-sandwich",
    name: "Smörgåsar",
    category: "Tillval",
    notes: "Tillval för Fika och pausyta.",
    totalQuantity: 0
  },
  {
    id: "res-detail-smoke-guard",
    name: "Rökskydd",
    category: "Tillval",
    notes: "Tillval för Rökcontainer.",
    totalQuantity: 0
  },
  {
    id: "res-detail-thermal-camera",
    name: "Värmekamera",
    category: "Tillval",
    notes: "Tillval för Rökcontainer.",
    totalQuantity: 0
  },
  {
    id: "res-detail-turnout-gear",
    name: "Larmställ",
    category: "Tillval",
    notes: "Tillval för Rökcontainer.",
    totalQuantity: 0
  },
  {
    id: "res-detail-cars",
    name: "Bilar",
    category: "Tillval",
    notes: "Tillval för Fordonsyta.",
    totalQuantity: 0
  },
  {
    id: "res-detail-cutting-tools",
    name: "Klippverktyg",
    category: "Tillval",
    notes: "Tillval för Fordonsyta.",
    totalQuantity: 0
  }
];

const els = {
  bookingForm: document.getElementById("bookingForm"),
  profileBanner: document.getElementById("profileBanner"),
  profileStatePill: document.getElementById("profileStatePill"),
  resourceForm: document.getElementById("resourceForm"),
  resourcePicker: document.getElementById("resourcePicker"),
  resourceLibrary: document.getElementById("resourceLibrary"),
  draftSummary: document.getElementById("draftSummary"),
  saveStatus: document.getElementById("saveStatus"),
  completionLabel: document.getElementById("completionLabel"),
  completionBar: document.getElementById("completionBar"),
  quickFacts: document.getElementById("quickFacts"),
  smartTips: document.getElementById("smartTips"),
  liveTimeline: document.getElementById("liveTimeline"),
  agendaList: document.getElementById("agendaList"),
  agendaItemTemplate: document.getElementById("agendaItemTemplate"),
  loadLatestBooking: document.getElementById("loadLatestBooking"),
  exportBooking: document.getElementById("exportBooking"),
  resetBooking: document.getElementById("resetBooking"),
  addAgendaItem: document.getElementById("addAgendaItem")
};

const state = {
  db: null,
  useRemote: false,
  resources: [],
  selectedResourceIds: new Set(),
  latestBooking: null,
  userProfile: null,
  isDirty: false,
  autoSaveHandle: null
};

function resolveApiEndpoint() {
  const queryBase = new URLSearchParams(window.location.search).get("apiBase");
  const globalBase = String(window.__UTBBOKNING_API_BASE__ || "").trim();
  const storedBase = String(window.localStorage.getItem("utbbokningApiBase") || "").trim();

  let selectedBase = "";
  if (queryBase) {
    selectedBase = String(queryBase).trim();
    window.localStorage.setItem("utbbokningApiBase", selectedBase);
  } else if (globalBase) {
    selectedBase = globalBase;
    window.localStorage.setItem("utbbokningApiBase", selectedBase);
  } else if (storedBase) {
    selectedBase = storedBase;
  }

  if (!selectedBase) {
    return "/api/utbbokning";
  }

  const normalized = selectedBase.replace(/\/+$/, "");

  if (/\/api\/utbbokning$/i.test(normalized)) {
    return normalized;
  }

  return `${normalized}/api/utbbokning`;
}

function canCallRemoteApi() {
  if (!API_ENDPOINT) {
    return false;
  }

  const isFileProtocol = window.location.protocol === "file:";
  const isAbsoluteHttp = /^https?:\/\//i.test(API_ENDPOINT);

  if (isFileProtocol && !isAbsoluteHttp) {
    return false;
  }

  return true;
}

init().catch((error) => {
  console.error(error);
  setStatus("Initiering misslyckades. Öppna sidan igen eller kontrollera webbläsarstöd.");
});

async function init() {
  const hasBookingPage = Boolean(els.bookingForm);
  const hasResourcePage = Boolean(els.resourceForm || els.resourceLibrary);

  if (!hasBookingPage && !hasResourcePage) {
    return;
  }

  bindEvents();

  if (hasBookingPage) {
    state.userProfile = resolveSignedInProfile();
    applySignedInProfile(state.userProfile);
    bindShortcuts();
    startAutoSaveLoop();
  }

  state.useRemote = await isRemoteApiAvailable();

  if (!state.useRemote) {
    if (window.location.protocol === "file:" && !/^https?:\/\//i.test(API_ENDPOINT)) {
      setStatus("Du kor via file://. Ange ?apiBase=https://din-host eller kor via localhost.");
    }

    await enableLocalFallback("Backend ej tillganglig. Kor i lokalt fallback-lage.");
  } else {
    const endpointInfo = API_ENDPOINT.startsWith("http") ? ` via ${API_ENDPOINT}` : "";
    setStatus(`Kopplad mot backend-databasen${endpointInfo}.`);
  }

  try {
    await seedDefaultResources();
    await normalizeLegacyResourceEntries();
    state.resources = await listStoreItems(RESOURCE_STORE);
  } catch (error) {
    if (state.useRemote) {
      await enableLocalFallback("Remote databas svarade med fel. Kor lokalt tills separat UtbBokning-schema finns.");
      await seedDefaultResources();
      await normalizeLegacyResourceEntries();
      state.resources = await listStoreItems(RESOURCE_STORE);
    } else {
      throw error;
    }
  }

  if (hasBookingPage) {
    refreshAgendaResourceOptions();
  }

  if (els.resourcePicker) {
    renderResourcePicker();
  }

  if (els.resourceLibrary) {
    renderResourceLibrary();
  }

  const bookings = await listStoreItems(BOOKING_STORE);
  state.latestBooking = bookings.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0] || null;

  if (els.draftSummary) {
    renderDraftSummary();
  }

  updateExperienceDashboard();
}

async function enableLocalFallback(message) {
  state.useRemote = false;

  if (!window.indexedDB) {
    setStatus("Varken backend eller IndexedDB ar tillganglig. Kan inte spara data.");
    throw new Error("IndexedDB unavailable");
  }

  if (!state.db) {
    state.db = await openDb();
  }

  if (message) {
    setStatus(message);
  }
}

function bindEvents() {
  els.bookingForm?.addEventListener("submit", handleBookingSubmit);
  els.bookingForm?.addEventListener("input", () => {
    state.isDirty = true;
    updateExperienceDashboard();
  });
  els.bookingForm?.addEventListener("change", () => {
    state.isDirty = true;
    refreshAgendaDateOptions();
    updateExperienceDashboard();
  });
  els.resourceForm?.addEventListener("submit", handleResourceSubmit);
  els.loadLatestBooking?.addEventListener("click", handleLoadLatestBooking);
  els.exportBooking?.addEventListener("click", handleExportBooking);
  els.resetBooking?.addEventListener("click", handleResetBooking);
  els.addAgendaItem?.addEventListener("click", () => addAgendaItem());
  els.agendaList?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action='remove-agenda']");
    if (action) {
      action.closest(".agenda-item")?.remove();
      state.isDirty = true;
      updateExperienceDashboard();
      return;
    }
  });
  els.agendaList?.addEventListener("change", (event) => {
    const select = event.target;
    if (select instanceof HTMLSelectElement && select.getAttribute("data-field") === "instructor") {
      const agendaItem = select.closest(".agenda-item");
      const customInput = agendaItem?.querySelector('[data-field="instructorCustom"]');
      if (customInput) {
        const isCustom = select.value === "__custom__";
        customInput.style.display = isCustom ? "" : "none";
        if (isCustom) customInput.focus();
      }
      state.isDirty = true;
      updateExperienceDashboard();
      return;
    }

    if (!(select instanceof HTMLSelectElement) || select.getAttribute("data-field") !== "resources") {
      return;
    }

    const agendaItem = select.closest(".agenda-item");
    if (agendaItem) {
      syncAgendaLocationDetailSelect(agendaItem);
      state.isDirty = true;
      updateExperienceDashboard();
    }
  });
  els.agendaList?.addEventListener("input", () => {
    state.isDirty = true;
    updateExperienceDashboard();
  });
  els.agendaList?.addEventListener("keydown", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.getAttribute("data-field") !== "locationDetailCustomName") {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const agendaItem = input.closest(".agenda-item");
      if (agendaItem) {
        handleAddCustomLocationDetail(agendaItem);
      }
    }
  });
  els.resourcePicker?.addEventListener("change", handleResourceSelection);
  els.resourceLibrary?.addEventListener("click", handleResourceLibraryClick);
  els.resourceLibrary?.addEventListener("change", handleResourceLibraryChange);

  const onBehalfCheckbox = document.getElementById("bookingOnBehalf");
  if (onBehalfCheckbox) {
    onBehalfCheckbox.addEventListener("change", () => {
      const isOnBehalf = onBehalfCheckbox.checked;
      const entraFields = ["requesterName", "email", "phone", "contactRole", "department"];
      entraFields.forEach((name) => {
        const field = els.bookingForm?.elements.namedItem(name);
        if (field instanceof HTMLInputElement) {
          field.readOnly = !isOnBehalf;
          if (isOnBehalf) {
            field.value = "";
            field.placeholder = "Ange " + field.name;
            if (name === "requesterName") field.focus();
          } else {
            applySignedInProfile(state.userProfile);
          }
        }
      });
    });
  }
}

function resolveSignedInProfile() {
  const explicitProfile = window.__UTBBOKNING_ENTRA_PROFILE__;
  if (explicitProfile && typeof explicitProfile === "object") {
    return normalizeProfile(explicitProfile);
  }

  const activeAccount = window.msalInstance?.getActiveAccount?.();
  if (activeAccount) {
    return normalizeProfile(activeAccount);
  }

  const accountFromArray = window.msalInstance?.getAllAccounts?.()?.[0];
  if (accountFromArray) {
    return normalizeProfile(accountFromArray);
  }

  return null;
}

function normalizeProfile(profile) {
  const displayName = profile.displayName || profile.name || "";
  const firstName = profile.givenName || profile.given_name || "";
  const surname = profile.surname || profile.family_name || "";

  return {
    requesterName: String(displayName || [firstName, surname].filter(Boolean).join(" ")).trim(),
    email: String(profile.mail || profile.email || profile.username || profile.userPrincipalName || "").trim(),
    phone: String(profile.telephoneNumber || profile.phone || profile.mobilePhone || "").trim(),
    contactRole: String(profile.jobTitle || profile.title || "").trim(),
    department: String(profile.department || profile.officeLocation || "").trim()
  };
}

function applySignedInProfile(profile) {
  const fields = ["requesterName", "email", "phone", "contactRole", "department"];

  if (!profile) {
    if (els.profileBanner) {
      els.profileBanner.textContent = "Ingen Entra-profil hittades i sidan än. Formulärstrukturen är förberedd för att fylla beställaruppgifter automatiskt när profilen finns tillgänglig.";
    }
    if (els.profileStatePill) {
      els.profileStatePill.textContent = "Entra saknas";
    }
    return;
  }

  fields.forEach((name) => {
    const field = els.bookingForm?.elements.namedItem(name);
    if (field instanceof HTMLInputElement) {
      field.value = profile[name] || "";
    }
  });

  if (els.profileBanner) {
    const name = profile.requesterName || "Inloggad anvandare";
    els.profileBanner.textContent = `Beställaruppgifter för ${name} hämtades automatiskt från Entra.`;
  }

  if (els.profileStatePill) {
    els.profileStatePill.textContent = "Entra synkad";
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(RESOURCE_STORE)) {
        db.createObjectStore(RESOURCE_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(BOOKING_STORE)) {
        db.createObjectStore(BOOKING_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Kunde inte öppna lokal databas."));
  });
}

async function seedDefaultResources() {
  const existing = await listStoreItems(RESOURCE_STORE);
  const existingNames = new Set(existing.map((item) => normalizeResourceName(item.name)));

  for (const resource of DEFAULT_DETAIL_RESOURCES) {
    const key = normalizeResourceName(resource.name);
    if (existingNames.has(key)) {
      continue;
    }

    await putStoreItem(RESOURCE_STORE, resource);
    existingNames.add(key);
  }
}

function normalizeResourceName(value) {
  return String(value || "").trim().toLowerCase();
}

function isStaticLocationName(name) {
  return STATIC_LOCATION_KEYS.has(normalizeResourceName(name));
}

function getManagedResources() {
  return state.resources.filter((resource) => !isStaticLocationName(resource.name));
}

async function normalizeLegacyResourceEntries() {
  const existing = await listStoreItems(RESOURCE_STORE);
  const updates = existing
    .map((resource) => {
      const nextName = LEGACY_RESOURCE_RENAMES[resource.name];
      if (!nextName || nextName === resource.name) {
        return null;
      }

      return {
        ...resource,
        name: nextName
      };
    })
    .filter(Boolean);

  for (const resource of updates) {
    await putStoreItem(RESOURCE_STORE, resource);
  }
}

async function isRemoteApiAvailable() {
  if (!canCallRemoteApi()) {
    return false;
  }

  try {
    const response = await fetch(`${API_ENDPOINT}?entity=health`);
    if (!response.ok) {
      return false;
    }

    const payload = await response.json().catch(() => null);
    if (!payload || payload.ok !== true) {
      return false;
    }

    return payload.dbConfigured !== false;
  } catch (error) {
    return false;
  }
}

async function apiRequest({ entity, method = "GET", body = null, query = {} }) {
  if (!canCallRemoteApi()) {
    throw new Error("Remote API kan inte anropas i file://-lage utan absolut http(s) apiBase.");
  }

  const search = new URLSearchParams({ entity, ...query });
  const response = await fetch(`${API_ENDPOINT}?${search.toString()}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const err = new Error(payload?.error || `API error ${response.status}`);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

function listStoreItems(storeName) {
  if (state.useRemote) {
    if (storeName === RESOURCE_STORE) {
      return apiRequest({ entity: "resources" });
    }
    if (storeName === BOOKING_STORE) {
      return apiRequest({ entity: "bookings" });
    }
  }

  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Läsning misslyckades."));
  });
}

function putStoreItem(storeName, item) {
  if (state.useRemote) {
    if (storeName === RESOURCE_STORE) {
      return apiRequest({
        entity: "resource",
        method: "POST",
        body: {
          id: item.id,
          name: item.name,
          category: item.category,
          notes: item.notes,
          totalQuantity: item.totalQuantity || 0
        }
      });
    }

    if (storeName === BOOKING_STORE) {
      return apiRequest({
        entity: "booking",
        method: "POST",
        body: { booking: item }
      });
    }
  }

  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Sparning misslyckades."));
  });
}

function deleteStoreItem(storeName, id) {
  if (state.useRemote) {
    if (storeName === RESOURCE_STORE) {
      return apiRequest({
        entity: "resource",
        method: "DELETE",
        query: { id }
      });
    }

    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Borttagning misslyckades."));
  });
}

function handleResourceSelection(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") {
    return;
  }

  if (input.checked) {
    state.selectedResourceIds.add(input.value);
  } else {
    state.selectedResourceIds.delete(input.value);
  }
}

async function handleResourceSubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.resourceForm);
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return;
  }

  const resource = {
    id: `res-${Date.now()}`,
    name,
    category: String(formData.get("category") || "").trim() || "Övrigt",
    notes: String(formData.get("notes") || "").trim(),
    totalQuantity: Math.max(0, Number.parseInt(String(formData.get("totalQuantity") || "0"), 10) || 0)
  };

  try {
    await putStoreItem(RESOURCE_STORE, resource);
  } catch (error) {
    setStatus(error?.message || "Kunde inte spara resursen.");
    return;
  }

  state.resources = await listStoreItems(RESOURCE_STORE);
  if (els.resourcePicker) {
    renderResourcePicker();
  }
  if (els.resourceLibrary) {
    renderResourceLibrary();
  }
  els.resourceForm.reset();
  setStatus(`Resursen "${resource.name}" sparades i ${state.useRemote ? "backend-databasen" : "lokal databas"}.`);
}

async function handleResourceLibraryClick(event) {
  // Delete
  const deleteBtn = event.target.closest("[data-resource-delete]");
  if (deleteBtn) {
    const resourceId = deleteBtn.getAttribute("data-resource-delete");
    const resource = state.resources.find((item) => item.id === resourceId);
    await deleteStoreItem(RESOURCE_STORE, resourceId);
    state.selectedResourceIds.delete(resourceId);
    state.resources = await listStoreItems(RESOURCE_STORE);
    if (els.resourcePicker) renderResourcePicker();
    if (els.resourceLibrary) renderResourceLibrary();
    if (els.draftSummary) renderDraftSummary();
    setStatus(resource ? `Resursen "${resource.name}" togs bort.` : "Resurs borttagen.");
    return;
  }

  // Increment
  const incBtn = event.target.closest("[data-resource-qty-inc]");
  if (incBtn) {
    const resourceId = incBtn.getAttribute("data-resource-qty-inc");
    const input = els.resourceLibrary.querySelector(`[data-resource-qty="${resourceId}"]`);
    if (input) {
      input.value = Math.max(0, Number(input.value) + 1);
      await saveResourceQty(resourceId, Number(input.value));
    }
    return;
  }

  // Decrement
  const decBtn = event.target.closest("[data-resource-qty-dec]");
  if (decBtn) {
    const resourceId = decBtn.getAttribute("data-resource-qty-dec");
    const input = els.resourceLibrary.querySelector(`[data-resource-qty="${resourceId}"]`);
    if (input) {
      input.value = Math.max(0, Number(input.value) - 1);
      await saveResourceQty(resourceId, Number(input.value));
    }
    return;
  }
}

async function handleResourceLibraryChange(event) {
  const input = event.target.closest("[data-resource-qty]");
  if (!input) return;
  const resourceId = input.getAttribute("data-resource-qty");
  const qty = Math.max(0, Number(input.value) || 0);
  input.value = qty;
  await saveResourceQty(resourceId, qty);
}

async function saveResourceQty(resourceId, qty) {
  const resource = state.resources.find((item) => item.id === resourceId);
  if (!resource) return;
  const updated = { ...resource, totalQuantity: qty };
  await putStoreItem(RESOURCE_STORE, updated);
  state.resources = await listStoreItems(RESOURCE_STORE);
  setStatus(`"${resource.name}" uppdaterad: ${qty} st i lager.`);
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  await persistDraft("manual");
}

async function handleLoadLatestBooking() {
  if (!state.latestBooking) {
    setStatus("Det finns inget sparat utkast än.");
    return;
  }

  hydrateForm(state.latestBooking);
  applySignedInProfile(state.userProfile);
  setStatus("Senaste utkast laddades in i formuläret.");
}

function handleExportBooking() {
  const draft = buildBookingDraft();
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(draft.title || "utbbokning-utkast")}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus("JSON-export skapad lokalt.");
}

async function persistDraft(source = "manual") {
  if ((!state.db && !state.useRemote) || !els.bookingForm) {
    return;
  }

  const draft = buildBookingDraft();
  draft.updatedAt = new Date().toISOString();
  try {
    await putStoreItem(BOOKING_STORE, draft);
  } catch (error) {
    if (error?.status === 409 && Array.isArray(error?.payload?.conflicts)) {
      setStatus(formatInventoryConflictMessage(error.payload.conflicts));
      if (source !== "autosave") {
        alert(formatInventoryConflictMessage(error.payload.conflicts));
      }
      return;
    }

    throw error;
  }

  state.latestBooking = draft;
  state.isDirty = false;
  renderDraftSummary();
  updateExperienceDashboard();

  if (source === "autosave") {
    setStatus(`Autosparat ${formatTimestamp(draft.updatedAt)}.`);
    return;
  }

  setStatus(`Utkast sparat ${formatTimestamp(draft.updatedAt)}.`);
}

function formatInventoryConflictMessage(conflicts) {
  if (!Array.isArray(conflicts) || conflicts.length === 0) {
    return "Kan inte spara bokning pa grund av lagerkonflikt.";
  }

  const first = conflicts[0];
  const date = first.date || "okand dag";
  return `For lite tillgangligt: ${first.resource} (${date}). Begart ${first.requested}, ledigt ${first.available}.`;
}

function handleResetBooking() {
  state.selectedResourceIds.clear();
  window.setTimeout(() => {
    els.agendaList.innerHTML = "";
    applySignedInProfile(state.userProfile);
    if (els.resourcePicker) {
      renderResourcePicker();
    }
    if (els.draftSummary) {
      renderDraftSummary();
    }
    updateExperienceDashboard();
    setStatus(`Formularet ar tomt. Resurser finns kvar i ${state.useRemote ? "backend" : "lokal databas"}.`);
  }, 0);
}

function buildBookingDraft() {
  const formData = new FormData(els.bookingForm);
  const resourceIds = Array.from(state.selectedResourceIds);
  const selectedResources = state.resources.filter((item) => resourceIds.includes(item.id));
  const requesterName = String(formData.get("requesterName") || "").trim();

  const onBehalfCheckbox = document.getElementById("bookingOnBehalf");
  const isOnBehalf = onBehalfCheckbox?.checked || false;

  return {
    id: state.latestBooking?.id || `booking-${Date.now()}`,
    submittedBy: isOnBehalf ? (state.userProfile?.requesterName || "") : "",
    isOnBehalf,
    requesterName,
    department: String(formData.get("department") || "").trim(),
    contactRole: String(formData.get("contactRole") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    purpose: String(formData.get("purpose") || "").trim(),
    startDate: String(formData.get("startDate") || "").trim(),
    endDate: String(formData.get("endDate") || "").trim(),
    startTime: String(formData.get("startTime") || "").trim(),
    endTime: String(formData.get("endTime") || "").trim(),
    participantCount: String(formData.get("participantCount") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    specialRequirements: String(formData.get("specialRequirements") || "").trim(),
    resourceIds,
    selectedResources,
    agenda: collectAgendaItems(),
    sourceDocument: "Bokningsförfrågan Viktoria övningsfält ifyllnadsbar.docx"
  };
}

function collectAgendaItems() {
  return Array.from(els.agendaList.querySelectorAll(".agenda-item"))
    .map((item) => ({
      date: String(item.querySelector('[data-field="date"]')?.value || "").trim(),
      time: composeMomentTimeValue(item),
      title: String(item.querySelector('[data-field="title"]')?.value || "").trim(),
      notes: String(item.querySelector('[data-field="notes"]')?.value || "").trim(),
      resources: readSelectedValues(item.querySelector('[data-field="resources"]')),
      locationDetails: readLocationDetailValues(item),
      instructor: (() => {
        const sel = item.querySelector('[data-field="instructor"]');
        if (sel?.value === "__custom__") {
          return String(item.querySelector('[data-field="instructorCustom"]')?.value || "").trim();
        }
        return String(sel?.value || "").trim();
      })()
    }))
    .filter((entry) => entry.date || entry.time || entry.title || entry.notes || entry.resources.length || entry.locationDetails.length || entry.instructor);
}

function hydrateForm(draft) {
  const mapping = {
    requesterName: draft.requesterName,
    department: draft.department,
    contactRole: draft.contactRole,
    email: draft.email,
    phone: draft.phone,
    title: draft.title,
    purpose: draft.purpose,
    startDate: draft.startDate,
    endDate: draft.endDate,
    startTime: draft.startTime,
    endTime: draft.endTime,
    participantCount: draft.participantCount,
    description: draft.description,
    specialRequirements: draft.specialRequirements
  };

  Object.entries(mapping).forEach(([name, value]) => {
    const field = els.bookingForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
      field.value = value || "";
    }
  });

  state.selectedResourceIds = new Set(draft.resourceIds || []);
  renderResourcePicker();
  els.agendaList.innerHTML = "";

  if (Array.isArray(draft.agenda) && draft.agenda.length > 0) {
    draft.agenda.forEach((item) => addAgendaItem(item));
  } else {
    addAgendaItem();
  }

  renderDraftSummary();
}

function addAgendaItem(initialValue = {}) {
  const template = els.agendaItemTemplate.content.firstElementChild.cloneNode(true);
  const [initialStart, initialEnd] = splitMomentTimeValue(initialValue.time || "");
  populateAgendaDateSelect(template.querySelector('[data-field="date"]'), initialValue.date || "");
  template.querySelector('[data-field="timeStart"]').value = initialStart;
  template.querySelector('[data-field="timeEnd"]').value = initialEnd;
  template.querySelector('[data-field="title"]').value = initialValue.title || "";
  template.querySelector('[data-field="notes"]').value = initialValue.notes || "";
  const initialLocationDetails = normalizeLocationDetails(initialValue.locationDetails, initialValue.locationDetail);
  populateMomentLocationSelect(
    template.querySelector('[data-field="resources"]'),
    initialValue.resources || []
  );
  populateInstructorSelect(
    template.querySelector('[data-field="instructor"]'),
    initialValue.instructor || ""
  );
  syncAgendaLocationDetailSelect(template, initialLocationDetails);
  els.agendaList.appendChild(template);
  template.classList.add("new-item");
  window.setTimeout(() => template.classList.remove("new-item"), 350);
  updateExperienceDashboard();
}

function composeMomentTimeValue(agendaItem) {
  const start = String(agendaItem.querySelector('[data-field="timeStart"]')?.value || "").trim();
  const end = String(agendaItem.querySelector('[data-field="timeEnd"]')?.value || "").trim();

  if (!start && !end) {
    return "";
  }

  if (start && end) {
    return `${start}-${end}`;
  }

  return start ? `${start}-` : `-${end}`;
}

function splitMomentTimeValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return ["", ""];
  }

  const parts = raw.split("-");
  if (parts.length < 2) {
    return ["", ""];
  }

  const start = String(parts[0] || "").trim();
  const end = String(parts[1] || "").trim();
  return [start, end];
}

function refreshAgendaDateOptions() {
  if (!els.agendaList) {
    return;
  }

  Array.from(els.agendaList.querySelectorAll(".agenda-item")).forEach((item) => {
    const dateSelect = item.querySelector('[data-field="date"]');
    const selectedDate = String(dateSelect?.value || "");
    populateAgendaDateSelect(dateSelect, selectedDate);
  });
}

function populateAgendaDateSelect(select, selectedDate = "") {
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const options = getAgendaDateOptions();
  select.innerHTML = "";

  if (options.length === 0) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Välj bokningsdatum först";
    select.appendChild(placeholder);
    select.value = "";
    return;
  }

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Välj dag";
  select.appendChild(defaultOption);

  options.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.appendChild(option);
  });

  select.value = options.some((option) => option.value === selectedDate) ? selectedDate : "";
}

function getAgendaDateOptions() {
  if (!els.bookingForm) {
    return [];
  }

  const startDate = String(els.bookingForm.elements.namedItem("startDate")?.value || "").trim();
  const endDate = String(els.bookingForm.elements.namedItem("endDate")?.value || "").trim();

  if (!startDate) {
    return [];
  }

  const start = new Date(`${startDate}T12:00:00`);
  const end = endDate ? new Date(`${endDate}T12:00:00`) : new Date(`${startDate}T12:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const dayNames = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
  const options = [];
  let cursor = new Date(start);
  let dayIndex = 1;

  while (cursor <= end && options.length < 31) {
    const iso = cursor.toISOString().slice(0, 10);
    const weekday = dayNames[cursor.getUTCDay()];
    options.push({
      value: iso,
      label: `Dag ${dayIndex} • ${weekday} ${iso}`
    });
    cursor.setDate(cursor.getDate() + 1);
    dayIndex += 1;
  }

  return options;
}

function syncAgendaLocationDetailSelect(agendaItem, preferredValues = []) {
  const resourceSelect = agendaItem.querySelector('[data-field="resources"]');
  const detailContainer = agendaItem.querySelector('[data-field="locationDetail"]');

  if (!(detailContainer instanceof HTMLElement)) {
    return;
  }

  const selectedLocation = readSelectedValues(resourceSelect)[0] || "";
  const selectedDetails = normalizeLocationDetails(preferredValues, null).length
    ? normalizeLocationDetails(preferredValues, null)
    : readLocationDetailValues(agendaItem);
  const selectedMap = new Map(selectedDetails.map((entry) => [entry.name, entry.quantity]));
  const options = getLocationDetailOptions(selectedLocation);
  const optionNames = new Set(options.map((name) => name.toLowerCase()));
  const customNames = selectedDetails
    .map((entry) => String(entry.name || "").trim())
    .filter((name) => name && !optionNames.has(name.toLowerCase()));

  detailContainer.innerHTML = "";

  if (!selectedLocation) {
    detailContainer.innerHTML = '<p class="helper-text">Välj lokal först för att se tillval.</p>';
    detailContainer.appendChild(createLocationDetailCustomControls(true));
    return;
  }

  if (options.length === 0) {
    detailContainer.innerHTML = '<p class="helper-text">Inga standardtillval för vald lokal.</p>';
  }

  const mergedOptionNames = [...options, ...customNames];

  mergedOptionNames.forEach((optionValue) => {
    const row = document.createElement("label");
    row.className = "location-detail-option";

    const quantity = document.createElement("input");
    quantity.type = "number";
    quantity.min = "0";
    quantity.step = "1";
    quantity.value = String(selectedMap.get(optionValue) || 0);
    quantity.setAttribute("data-location-detail-qty", optionValue);
    quantity.setAttribute("aria-label", `Antal för ${optionValue}`);

    const text = document.createElement("span");
    text.textContent = optionValue;

    row.appendChild(quantity);
    row.appendChild(text);
    detailContainer.appendChild(row);
  });

  detailContainer.appendChild(createLocationDetailCustomControls(false));
}

function createLocationDetailCustomControls(disabled) {
  const wrapper = document.createElement("div");
  wrapper.className = "location-detail-custom";

  const searchWrap = document.createElement("div");
  searchWrap.className = "resource-search-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = disabled ? "Välj lokal först" : "Sök resurs (t.ex. Rökskydd)...";
  input.setAttribute("data-field", "locationDetailCustomName");
  input.disabled = Boolean(disabled);
  input.setAttribute("autocomplete", "off");

  const suggestions = document.createElement("ul");
  suggestions.className = "resource-suggestions";
  suggestions.style.display = "none";

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    suggestions.innerHTML = "";
    if (!query) { suggestions.style.display = "none"; return; }

    const matches = getManagedResources()
      .map(r => r.name)
      .filter(name => name.toLowerCase().includes(query))
      .slice(0, 8);

    if (matches.length === 0) { suggestions.style.display = "none"; return; }

    matches.forEach(name => {
      const li = document.createElement("li");
      li.className = "resource-suggestion-item";
      li.textContent = name;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = name;
        suggestions.style.display = "none";
        const agendaItem = input.closest(".agenda-item");
        if (agendaItem) handleAddCustomLocationDetail(agendaItem);
      });
      suggestions.appendChild(li);
    });
    suggestions.style.display = "";
  });

  input.addEventListener("blur", () => {
    setTimeout(() => { suggestions.style.display = "none"; }, 150);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const first = suggestions.querySelector(".resource-suggestion-item");
      if (first) { input.value = first.textContent; }
      suggestions.style.display = "none";
      const agendaItem = input.closest(".agenda-item");
      if (agendaItem) handleAddCustomLocationDetail(agendaItem);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const items = suggestions.querySelectorAll(".resource-suggestion-item");
      if (items.length) { items[0].focus(); }
    }
  });

  suggestions.addEventListener("keydown", (e) => {
    const items = [...suggestions.querySelectorAll(".resource-suggestion-item")];
    const idx = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && idx < items.length - 1) { e.preventDefault(); items[idx + 1].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); idx > 0 ? items[idx - 1].focus() : input.focus(); }
    if (e.key === "Enter" && idx >= 0) {
      e.preventDefault();
      input.value = items[idx].textContent;
      suggestions.style.display = "none";
      const agendaItem = input.closest(".agenda-item");
      if (agendaItem) handleAddCustomLocationDetail(agendaItem);
    }
  });

  searchWrap.appendChild(input);
  searchWrap.appendChild(suggestions);
  wrapper.appendChild(searchWrap);
  return wrapper;
}

function handleAddCustomLocationDetail(agendaItem) {
  const input = agendaItem.querySelector('[data-field="locationDetailCustomName"]');
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const customName = String(input.value || "").trim();
  if (!customName) {
    return;
  }

  const currentDetails = readLocationDetailValues(agendaItem);
  const existing = currentDetails.find((entry) => entry.name.toLowerCase() === customName.toLowerCase());

  if (existing) {
    existing.quantity = Math.max(1, existing.quantity);
  } else {
    currentDetails.push({ name: customName, quantity: 1 });
  }

  syncAgendaLocationDetailSelect(agendaItem, currentDetails);
  input.value = "";
  input.focus();
  state.isDirty = true;
  updateExperienceDashboard();
}

function readLocationDetailValues(agendaItem) {
  const detailContainer = agendaItem?.querySelector('[data-field="locationDetail"]');
  if (!(detailContainer instanceof HTMLElement)) {
    return [];
  }

  return Array.from(detailContainer.querySelectorAll("[data-location-detail-qty]"))
    .map((input) => {
      const name = input.getAttribute("data-location-detail-qty") || "";
      const quantity = Math.max(0, Number.parseInt(input.value || "0", 10) || 0);
      return {
        name,
        quantity
      };
    })
    .filter((entry) => entry.name && entry.quantity > 0);
}

function normalizeLocationDetails(locationDetails, legacyLocationDetail) {
  if (Array.isArray(locationDetails)) {
    return locationDetails
      .map((entry) => {
        if (typeof entry === "string") {
          const rawName = String(entry).trim();
          const mappedName = rawName === "Bilar (Antal uppges i Notering)" ? "Bilar" : rawName;
          if (!mappedName) {
            return null;
          }
          return {
            name: mappedName,
            quantity: 1
          };
        }

        if (entry && typeof entry === "object") {
          const rawName = String(entry.name || entry.value || "").trim();
          const name = rawName === "Bilar (Antal uppges i Notering)" ? "Bilar" : rawName;
          const quantity = Math.max(0, Number.parseInt(String(entry.quantity || 0), 10) || 0);
          if (!name || quantity <= 0) {
            return null;
          }
          return { name, quantity };
        }

        return null;
      })
      .filter(Boolean);
  }

  if (legacyLocationDetail) {
    return [{ name: String(legacyLocationDetail).trim(), quantity: 1 }].filter((entry) => entry.name);
  }

  return [];
}

function populateInstructorSelect(select, selectedValue) {
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const normalizedValue = String(selectedValue || "");
  const isCustom = normalizedValue && !INSTRUCTOR_OPTIONS.includes(normalizedValue);

  select.innerHTML = '<option value="">Välj instruktör</option>';

  INSTRUCTOR_OPTIONS.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.selected = normalizedValue === name;
    select.appendChild(option);
  });

  const customOpt = document.createElement("option");
  customOpt.value = "__custom__";
  customOpt.textContent = "Eget namn...";
  customOpt.selected = isCustom;
  select.appendChild(customOpt);

  const customInput = select.parentElement?.querySelector('[data-field="instructorCustom"]');
  if (customInput) {
    customInput.style.display = isCustom ? "" : "none";
    if (isCustom) customInput.value = normalizedValue;
  }
}

function populateAgendaSelect(select, options, selectedValues) {
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const normalizedValues = Array.isArray(selectedValues)
    ? selectedValues
    : selectedValues
      ? [selectedValues]
      : [];

  select.innerHTML = "";

  options.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    option.selected = normalizedValues.includes(optionData.value);
    select.appendChild(option);
  });
}

function readSelectedValues(select) {
  if (!(select instanceof HTMLSelectElement)) {
    return [];
  }

  if (!select.multiple) {
    return select.value ? [select.value] : [];
  }

  return Array.from(select.selectedOptions).map((option) => option.value);
}

function getMomentLocationOptions() {
  return STATIC_LOCATIONS.map((name) => ({ value: name, label: name }));
}

function populateMomentLocationSelect(select, selectedValues) {
  if (!(select instanceof HTMLSelectElement)) return;
  const selected = Array.isArray(selectedValues) ? selectedValues : selectedValues ? [selectedValues] : [];

  const lektionssalar = [
    "4B - Flamman",
    "4C - Gnistan (Grovlektionssal)",
    "16 - Sparlågan (Grovlektionssal)",
    "22 - Branden",
    "23 - Glöden"
  ];
  const ovningsytor = STATIC_LOCATIONS.filter(n => !lektionssalar.includes(n) && n !== "Fika och pausyta");

  select.innerHTML = '<option value="">Välj lokal</option>';

  const makeGroup = (label, names) => {
    const group = document.createElement("optgroup");
    group.label = label;
    names.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      opt.selected = selected.includes(name);
      group.appendChild(opt);
    });
    return group;
  };

  select.appendChild(makeGroup("Lektionssalar", lektionssalar));
  select.appendChild(makeGroup("Övningsytor", ovningsytor));

  const fikaOpt = document.createElement("option");
  fikaOpt.value = "Fika och pausyta";
  fikaOpt.textContent = "Fika och pausyta";
  fikaOpt.selected = selected.includes("Fika och pausyta");
  select.appendChild(fikaOpt);
}

function getLocationDetailOptions(locationName) {
  const normalized = String(locationName || "").trim().toLowerCase();
  return MOMENT_LOCATION_DETAIL_OPTIONS[normalized] || [];
}

function renderResourcePicker() {
  if (!els.resourcePicker) {
    return;
  }

  els.resourcePicker.innerHTML = "";
  const resources = getManagedResources();

  if (resources.length === 0) {
    els.resourcePicker.innerHTML = '<p class="helper-text">Inga resurser finns i databasen än.</p>';
    return;
  }

  resources.forEach((resource) => {
    const wrapper = document.createElement("article");
    wrapper.className = "resource-option";

    const checked = state.selectedResourceIds.has(resource.id) ? "checked" : "";
    wrapper.innerHTML = `
      <label>
        <input type="checkbox" value="${resource.id}" ${checked} />
        <div>
          <strong>${escapeHtml(resource.name)}</strong>
          <div class="resource-meta">${escapeHtml(resource.category || "Övrigt")}</div>
          <div class="resource-meta">Totalt antal: ${escapeHtml(String(resource.totalQuantity ?? 0))}</div>
          <div class="resource-meta">${escapeHtml(resource.notes || "Ingen beskrivning.")}</div>
        </div>
      </label>
    `;

    els.resourcePicker.appendChild(wrapper);
  });

  refreshAgendaResourceOptions();
}

function refreshAgendaResourceOptions() {
  if (!els.agendaList) {
    return;
  }

  Array.from(els.agendaList.querySelectorAll('.agenda-item')).forEach((item) => {
    const resourceSelect = item.querySelector('[data-field="resources"]');
    const instructorSelect = item.querySelector('[data-field="instructor"]');
    const selectedResources = readSelectedValues(resourceSelect);
    const selectedInstructor = String(instructorSelect?.value || "");
    const selectedDetails = readLocationDetailValues(item);

    populateMomentLocationSelect(resourceSelect, selectedResources);
    populateInstructorSelect(instructorSelect, selectedInstructor);
    syncAgendaLocationDetailSelect(item, selectedDetails);
  });
}

function renderResourceLibrary() {
  if (!els.resourceLibrary) {
    return;
  }

  els.resourceLibrary.innerHTML = "";
  const resources = getManagedResources();

  if (resources.length === 0) {
    els.resourceLibrary.innerHTML = '<p class="helper-text">Lägg till resurser för att bygga upp biblioteket.</p>';
    return;
  }

  resources.forEach((resource) => {
    const card = document.createElement("article");
    card.className = "resource-card";
    card.innerHTML = `
      <div class="resource-card-header">
        <h3 class="resource-card-name" data-resource-name="${resource.id}">${escapeHtml(resource.name)}</h3>
        <span class="resource-tag">${escapeHtml(resource.category || "Övrigt")}</span>
      </div>
      <div class="resource-qty-row">
        <label class="resource-qty-label">Antal i lager</label>
        <div class="resource-qty-controls">
          <button type="button" class="qty-btn" data-resource-qty-dec="${resource.id}">−</button>
          <input type="number" class="qty-input" min="0" step="1"
            value="${Number(resource.totalQuantity ?? 0)}"
            data-resource-qty="${resource.id}" />
          <button type="button" class="qty-btn" data-resource-qty-inc="${resource.id}">+</button>
        </div>
      </div>
      <p class="helper-text">${escapeHtml(resource.notes || "Ingen beskrivning.")}</p>
      <button type="button" class="link-button" data-resource-delete="${resource.id}">Ta bort</button>
    `;
    els.resourceLibrary.appendChild(card);
  });
}

function renderDraftSummary() {
  if (!els.draftSummary) {
    return;
  }

  if (!state.latestBooking) {
    els.draftSummary.innerHTML = '<p class="helper-text">Spara ett utkast för att se sammanfattning här.</p>';
    return;
  }

  const draft = state.latestBooking;
  const allAgendaResources = Array.from(new Set((draft.agenda || []).flatMap((item) => item.resources || [])));
  const resources = allAgendaResources.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("");
  const agenda = (draft.agenda || [])
    .map((item) => {
      const locationDetails = normalizeLocationDetails(item.locationDetails, item.locationDetail);
      const locationDetailPills = locationDetails
        .map((entry) => `<span class="pill">${escapeHtml(entry.name)} (${entry.quantity})</span>`)
        .join("");
      const dateLabel = item.date ? formatAgendaDate(item.date) : "Dag saknas";
      return `
        <div class="summary-moment">
          <div class="summary-row"><strong>Dag</strong><span>${escapeHtml(dateLabel)}</span></div>
          <div class="summary-row"><strong>${escapeHtml(item.title || "Moment utan rubrik")}</strong><span>${escapeHtml(item.instructor || "Instruktör saknas")}</span></div>
          ${locationDetailPills ? `<div class="pill-list">${locationDetailPills}</div>` : ""}
        </div>
      `;
    })
    .join("");

  els.draftSummary.innerHTML = `
    <article class="summary-card">
      <h3>${escapeHtml(draft.title || "Utan rubrik")}</h3>
      <p>${escapeHtml(draft.requesterName || "Beställare saknas")}</p>
      ${draft.isOnBehalf && draft.submittedBy ? `<p class="helper-text">Skickat av: ${escapeHtml(draft.submittedBy)}</p>` : ""}
      <p>${escapeHtml(composeDateRange(draft))}</p>
      <p>${escapeHtml(draft.department || "Enhet saknas")}</p>
      <p>${escapeHtml(draft.contactRole || "Roll saknas")}</p>
      <p>${escapeHtml(draft.email || "Ingen e-post")}</p>
      <p>${escapeHtml(draft.phone || "Ingen telefon")}</p>
      <div>
        <strong>Valda lokaler</strong>
        <div class="pill-list">${resources || '<span class="helper-text">Inga resurser valda.</span>'}</div>
      </div>
      <div>
        <strong>Planerade moment</strong>
        <div class="summary-list">${agenda || '<p class="helper-text">Inga moment tillagda.</p>'}</div>
      </div>
    </article>
  `;
}

function bindShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (!els.bookingForm) {
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      persistDraft("manual").catch((error) => console.error(error));
      return;
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "m") {
      event.preventDefault();
      addAgendaItem();
    }
  });
}

function startAutoSaveLoop() {
  if (state.autoSaveHandle || !els.bookingForm) {
    return;
  }

  state.autoSaveHandle = window.setInterval(() => {
    if (!state.isDirty || !state.db) {
      return;
    }

    persistDraft("autosave").catch((error) => {
      console.error(error);
      setStatus("Autospar misslyckades, försök spara manuellt.");
    });
  }, 20000);
}

function updateExperienceDashboard() {
  if (!els.bookingForm) {
    return;
  }

  const draft = buildBookingDraft();
  const agenda = draft.agenda || [];
  const checks = [
    Boolean(draft.title),
    Boolean(draft.purpose),
    Boolean(draft.startDate),
    Boolean(draft.endDate),
    Boolean(draft.startTime),
    Boolean(draft.endTime),
    Boolean(draft.participantCount),
    agenda.length > 0
  ];

  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  if (els.completionLabel) {
    els.completionLabel.textContent = `${score}%`;
  }

  if (els.completionBar) {
    els.completionBar.style.width = `${score}%`;
  }

  renderQuickFacts(draft);
  renderSmartTips(draft);
  renderTimeline(draft);
}

function renderQuickFacts(draft) {
  if (!els.quickFacts) {
    return;
  }

  const agenda = draft.agenda || [];
  const totalDuration = agenda.reduce((minutes, item) => minutes + parseDurationMinutes(item.time), 0);
  const totalExtras = agenda.reduce(
    (sum, item) => sum + normalizeLocationDetails(item.locationDetails, item.locationDetail).reduce((acc, detail) => acc + detail.quantity, 0),
    0
  );

  els.quickFacts.innerHTML = `
    <article class="fact-card">
      <span class="helper-text">Planerade moment</span>
      <strong>${agenda.length}</strong>
    </article>
  `;
}

function renderSmartTips(draft) {
  if (!els.smartTips) {
    return;
  }

  const tips = [];
  const participantCount = Number.parseInt(String(draft.participantCount || "0"), 10) || 0;
  const agenda = draft.agenda || [];

  if (!draft.title || !draft.purpose) {
    tips.push("Sätt både rubrik och tydligt syfte för snabbare intern handläggning.");
  }

  if (participantCount >= 20) {
    tips.push("Ni är många deltagare. Kontrollera att minst ett moment använder Fika och pausyta.");
  }

  if (agenda.some((item) => !item.instructor)) {
    tips.push("Minst ett moment saknar instruktör. Tilldela ansvar för högre kvalitet i genomförandet.");
  }

  if (agenda.length >= 3 && agenda.every((item) => !String(item.notes || "").trim())) {
    tips.push("Lägg till notering på momenten så teamet får tydliga genomförandeinstruktioner.");
  }

  if (!draft.startDate || !draft.endDate || !draft.startTime || !draft.endTime) {
    tips.push("Komplettera datum och tider för att kunna planera resurser exakt.");
  }

  const isMultiDay = draft.startDate && draft.endDate && draft.startDate !== draft.endDate;
  if (isMultiDay && agenda.some((item) => !item.date)) {
    tips.push("Bokningen sträcker sig över flera dagar. Sätt dag på varje moment för tydlig planering.");
  }

  if (tips.length === 0) {
    tips.push("Bokningen ser stark ut. Nästa steg är att spara och dela utkastet till ansvarig samordnare.");
  }

  els.smartTips.innerHTML = tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("");
}

function renderTimeline(draft) {
  if (!els.liveTimeline) {
    return;
  }

  const agenda = draft.agenda || [];

  if (agenda.length === 0) {
    els.liveTimeline.innerHTML = '<p class="helper-text">Lägg till moment för att bygga tidslinje.</p>';
    return;
  }

  els.liveTimeline.innerHTML = agenda
    .map((item) => {
      const location = (item.resources || [])[0] || "Lokal saknas";
      const dayLabel = item.date ? formatAgendaDate(item.date) : "Dag saknas";
      return `
        <article class="timeline-item">
          <div class="helper-text">${escapeHtml(dayLabel)}</div>
          <div class="time">${escapeHtml(item.time || "Tid saknas")}</div>
          <div><strong>${escapeHtml(item.title || "Moment utan rubrik")}</strong></div>
          <div class="helper-text">${escapeHtml(location)} • ${escapeHtml(item.instructor || "Instruktör saknas")}</div>
        </article>
      `;
    })
    .join("");
}

function parseDurationMinutes(timeValue) {
  const match = String(timeValue || "").trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!match) {
    return 0;
  }

  const start = Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
  const end = Number.parseInt(match[3], 10) * 60 + Number.parseInt(match[4], 10);
  return Math.max(0, end - start);
}

function formatAgendaDate(isoDate) {
  if (!isoDate) {
    return "";
  }

  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsed);
}

function formatMinutes(totalMinutes) {
  if (!totalMinutes) {
    return "0 h";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

function composeDateRange(draft) {
  const datePart = [draft.startDate, draft.endDate].filter(Boolean).join(" till ");
  const timePart = [draft.startTime, draft.endTime].filter(Boolean).join(" - ");
  return [datePart, timePart].filter(Boolean).join(", ") || "Datum och tid saknas";
}

function setStatus(message) {
  if (els.saveStatus) {
    els.saveStatus.textContent = message;
  }

  if (els.profileBanner && !els.saveStatus) {
    els.profileBanner.textContent = message;
  }
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function slugify(value) {
  return String(value || "utkast")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
