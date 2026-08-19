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
  "Erik Elvermark",
  "Daniel Holmgren",
  "Jonas Glaser",
  "Erik Botås",
  "Stefan Ulander",
  "Stefan Mattsson",
  "Jörgen Lundberg",
  "Alf Karlsson"
];
const MOMENT_LOCATION_DETAIL_OPTIONS = {
  "4b - flamman": ["Papper och penna", "Projektor", "Ljud"],
  "4c - gnistan (grovlektionssal)": ["Papper och penna", "Projektor", "Ljud"],
  "16 - sparlågan (grovlektionssal)": ["Papper och penna", "Projektor", "Ljud"],
  "22 - branden": ["Papper och penna", "Projektor", "Ljud"],
  "23 - glöden": ["Papper och penna", "Projektor", "Ljud"],
  "11 gasolcontainer": ["Remställ - beställ luftflaskor separat", "Luftflaska - beställ remställ separat", "Värmekamera", "Rökdykarlampa", "Rakelradio - DMO", "Rakelradio - TMO", "Passivitetslarm"],
  "18 containersystem": ["Remställ - beställ luftflaskor separat", "Luftflaska - beställ remställ separat", "Värmekamera", "Rökdykarlampa", "Rakelradio - DMO", "Rakelradio - TMO", "Passivitetslarm"],
  "19 rökövningshus": ["Remställ - beställ luftflaskor separat", "Luftflaska - beställ remställ separat", "Värmekamera", "Rökdykarlampa", "Rakelradio - DMO", "Rakelradio - TMO", "Passivitetslarm"],
  "31 kallrökövningshus": ["Remställ - beställ luftflaskor separat", "Luftflaska - beställ remställ separat", "Värmekamera", "Rökdykarlampa", "Rakelradio - DMO", "Rakelradio - TMO", "Passivitetslarm"],
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
  },
  {
    id: "res-detail-remstall",
    name: "Remställ - beställ luftflaskor separat",
    category: "Tillval",
    notes: "Tillval för rökövningslokaler.",
    totalQuantity: 0
  },
  {
    id: "res-detail-luftflaska",
    name: "Luftflaska - beställ remställ separat",
    category: "Tillval",
    notes: "Tillval för rökövningslokaler.",
    totalQuantity: 0
  },
  {
    id: "res-detail-rokdykarlampa",
    name: "Rökdykarlampa",
    category: "Tillval",
    notes: "Tillval för rökövningslokaler.",
    totalQuantity: 0
  },
  {
    id: "res-detail-rakel-dmo",
    name: "Rakelradio - DMO",
    category: "Tillval",
    notes: "Tillval för rökövningslokaler.",
    totalQuantity: 0
  },
  {
    id: "res-detail-rakel-tmo",
    name: "Rakelradio - TMO",
    category: "Tillval",
    notes: "Tillval för rökövningslokaler.",
    totalQuantity: 0
  },
  {
    id: "res-detail-passivitetslarm",
    name: "Passivitetslarm",
    category: "Tillval",
    notes: "Tillval för rökövningslokaler.",
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
  myBookingsBtn: document.getElementById("myBookingsBtn"),
  myBookingsDropdown: document.getElementById("myBookingsDropdown"),
  exportBooking: document.getElementById("exportBooking"),
  resetBooking: document.getElementById("resetBooking"),
  addAgendaItem: document.getElementById("addAgendaItem")
};

const RESOURCE_ADMIN_EMAILS = new Set([
  "daniel.holmgren@uppsala.se",
  "marcus.thilander@uppsala.se"
]);

const REQUESTER_REQUIRED_FIELDS = [
  { name: "requesterName", label: "namn" },
  { name: "email", label: "mejladress" },
  { name: "phone", label: "telefonnummer" }
];

const state = {
  db: null,
  useRemote: false,
  resources: [],
  selectedResourceIds: new Set(),
  latestBooking: null,
  loadedTemplateId: null,
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

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DEV-VERKTYG – TA BORT INNAN SKARP DRIFTSATTNING            ║
 * ║  Simulerar Entra-inloggning via URL-parametrar.              ║
 * ║  Anvandning: ?testEmail=x@y.se&testName=Namn                 ║
 * ║  Ytterligare parametrar: testPhone, testRole, testDept        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
function applyTestProfileFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const testEmail = params.get("testEmail");
  if (!testEmail) {
    return;
  }

  window.__UTBBOKNING_ENTRA_PROFILE__ = {
    displayName: params.get("testName") || testEmail,
    mail: testEmail,
    telephoneNumber: params.get("testPhone") || "",
    jobTitle: params.get("testRole") || "",
    department: params.get("testDept") || ""
  };
  console.warn("[UtbBokning] ⚠️ DEV-LAGE: Testprofil aktiv via URL (?testEmail). Ta bort innan driftsattning.", testEmail);
}
// ═══ SLUT PA DEV-VERKTYG ═══

init().catch((error) => {
  console.error(error);
  setStatus("Initiering misslyckades. Öppna sidan igen eller kontrollera webbläsarstöd.");
});

async function init() {
  const hasBookingPage = Boolean(els.bookingForm);
  const hasResourcePage = Boolean(els.resourceForm || els.resourceLibrary);
  const hasBookingsPage = Boolean(document.getElementById("activeBookingsList"));

  if (!hasBookingPage && !hasResourcePage && !hasBookingsPage) {
    return;
  }

  if (hasBookingsPage) {
    applyTestProfileFromQuery();
    state.userProfile = resolveSignedInProfile();
    applySignedInProfile(state.userProfile);
    state.useRemote = await isRemoteApiAvailable();
    if (!state.useRemote) {
      await enableLocalFallback("Backend ej tillganglig. Kor i lokalt lage.");
    }
    state.resources = await listStoreItems(RESOURCE_STORE);
    await initBookingsPage();
    return;
  }

  bindEvents();

  if (hasBookingPage) {
    applyTestProfileFromQuery();
    state.userProfile = resolveSignedInProfile();
    applySignedInProfile(state.userProfile);
    applyRequesterFieldRequirements();
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

  // Populate defaultFor select and wire type toggle in add-resource form
  const resourceTypeSelect = document.querySelector('[name="resourceType"]');
  const defaultForGroup = document.getElementById("defaultForGroup");
  const defaultForSelect = document.querySelector('[name="defaultFor"]');
  if (resourceTypeSelect && defaultForGroup && defaultForSelect) {
    STATIC_LOCATIONS.forEach(loc => {
      const opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = loc;
      defaultForSelect.appendChild(opt);
    });
    resourceTypeSelect.addEventListener("change", () => {
      defaultForGroup.style.display = resourceTypeSelect.value === "default" ? "" : "none";
    });
  }

  const bookings = await listStoreItems(BOOKING_STORE);
  state.latestBooking = bookings.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0] || null;

  if (els.draftSummary) {
    renderDraftSummary();
  }

  updateExperienceDashboard();
  validateBookingTimeRange();
  validateAgendaTimeRanges();
  validateAgendaRequiredFields();
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
    validateBookingTimeRange();
    updateExperienceDashboard();
  });
  els.bookingForm?.addEventListener("change", () => {
    state.isDirty = true;
    refreshAgendaDateOptions();
    validateBookingTimeRange();
    updateExperienceDashboard();
  });
  els.resourceForm?.addEventListener("submit", handleResourceSubmit);
  els.myBookingsBtn?.addEventListener("click", handleMyBookingsToggle);
  document.addEventListener("click", handleMyBookingsOutsideClick);
  els.exportBooking?.addEventListener("click", handleExportBooking);
  els.resetBooking?.addEventListener("click", handleResetBooking);
  els.addAgendaItem?.addEventListener("click", () => addAgendaItem());
  els.agendaList?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action='remove-agenda']");
    if (action) {
      action.closest(".agenda-item")?.remove();
      state.isDirty = true;
      validateAgendaRequiredFields();
      updateExperienceDashboard();
      return;
    }

    const copyAction = event.target.closest("[data-action='copy-agenda']");
    if (copyAction) {
      const sourceItem = copyAction.closest(".agenda-item");
      if (sourceItem) {
        const snapshot = {
          date: sourceItem.querySelector('[data-field="date"]')?.value || "",
          time: composeMomentTimeValue(sourceItem),
          title: sourceItem.querySelector('[data-field="title"]')?.value || "",
          notes: sourceItem.querySelector('[data-field="notes"]')?.value || "",
          resources: readSelectedValues(sourceItem.querySelector('[data-field="resources"]')),
          locationDetails: readLocationDetailValues(sourceItem),
          instructor: (() => {
            const sel = sourceItem.querySelector('[data-field="instructor"]');
            if (sel?.value === "__custom__") return sourceItem.querySelector('[data-field="instructorCustom"]')?.value || "";
            return sel?.value || "";
          })()
        };
        addAgendaItem(snapshot);
        // Scroll new item into view
        els.agendaList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        state.isDirty = true;
        validateAgendaRequiredFields();
        updateExperienceDashboard();
      }
      return;
    }
  });
  els.agendaList?.addEventListener("change", (event) => {
    const select = event.target;

    if (select instanceof HTMLSelectElement && (select.getAttribute("data-field") === "timeStart" || select.getAttribute("data-field") === "timeEnd")) {
      const agendaItem = select.closest(".agenda-item");
      if (agendaItem) {
        validateAgendaItemTimeRange(agendaItem);
        validateAgendaRequiredFields();
      }
      state.isDirty = true;
      updateExperienceDashboard();
      return;
    }

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
      validateAgendaRequiredFields();
      state.isDirty = true;
      updateExperienceDashboard();
    }
  });
  els.agendaList?.addEventListener("input", () => {
    state.isDirty = true;
    validateAgendaTimeRanges();
    validateAgendaRequiredFields();
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
      applyRequesterFieldRequirements();
    });
  }
}

function applyRequesterFieldRequirements() {
  if (!els.bookingForm) {
    return;
  }

  const isOnBehalf = Boolean(document.getElementById("bookingOnBehalf")?.checked);
  REQUESTER_REQUIRED_FIELDS.forEach(({ name }) => {
    const field = els.bookingForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement) {
      field.required = isOnBehalf;
      field.setCustomValidity("");
      field.classList.remove("validation-invalid");
    }
  });
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
    if (els.myBookingsBtn) {
      els.myBookingsBtn.disabled = true;
      els.myBookingsBtn.title = "Ingen Entra-identitet hittad ännu.";
    }
    const resurserLink = document.getElementById("resurserLink");
    if (resurserLink) {
      resurserLink.hidden = true;
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
  if (els.myBookingsBtn) {
    els.myBookingsBtn.disabled = !Boolean(profile.email);
    els.myBookingsBtn.title = profile.email ? "" : "Ingen Entra-identitet hittad ännu.";
  }
  const resurserLink = document.getElementById("resurserLink");
  if (resurserLink) {
    resurserLink.hidden = !RESOURCE_ADMIN_EMAILS.has((profile.email || "").toLowerCase());
  }
  const bookingsLink = document.getElementById("bookingsLink");
  if (bookingsLink) {
    bookingsLink.hidden = !RESOURCE_ADMIN_EMAILS.has((profile.email || "").toLowerCase());
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

  const resourceType = formData.get("resourceType") || "searchable";
  const defaultFor = resourceType === "default"
    ? formData.getAll("defaultFor").filter(v => v)
    : [];

  const resource = {
    id: `res-${Date.now()}`,
    name,
    notes: String(formData.get("notes") || "").trim(),
    totalQuantity: Math.max(0, Number.parseInt(String(formData.get("totalQuantity") || "0"), 10) || 0),
    defaultFor
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

  applyRequesterFieldRequirements();
  if (!els.bookingForm?.reportValidity()) {
    setStatus("⚠️ Fyll i alla obligatoriska bokningsfält.");
    return;
  }

  const requesterValidation = validateRequesterFields();
  if (!requesterValidation.valid) {
    requesterValidation.firstField?.scrollIntoView({ behavior: "smooth", block: "center" });
    requesterValidation.firstField?.focus();
    setStatus(requesterValidation.message);
    return;
  }

  const agendaValidation = validateAgendaRequiredFields();
  if (!agendaValidation.valid) {
    agendaValidation.firstInvalidElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    setStatus(agendaValidation.message);
    return;
  }

  const bookingTimeInvalid = validateBookingTimeRange();
  const invalidAgendaItems = validateAgendaTimeRanges();
  if (bookingTimeInvalid || invalidAgendaItems.length > 0) {
    if (bookingTimeInvalid) {
      els.bookingForm?.elements.namedItem("endTime")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setStatus("⚠️ Starttid maste vara fore sluttid for bokningen.");
      return;
    }

    invalidAgendaItems[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setStatus(`⚠️ Starttid maste vara fore sluttid i ${invalidAgendaItems.length} moment.`);
    return;
  }

  // Check for visible stock warnings
  const warnings = els.bookingForm?.querySelectorAll(".qty-warning") || [];
  const activeWarnings = Array.from(warnings).filter(w => w.style.display !== "none");
  if (activeWarnings.length > 0) {
    const names = activeWarnings.map(w => {
      const input = w.closest(".location-detail-option")?.querySelector("[data-location-detail-qty]");
      return input?.getAttribute("data-location-detail-qty") || "okkänd resurs";
    });
    setStatus(`⚠️ Åtgärda lagerkonflikter först: ${names.join(", ")}`);
    // Flash the warnings and scroll to first one
    const firstWarning = activeWarnings[0];
    firstWarning.closest(".agenda-item")?.scrollIntoView({ behavior: "smooth", block: "center" });
    activeWarnings.forEach(w => {
      w.style.transition = "opacity 0.1s";
      w.style.opacity = "0.3";
      setTimeout(() => { w.style.opacity = "1"; }, 150);
      setTimeout(() => { w.style.opacity = "0.3"; }, 300);
      setTimeout(() => { w.style.opacity = "1"; }, 450);
    });
    return;
  }

  validateAgendaRequiredFields();
  await persistDraft("manual");
}

function handleMyBookingsToggle() {
  const dropdown = els.myBookingsDropdown;
  if (!dropdown) {
    return;
  }

  if (!dropdown.hidden) {
    dropdown.hidden = true;
    return;
  }

  renderMyBookingsDropdown();
  dropdown.hidden = false;
}

function handleMyBookingsOutsideClick(event) {
  if (!els.myBookingsDropdown || els.myBookingsDropdown.hidden) {
    return;
  }

  if (!els.myBookingsBtn?.contains(event.target) && !els.myBookingsDropdown.contains(event.target)) {
    els.myBookingsDropdown.hidden = true;
  }
}

async function renderMyBookingsDropdown() {
  const dropdown = els.myBookingsDropdown;
  if (!dropdown) {
    return;
  }

  dropdown.innerHTML = '<li class="my-bookings-item my-bookings-loading">Laddar...</li>';

  const myEmail = state.userProfile?.email || "";
  let bookings = [];
  try {
    bookings = await listStoreItems(BOOKING_STORE);
  } catch (_) {
    dropdown.innerHTML = '<li class="my-bookings-item my-bookings-empty">Kunde inte hämta bokningar.</li>';
    return;
  }

  const mine = bookings
    .filter((b) => b.submittedByEmail && b.submittedByEmail === myEmail)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  if (mine.length === 0) {
    dropdown.innerHTML = '<li class="my-bookings-item my-bookings-empty">Du har inga tidigare beställningar än.</li>';
    return;
  }

  dropdown.innerHTML = "";
  mine.forEach((booking) => {
    const li = document.createElement("li");
    li.className = "my-bookings-item";
    const title = escapeHtml(booking.title || "Utan rubrik");
    const date = escapeHtml(booking.startDate || "");
    li.innerHTML = `<span class="my-bookings-title">${title}</span>${date ? `<span class="my-bookings-date">${date}</span>` : ""}`;
    li.addEventListener("click", () => {
      dropdown.hidden = true;
      hydrateFormAsTemplate(booking);
    });
    dropdown.appendChild(li);
  });
}

function hydrateFormAsTemplate(booking) {
  state.loadedTemplateId = booking.id;
  hydrateForm(booking);
  applySignedInProfile(state.userProfile);
  setStatus(`Mall laddad: "${booking.title || "Utan rubrik"}". Ändra och skicka för att skapa en ny beställning.`);
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
  if (source !== "autosave") {
    draft.status = "confirmed";
  }
  try {
    await putStoreItem(BOOKING_STORE, draft);
  } catch (error) {
    if (error?.status === 409 && Array.isArray(error?.payload?.conflicts)) {
      setStatus(formatInventoryConflictMessage(error.payload.conflicts));
      return;
    }

    throw error;
  }

  state.latestBooking = draft;
  state.loadedTemplateId = null;
  state.isDirty = false;
  renderDraftSummary();
  updateExperienceDashboard();

  if (source === "autosave") {
    setStatus(`Autosparat ${formatTimestamp(draft.updatedAt)}.`);
    return;
  }

  setStatus(`✅ Bokning skickad ${formatTimestamp(draft.updatedAt)}.`);
  showBookingSuccessModal(draft.title);
}

function showBookingSuccessModal(title) {
  const existing = document.getElementById("bookingSuccessModal");
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement("div");
  overlay.id = "bookingSuccessModal";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-icon">✅</div>
      <h2 id="modalTitle" class="modal-title">Bokning skickad</h2>
      ${title ? `<p class="modal-subtitle">${escapeHtml(title)}</p>` : ""}
      <button type="button" class="modal-ok" id="modalOkBtn">OK</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById("modalOkBtn").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape" || e.key === "Enter") {
      close();
      document.removeEventListener("keydown", onKey);
    }
  });
  document.getElementById("modalOkBtn").focus();
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
    applyRequesterFieldRequirements();
    validateBookingTimeRange();
    validateAgendaTimeRanges();
    validateAgendaRequiredFields();
    updateExperienceDashboard();
    setStatus(`Formularet ar tomt. Resurser finns kvar i ${state.useRemote ? "backend" : "lokal databas"}.`);
  }, 0);
}

function buildBookingDraft() {
  const formData = new FormData(els.bookingForm);
  const resourceIds = Array.from(state.selectedResourceIds);
  const selectedResources = state.resources.filter((item) => resourceIds.includes(item.id));
  const requesterName = String(formData.get("requesterName") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const endDate = String(formData.get("endDate") || "").trim() || startDate;

  const onBehalfCheckbox = document.getElementById("bookingOnBehalf");
  const isOnBehalf = onBehalfCheckbox?.checked || false;

  return {
    id: state.loadedTemplateId ? `booking-${Date.now()}` : (state.latestBooking?.id || `booking-${Date.now()}`),
    submittedBy: isOnBehalf ? (state.userProfile?.requesterName || "") : "",
    submittedByEmail: state.userProfile?.email || "",
    isOnBehalf,
    requesterName,
    department: String(formData.get("department") || "").trim(),
    contactRole: String(formData.get("contactRole") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    // Keep legacy purpose populated for old payload consumers, using description as source of truth.
    purpose: String(formData.get("purpose") || description).trim(),
    startDate,
    endDate,
    startTime: String(formData.get("startTime") || "").trim(),
    endTime: String(formData.get("endTime") || "").trim(),
    participantCount: String(formData.get("participantCount") || "").trim(),
    description,
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

  applyRequesterFieldRequirements();
  validateBookingTimeRange();
  validateAgendaTimeRanges();
  validateAgendaRequiredFields();
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
  validateAgendaItemTimeRange(template);
  validateAgendaRequiredFields();
  template.classList.add("new-item");
  window.setTimeout(() => template.classList.remove("new-item"), 350);
  updateExperienceDashboard();
}

function setFieldInvalidState(field, invalid) {
  if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement) && !(field instanceof HTMLTextAreaElement)) {
    return;
  }

  field.classList.toggle("validation-invalid", Boolean(invalid));
}

function ensureAgendaGeneralWarningElement() {
  if (!els.agendaList) {
    return null;
  }

  let warning = els.agendaList.parentElement?.querySelector('[data-field="agendaGeneralWarning"]');
  if (warning) {
    return warning;
  }

  warning = document.createElement("small");
  warning.className = "time-warning";
  warning.setAttribute("data-field", "agendaGeneralWarning");
  warning.style.display = "none";
  els.agendaList.parentElement?.appendChild(warning);
  return warning;
}

function ensureAgendaLocationWarningElement(agendaItem) {
  const resourceSelect = agendaItem?.querySelector('[data-field="resources"]');
  const label = resourceSelect?.closest("label");
  if (!label) {
    return null;
  }

  let warning = label.querySelector('[data-field="momentLocationWarning"]');
  if (warning) {
    return warning;
  }

  warning = document.createElement("small");
  warning.className = "time-warning";
  warning.setAttribute("data-field", "momentLocationWarning");
  warning.style.display = "none";
  label.appendChild(warning);
  return warning;
}

function isAgendaItemActive(agendaItem) {
  const date = String(agendaItem?.querySelector('[data-field="date"]')?.value || "").trim();
  const timeStart = String(agendaItem?.querySelector('[data-field="timeStart"]')?.value || "").trim();
  const timeEnd = String(agendaItem?.querySelector('[data-field="timeEnd"]')?.value || "").trim();
  const title = String(agendaItem?.querySelector('[data-field="title"]')?.value || "").trim();
  const notes = String(agendaItem?.querySelector('[data-field="notes"]')?.value || "").trim();
  const instructorSelect = agendaItem?.querySelector('[data-field="instructor"]');
  const instructorCustom = String(agendaItem?.querySelector('[data-field="instructorCustom"]')?.value || "").trim();
  const instructor = instructorSelect?.value === "__custom__" ? instructorCustom : String(instructorSelect?.value || "").trim();
  const location = readSelectedValues(agendaItem?.querySelector('[data-field="resources"]'));
  const details = readLocationDetailValues(agendaItem);

  return Boolean(date || timeStart || timeEnd || title || notes || instructor || location.length > 0 || details.length > 0);
}

function validateRequesterFields() {
  if (!els.bookingForm) {
    return { valid: true, message: "", firstField: null };
  }

  const isOnBehalf = Boolean(document.getElementById("bookingOnBehalf")?.checked);
  if (isOnBehalf) {
    const missing = [];
    REQUESTER_REQUIRED_FIELDS.forEach(({ name, label }) => {
      const field = els.bookingForm.elements.namedItem(name);
      if (!(field instanceof HTMLInputElement)) {
        return;
      }

      const value = String(field.value || "").trim();
      const isMissing = !value;
      setFieldInvalidState(field, isMissing);
      if (isMissing) {
        missing.push({ field, label });
      }
    });

    if (missing.length === 0) {
      return { valid: true, message: "", firstField: null };
    }

    return {
      valid: false,
      message: `⚠️ Fyll i beställaruppgifter: ${missing.map((entry) => entry.label).join(", ")}.`,
      firstField: missing[0].field
    };
  }

  const nameField = els.bookingForm.elements.namedItem("requesterName");
  const emailField = els.bookingForm.elements.namedItem("email");
  const nameMissing = !(nameField instanceof HTMLInputElement) || !String(nameField.value || "").trim();
  const emailMissing = !(emailField instanceof HTMLInputElement) || !String(emailField.value || "").trim();

  REQUESTER_REQUIRED_FIELDS.forEach(({ name }) => {
    const field = els.bookingForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement) {
      setFieldInvalidState(field, false);
    }
  });

  if (!nameMissing && !emailMissing) {
    return { valid: true, message: "", firstField: null };
  }

  if (nameField instanceof HTMLInputElement) {
    setFieldInvalidState(nameField, nameMissing);
  }
  if (emailField instanceof HTMLInputElement) {
    setFieldInvalidState(emailField, emailMissing);
  }

  return {
    valid: false,
    message: "⚠️ Entra-uppgifter saknas (namn eller mejladress). Kryssa i \"Jag bokar åt någon annan\" och fyll i manuellt.",
    firstField: nameMissing && nameField instanceof HTMLInputElement
      ? nameField
      : (emailField instanceof HTMLInputElement ? emailField : null)
  };
}

function validateAgendaRequiredFields() {
  if (!els.agendaList) {
    return { valid: true, message: "", firstInvalidElement: null };
  }

  const allItems = Array.from(els.agendaList.querySelectorAll(".agenda-item"));
  const activeItems = allItems.filter((item) => isAgendaItemActive(item));
  const generalWarning = ensureAgendaGeneralWarningElement();

  if (activeItems.length === 0) {
    if (generalWarning) {
      generalWarning.textContent = "Lägg till minst ett moment i schemat.";
      generalWarning.style.display = "";
    }
    return {
      valid: false,
      message: "⚠️ Lägg till minst ett moment i schemat innan du skickar.",
      firstInvalidElement: els.agendaList
    };
  }

  if (generalWarning) {
    generalWarning.style.display = "none";
    generalWarning.textContent = "";
  }

  const missingLocationItems = [];
  allItems.forEach((item) => {
    const resourceSelect = item.querySelector('[data-field="resources"]');
    if (!(resourceSelect instanceof HTMLSelectElement)) {
      return;
    }

    if (!isAgendaItemActive(item)) {
      setFieldInvalidState(resourceSelect, false);
      const warning = ensureAgendaLocationWarningElement(item);
      if (warning) {
        warning.style.display = "none";
        warning.textContent = "";
      }
      return;
    }

    const hasLocation = readSelectedValues(resourceSelect).length > 0;
    setFieldInvalidState(resourceSelect, !hasLocation);

    const warning = ensureAgendaLocationWarningElement(item);
    if (warning) {
      if (!hasLocation) {
        warning.textContent = "Välj lokal för momentet.";
        warning.style.display = "";
      } else {
        warning.style.display = "none";
        warning.textContent = "";
      }
    }

    if (!hasLocation) {
      missingLocationItems.push(item);
    }
  });

  if (missingLocationItems.length > 0) {
    return {
      valid: false,
      message: `⚠️ Välj lokal i ${missingLocationItems.length} moment innan du skickar.`,
      firstInvalidElement: missingLocationItems[0]
    };
  }

  return { valid: true, message: "", firstInvalidElement: null };
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

function parseClockMinutes(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const parts = raw.split(":");
  if (parts.length !== 2) {
    return null;
  }

  const hours = Number.parseInt(parts[0], 10);
  const minutes = Number.parseInt(parts[1], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function isInvalidTimeRange(startValue, endValue) {
  if (!startValue || !endValue) {
    return false;
  }

  const startMinutes = parseClockMinutes(startValue);
  const endMinutes = parseClockMinutes(endValue);
  if (startMinutes === null || endMinutes === null) {
    return false;
  }

  return startMinutes >= endMinutes;
}

function setTimeFieldInvalidState(field, invalid) {
  if (!(field instanceof HTMLSelectElement) && !(field instanceof HTMLInputElement)) {
    return;
  }

  setFieldInvalidState(field, invalid);
  field.classList.toggle("time-range-invalid", Boolean(invalid));
}

function ensureBookingTimeWarningElement() {
  if (!els.bookingForm) {
    return null;
  }

  const endField = els.bookingForm.elements.namedItem("endTime");
  const endLabel = endField?.closest("label");
  if (!endLabel) {
    return null;
  }

  let warning = endLabel.querySelector('[data-field="bookingTimeWarning"]');
  if (warning) {
    return warning;
  }

  warning = document.createElement("small");
  warning.className = "time-warning";
  warning.setAttribute("data-field", "bookingTimeWarning");
  warning.style.display = "none";
  endLabel.appendChild(warning);
  return warning;
}

function ensureAgendaTimeWarningElement(agendaItem) {
  const timeWrap = agendaItem?.querySelector(".moment-time-range");
  if (!timeWrap) {
    return null;
  }

  const label = timeWrap.closest("label");
  if (!label) {
    return null;
  }

  let warning = label.querySelector('[data-field="momentTimeWarning"]');
  if (warning) {
    return warning;
  }

  warning = document.createElement("small");
  warning.className = "time-warning";
  warning.setAttribute("data-field", "momentTimeWarning");
  warning.style.display = "none";
  label.appendChild(warning);
  return warning;
}

function validateBookingTimeRange() {
  if (!els.bookingForm) {
    return false;
  }

  const startField = els.bookingForm.elements.namedItem("startTime");
  const endField = els.bookingForm.elements.namedItem("endTime");
  const start = String(startField?.value || "").trim();
  const end = String(endField?.value || "").trim();
  const invalid = isInvalidTimeRange(start, end);

  setTimeFieldInvalidState(startField, invalid);
  setTimeFieldInvalidState(endField, invalid);

  const warning = ensureBookingTimeWarningElement();
  if (warning) {
    if (invalid) {
      warning.textContent = "Starttid maste vara tidigare an sluttid.";
      warning.style.display = "";
    } else {
      warning.style.display = "none";
      warning.textContent = "";
    }
  }

  return invalid;
}

function validateAgendaItemTimeRange(agendaItem) {
  const startField = agendaItem?.querySelector('[data-field="timeStart"]');
  const endField = agendaItem?.querySelector('[data-field="timeEnd"]');
  const start = String(startField?.value || "").trim();
  const end = String(endField?.value || "").trim();
  const invalid = isInvalidTimeRange(start, end);

  setTimeFieldInvalidState(startField, invalid);
  setTimeFieldInvalidState(endField, invalid);

  const warning = ensureAgendaTimeWarningElement(agendaItem);
  if (warning) {
    if (invalid) {
      warning.textContent = "Starttid maste vara tidigare an sluttid for momentet.";
      warning.style.display = "";
    } else {
      warning.style.display = "none";
      warning.textContent = "";
    }
  }

  return invalid;
}

function validateAgendaTimeRanges() {
  if (!els.agendaList) {
    return [];
  }

  return Array.from(els.agendaList.querySelectorAll(".agenda-item")).filter((item) => validateAgendaItemTimeRange(item));
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

    const warning = document.createElement("span");
    warning.className = "qty-warning";
    warning.style.display = "none";

    const checkStock = () => {
      const resource = state.resources.find(r => r.name.toLowerCase() === optionValue.toLowerCase());
      const stock = resource ? Number(resource.totalQuantity ?? 0) : 0;
      const requested = Math.max(0, Number(quantity.value) || 0);
      if (stock > 0 && requested > stock) {
        warning.textContent = `Max ${stock} st (${stock} i lager för valt datum)`;
        warning.style.display = "";
        quantity.style.borderColor = "#e03131";
      } else if (stock === 0 && requested > 0) {
        warning.textContent = "Ej i lager för valt datum";
        warning.style.display = "";
        quantity.style.borderColor = "#e03131";
      } else {
        warning.style.display = "none";
        quantity.style.borderColor = "";
      }
    };
    quantity.addEventListener("input", checkStock);
    quantity.addEventListener("change", checkStock);

    const text = document.createElement("span");
    text.textContent = optionValue;

    row.appendChild(quantity);
    row.appendChild(text);
    row.appendChild(warning);
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
  // Check hardcoded map first
  if (MOMENT_LOCATION_DETAIL_OPTIONS[normalized]) {
    return MOMENT_LOCATION_DETAIL_OPTIONS[normalized];
  }
  // Check DB resources with defaultFor matching this location
  return state.resources
    .filter(r => {
      const arr = Array.isArray(r.defaultFor) ? r.defaultFor : (r.defaultFor ? [r.defaultFor] : []);
      return arr.some(l => l.toLowerCase() === normalized);
    })
    .map(r => r.name);
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
    const defaultForArr = Array.isArray(resource.defaultFor) ? resource.defaultFor : (resource.defaultFor ? [resource.defaultFor] : []);
    const defaultForLabel = defaultForArr.length
      ? `<span class="resource-tag" style="background:rgba(40,130,92,0.12);color:#2a6e4a">Standard: ${escapeHtml(defaultForArr.join(', '))}</span>`
      : `<span class="resource-tag">Sökbar</span>`;
    card.innerHTML = `
      <div class="resource-card-header">
        <h3>${escapeHtml(resource.name)}</h3>
        ${defaultForLabel}
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
      <div class="resource-edit-form" style="display:none">
        <div class="form-grid" style="gap:8px;margin-top:8px">
          <label><span>Namn</span><input type="text" class="edit-name" value="${escapeHtml(resource.name)}" /></label>
          <label><span>Beskrivning</span><textarea class="edit-notes" rows="2">${escapeHtml(resource.notes || '')}</textarea></label>
          <label><span>Typ</span>
            <select class="edit-type">
              <option value="searchable" ${!defaultForArr.length ? 'selected' : ''}>Sökbar resurs</option>
              <option value="default" ${defaultForArr.length ? 'selected' : ''}>Standardtillval för lokal</option>
            </select>
          </label>
          <div class="edit-defaultfor-group" style="display:${defaultForArr.length ? '' : 'none'}">
            <label><span>Standardtillval för lokaler (håll Ctrl för flera)</span>
              <select class="edit-defaultfor" multiple style="min-height:120px">
                ${STATIC_LOCATIONS.map(l => `<option value="${escapeHtml(l)}" ${defaultForArr.includes(l) ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}
              </select>
            </label>
          </div>
        </div>
        <div class="form-actions" style="margin-top:8px">
          <button type="button" class="secondary-button" data-resource-edit-save="${resource.id}">Spara ändringar</button>
          <button type="button" class="link-button" data-resource-edit-cancel="${resource.id}">Avbryt</button>
        </div>
      </div>
      <div class="resource-card-actions">
        <button type="button" class="link-button" style="color:var(--text-3)" data-resource-edit-toggle="${resource.id}">Redigera</button>
        <button type="button" class="link-button" style="color:var(--text-3)" data-resource-history="${resource.id}">Historik</button>
        <button type="button" class="link-button" data-resource-delete="${resource.id}">Ta bort</button>
      </div>
      <div class="resource-history" style="display:none"></div>
    `;

    // Type toggle inside edit form
    const typeSelect = card.querySelector(".edit-type");
    const defaultForGroup = card.querySelector(".edit-defaultfor-group");
    typeSelect?.addEventListener("change", () => {
      defaultForGroup.style.display = typeSelect.value === "default" ? "" : "none";
    });

    // Historik
    card.querySelector(`[data-resource-history="${resource.id}"]`)?.addEventListener("click", async () => {
      const historyDiv = card.querySelector(".resource-history");
      if (historyDiv.style.display !== "none") {
        historyDiv.style.display = "none";
        return;
      }
      historyDiv.innerHTML = '<p class="helper-text">Laddar...</p>';
      historyDiv.style.display = "";
      const entries = await getResourceHistory(resource.name);
      if (entries.length === 0) {
        historyDiv.innerHTML = '<p class="helper-text">Ingen bokningshistorik hittades.</p>';
        return;
      }
      historyDiv.innerHTML = `
        <div class="history-list">
          ${entries.map(e => `
            <div class="history-entry">
              <span class="history-date">${escapeHtml(e.date)}</span>
              <span>${escapeHtml(e.requester)}</span>
              ${e.title ? `<span class="helper-text">${escapeHtml(e.title)}</span>` : ''}
            </div>`).join('')}
        </div>`;
    });

    // Edit toggle
    card.querySelector(`[data-resource-edit-toggle="${resource.id}"]`)?.addEventListener("click", () => {
      const form = card.querySelector(".resource-edit-form");
      form.style.display = form.style.display === "none" ? "" : "none";
    });

    // Cancel
    card.querySelector(`[data-resource-edit-cancel="${resource.id}"]`)?.addEventListener("click", () => {
      card.querySelector(".resource-edit-form").style.display = "none";
    });

    // Save
    card.querySelector(`[data-resource-edit-save="${resource.id}"]`)?.addEventListener("click", async () => {
      const name = card.querySelector(".edit-name").value.trim();
      if (!name) return;
      const type = card.querySelector(".edit-type").value;
      const defaultFor = type === "default"
        ? Array.from(card.querySelector(".edit-defaultfor").selectedOptions).map(o => o.value).filter(Boolean)
        : [];
      const updated = {
        ...resource,
        name,
        notes: card.querySelector(".edit-notes").value.trim(),
        defaultFor
      };
      await putStoreItem(RESOURCE_STORE, updated);
      state.resources = await listStoreItems(RESOURCE_STORE);
      renderResourceLibrary();
      setStatus(`"${name}" uppdaterad.`);
    });

    els.resourceLibrary.appendChild(card);
  });
}

async function getResourceHistory(resourceName) {
  const bookings = await listStoreItems(BOOKING_STORE);
  const normalizedTarget = resourceName.toLowerCase();
  const hits = [];

  bookings.forEach(booking => {
    const agenda = Array.isArray(booking.agenda) ? booking.agenda : [];
    agenda.forEach(moment => {
      const details = normalizeLocationDetails(moment.locationDetails, moment.locationDetail);
      const used = details.find(d => d.name.toLowerCase() === normalizedTarget && d.quantity > 0);
      if (used) {
        hits.push({
          date: moment.date || booking.startDate || booking.updatedAt?.slice(0, 10) || "Datum okänt",
          requester: booking.requesterName || "Okänd beställare",
          title: booking.title || "",
          sortKey: moment.date || booking.startDate || booking.updatedAt || ""
        });
      }
    });
  });

  return hits
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, 3);
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
      const locationDetailRows = locationDetails
        .map((entry) => `<div class="summary-detail-row"><span>${escapeHtml(entry.name)}</span><span>${entry.quantity}</span></div>`)
        .join("");
      const dateLabel = item.date ? formatAgendaDate(item.date) : "Dag saknas";
      const lokal = (item.resources || []).join(", ");
      return `
        <div class="summary-moment">
          <div class="summary-row"><strong>Dag</strong><span>${escapeHtml(dateLabel)}</span></div>
          ${item.time ? `<div class="summary-row"><strong>Tid</strong><span>${escapeHtml(item.time)}</span></div>` : ""}
          <div class="summary-row"><strong>${escapeHtml(item.title || "Moment utan rubrik")}</strong><span>${escapeHtml(item.instructor || "Instruktör saknas")}</span></div>
          ${lokal ? `<div class="summary-row"><strong>Lokal</strong><span>${escapeHtml(lokal)}</span></div>` : ""}
          ${locationDetailRows ? `<div class="summary-row"><strong>Tillval</strong></div><div class="summary-detail-list">${locationDetailRows}</div>` : ""}
          ${item.notes ? `<div class="summary-row summary-row-notes"><strong>Notering</strong><span>${escapeHtml(item.notes)}</span></div>` : ""}
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
      ${draft.description ? `<p class="summary-description">${escapeHtml(draft.description)}</p>` : ""}
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
    Boolean(draft.description),
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

  if (!draft.title) {
    tips.push("Sätt en rubrik för bokningen för snabbare intern handläggning.");
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

// ─────────────────────────────────────────────────────────────
//  BOOKINGS PAGE (bookings.html)
// ─────────────────────────────────────────────────────────────

async function initBookingsPage() {
  const setBookingsStatus = (msg) => {
    const el = document.getElementById("bookingsStatus");
    if (el) el.textContent = msg;
  };

  setBookingsStatus("Laddar bokningar…");
  let all = [];
  try {
    all = await listStoreItems(BOOKING_STORE);
  } catch (err) {
    setBookingsStatus("Kunde inte hämta bokningar.");
    return;
  }

  setBookingsStatus(`${all.length} bokning${all.length !== 1 ? "ar" : ""} hämtade.`);
  renderBookingsPage(all);

  document.getElementById("detailModalClose")?.addEventListener("click", closeBookingDetailModal);
  document.getElementById("bookingDetailModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("bookingDetailModal")) closeBookingDetailModal();
  });
}

function renderBookingsPage(all) {
  const active = all
    .filter(b => b.status !== "archived")
    .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
  const archived = all
    .filter(b => b.status === "archived")
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

  renderBookingsList(document.getElementById("activeBookingsList"), active, false);
  renderBookingsList(document.getElementById("archivedBookingsList"), archived, true);
}

function renderBookingsList(container, bookings, isArchived) {
  if (!container) return;
  if (bookings.length === 0) {
    container.innerHTML = `<p class="helper-text">${isArchived ? "Inga arkiverade övningar." : "Inga aktiva bokningar."}</p>`;
    return;
  }
  container.innerHTML = "";
  bookings.forEach(b => {
    const card = document.createElement("article");
    card.className = "booking-card" + (isArchived ? " booking-card--archived" : "");

    const dateRange = composeDateRange(b);
    const participantCount = b.participantCount ? `${b.participantCount} deltagare` : "";
    const momentCount = Array.isArray(b.agenda) ? `${b.agenda.length} moment` : "";

    card.innerHTML = `
      <div class="booking-card-main">
        <div class="booking-card-title">${escapeHtml(b.title || "Utan rubrik")}</div>
        <div class="booking-card-meta">
          ${dateRange ? `<span>${escapeHtml(dateRange)}</span>` : ""}
          ${participantCount ? `<span>${escapeHtml(participantCount)}</span>` : ""}
          ${momentCount ? `<span>${escapeHtml(momentCount)}</span>` : ""}
          <span>${escapeHtml(b.requesterName || "Okänd beställare")}</span>
        </div>
      </div>
      <div class="booking-card-actions">
        ${!isArchived ? `
          <button type="button" class="secondary-button btn-archive" data-id="${escapeHtml(b.id)}">Avsluta</button>
          <button type="button" class="link-button btn-cancel" data-id="${escapeHtml(b.id)}">Cancelera</button>
        ` : ""}
      </div>
    `;

    card.querySelector(".booking-card-main").addEventListener("click", () => openBookingDetailModal(b, isArchived));

    card.querySelector(".btn-archive")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Avsluta bokningen "${b.title || "Utan rubrik"}"?\nÖvningen avslutas och resurserna frigörs. Bokningen flyttas till arkivet.`)) return;
      await updateBookingStatus(b.id, "archived");
    });

    card.querySelector(".btn-cancel")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Cancelera bokningen "${b.title || "Utan rubrik"}"?\nÖvningen blev aldrig av. Bokningen tas bort helt från systemet.`)) return;
      await deleteBooking(b.id);
    });

    container.appendChild(card);
  });
}

function openBookingDetailModal(b, isArchived) {
  const modal = document.getElementById("bookingDetailModal");
  const title = document.getElementById("detailModalTitle");
  const body = document.getElementById("detailModalBody");
  const actions = document.getElementById("detailModalActions");
  if (!modal || !body) return;

  title.textContent = b.title || "Utan rubrik";

  const agenda = (b.agenda || []).map(item => {
    const locationDetails = normalizeLocationDetails(item.locationDetails, item.locationDetail);
    const tillvalRows = locationDetails
      .map(e => `<div class="summary-detail-row"><span>${escapeHtml(e.name)}</span><span>${e.quantity}</span></div>`)
      .join("");
    return `
      <div class="summary-moment">
        <div class="summary-row"><strong>Dag</strong><span>${escapeHtml(item.date ? formatAgendaDate(item.date) : "Dag saknas")}</span></div>
        ${item.time ? `<div class="summary-row"><strong>Tid</strong><span>${escapeHtml(item.time)}</span></div>` : ""}
        <div class="summary-row"><strong>${escapeHtml(item.title || "Moment utan rubrik")}</strong><span>${escapeHtml(item.instructor || "")}</span></div>
        ${(item.resources || []).length ? `<div class="summary-row"><strong>Lokal</strong><span>${escapeHtml(item.resources.join(", "))}</span></div>` : ""}
        ${tillvalRows ? `<div class="summary-row"><strong>Tillval</strong></div><div class="summary-detail-list">${tillvalRows}</div>` : ""}
        ${item.notes ? `<div class="summary-row summary-row-notes"><strong>Notering</strong><span>${escapeHtml(item.notes)}</span></div>` : ""}
      </div>`;
  }).join("");

  body.innerHTML = `
    <article class="summary-card">
      <h3>${escapeHtml(b.title || "Utan rubrik")}</h3>
      <p>${escapeHtml(b.requesterName || "Beställare saknas")}</p>
      ${b.isOnBehalf && b.submittedBy ? `<p class="helper-text">Skickat av: ${escapeHtml(b.submittedBy)}</p>` : ""}
      <p>${escapeHtml(composeDateRange(b))}</p>
      ${b.department ? `<p>${escapeHtml(b.department)}</p>` : ""}
      ${b.contactRole ? `<p>${escapeHtml(b.contactRole)}</p>` : ""}
      ${b.email ? `<p>${escapeHtml(b.email)}</p>` : ""}
      ${b.phone ? `<p>${escapeHtml(b.phone)}</p>` : ""}
      ${b.participantCount ? `<p>${escapeHtml(b.participantCount)} deltagare</p>` : ""}
      ${b.description ? `<p class="summary-description">${escapeHtml(b.description)}</p>` : ""}
      <div>
        <strong>Planerade moment</strong>
        <div class="summary-list">${agenda || '<p class="helper-text">Inga moment.</p>'}</div>
      </div>
    </article>
  `;

  actions.innerHTML = "";
  if (!isArchived) {
    const archiveBtn = document.createElement("button");
    archiveBtn.type = "button";
    archiveBtn.className = "secondary-button";
    archiveBtn.textContent = "Avsluta övning";
    archiveBtn.addEventListener("click", async () => {
      if (!confirm(`Avsluta "${b.title || "Utan rubrik"}"? Bokningen arkiveras och resurserna frigörs.`)) return;
      closeBookingDetailModal();
      await updateBookingStatus(b.id, "archived");
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "link-button";
    cancelBtn.textContent = "Cancelera övning";
    cancelBtn.addEventListener("click", async () => {
      if (!confirm(`Cancelera "${b.title || "Utan rubrik"}"? Bokningen tas bort helt.`)) return;
      closeBookingDetailModal();
      await deleteBooking(b.id);
    });

    actions.appendChild(archiveBtn);
    actions.appendChild(cancelBtn);
  }

  modal.hidden = false;
  document.getElementById("detailModalClose")?.focus();
}

function closeBookingDetailModal() {
  const modal = document.getElementById("bookingDetailModal");
  if (modal) modal.hidden = true;
}

async function updateBookingStatus(id, status) {
  try {
    if (state.useRemote) {
      await apiRequest({ entity: "booking", method: "PATCH", body: { id, status } });
    } else {
      const all = await listStoreItems(BOOKING_STORE);
      const booking = all.find(b => b.id === id);
      if (booking) {
        await putStoreItem(BOOKING_STORE, { ...booking, status, updatedAt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error("updateBookingStatus failed:", err);
  }
  const all = await listStoreItems(BOOKING_STORE);
  renderBookingsPage(all);
}

async function deleteBooking(id) {
  try {
    if (state.useRemote) {
      await apiRequest({ entity: "booking", method: "DELETE", query: { id } });
    } else {
      await deleteStoreItem(BOOKING_STORE, id);
    }
  } catch (err) {
    console.error("deleteBooking failed:", err);
  }
  const all = await listStoreItems(BOOKING_STORE);
  renderBookingsPage(all);
}

