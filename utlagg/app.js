// Initialisering
const addExpenseBtn = document.getElementById('addExpenseBtn');
const expenseModal = document.getElementById('expenseModal');
const detailsModal = document.getElementById('detailsModal');
const expenseList = document.getElementById('expenseList');

const expenseDate = document.getElementById('expenseDate');
const expenseStore = document.getElementById('expenseStore');
const expenseAmount = document.getElementById('expenseAmount');
const expenseDescription = document.getElementById('expenseDescription');
const receiptImage = document.getElementById('receiptImage');
const imagePreview = document.getElementById('imagePreview');

const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');

// Kamera-element
const cameraBtn = document.getElementById('cameraBtn');
const scanReceiptBtn = document.getElementById('scanReceiptBtn');
const ocrStatus = document.getElementById('ocrStatus');
const cameraContainer = document.getElementById('cameraContainer');
const cameraFeed = document.getElementById('cameraFeed');
const photoCanvas = document.getElementById('photoCanvas');
const captureBtn = document.getElementById('captureBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');

let expenses = [];
let selectedImageData = null;
let cameraStream = null;
let lastRecognizedText = '';

// Läs in sparade utlägg från localStorage
function loadExpenses() {
    const stored = localStorage.getItem('expenses');
    expenses = stored ? JSON.parse(stored) : [];
    renderExpenses();
    updateStats();
}

// Spara utlägg till localStorage
function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    updateStats();
}

// Uppdatera statistik
function updateStats() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const count = expenses.length;
    
    document.getElementById('totalExpenses').textContent = `Totalt: ${total.toFixed(2)} kr`;
    document.getElementById('expenseCount').textContent = `Antalet: ${count}`;
}

// Render listan
function renderExpenses() {
    if (expenses.length === 0) {
        expenseList.innerHTML = '<p class="empty-message">Inga utlägg ännu</p>';
        return;
    }

    expenseList.innerHTML = expenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(exp => `
            <div class="expense-card" onclick="showDetails('${exp.id}')">
                <div class="expense-card-header">
                    <span class="expense-date">${formatDate(exp.date)}</span>
                    <span class="expense-amount">${exp.amount.toFixed(2)} kr</span>
                </div>
                <div class="expense-store">${exp.store}</div>
                ${exp.description ? `<div class="expense-description">${exp.description}</div>` : ''}
                <div class="expense-card-footer">
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); editExpense('${exp.id}')">Redigera</button>
                    <button class="btn btn-danger" onclick="event.stopPropagation(); deleteExpense('${exp.id}')">Radera</button>
                </div>
            </div>
        `)
        .join('');
}

// Formatera datum
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE');
}

function normalizeText(text) {
    return text.replace(/\r/g, ' ').replace(/\n+/g, '\n').trim();
}

function parseReceiptDate(line) {
    const monthNames = {
        jan: '01', feb: '02', mar: '03', apr: '04', maj: '05', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', okt: '10', oct: '10', nov: '11', dec: '12'
    };

    let match = line.match(/\b(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})\b/);
    if (match) {
        const [_, year, month, day] = match;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    match = line.match(/\b(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{2,4})\b/);
    if (match) {
        let [_, day, month, year] = match;
        if (year.length === 2) {
            year = `20${year}`;
        }
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    match = line.match(new RegExp(`\b(\d{1,2})\s+(${Object.keys(monthNames).join('|')})\s+(\d{4})\b`, 'i'));
    if (match) {
        const [_, day, monthName, year] = match;
        const month = monthNames[monthName.toLowerCase()];
        return `${year}-${month}-${String(day).padStart(2, '0')}`;
    }

    return '';
}

function parseReceiptText(text) {
    const lines = normalizeText(text).split('\n').map(line => line.trim()).filter(Boolean);
    let store = '';
    let date = '';
    let amount = '';

    const skipHeader = line => {
        return /\b(kvitto|receipt|org\.?nr|orgnr|org\s*nr|telefon|tel|faktnr|faktura|invoice|summa|totalt|total|moms|betalt|kontant|kort|retur|betalningssätt|payment|adress)\b/i.test(line);
    };

    const candidateStoreLines = lines.filter(line => {
        return !skipHeader(line) && !/^\d[\d\s.,:-]*$/.test(line) && line.length > 2;
    });

    if (candidateStoreLines.length) {
        store = candidateStoreLines[0];
    }

    for (const line of lines) {
        if (!date) {
            const parsed = parseReceiptDate(line);
            if (parsed) {
                date = parsed;
            }
        }

        if (!amount) {
            const amountMatch = line.match(/(?:summa|totalt|total|belopp|att betala|kr|betala)\s*[:\-]?\s*([0-9]+[.,][0-9]{2})/i);
            if (amountMatch) {
                amount = amountMatch[1].replace(',', '.');
            }
        }
    }

    if (!amount) {
        const amountMatches = Array.from(text.matchAll(/\b([0-9]+[.,][0-9]{2})\b/g)).map(m => m[1].replace(',', '.'));
        if (amountMatches.length) {
            amount = amountMatches[amountMatches.length - 1];
        }
    }

    if (!store) {
        for (const line of lines) {
            if (!skipHeader(line) && !parseReceiptDate(line) && !/\b([0-9]+[.,][0-9]{2})\b/.test(line)) {
                store = line;
                break;
            }
        }
    }

    if (!store && lines.length) {
        store = lines[0];
    }

    return { store, date, amount };
}

async function recognizeReceipt(imageData) {
    if (!imageData) {
        throw new Error('Ingen bild vald');
    }

    setOcrStatus('Scanning kvitto...', 'scanning');
    const result = await Tesseract.recognize(imageData, 'swe', {
        logger: m => {
            if (m.status === 'recognizing text') {
                setOcrStatus(`Skannar... ${Math.round(m.progress * 100)}%`, 'scanning');
            }
        }
    });

    lastRecognizedText = result.data.text;
    const parsed = parseReceiptText(lastRecognizedText);
    setOcrStatus('Skanning klar', 'success');
    return parsed;
}

function setOcrStatus(message, statusClass = '') {
    ocrStatus.textContent = message;
    ocrStatus.className = 'ocr-status';
    if (statusClass) ocrStatus.classList.add(statusClass);
}

// Generera ID
function generateId() {
    return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Lägg till utlägg - öppna modal
addExpenseBtn.addEventListener('click', () => {
    resetForm();
    expenseModal.style.display = 'block';
});

// Stäng modaler
document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraContainer.style.display = 'none';
        e.target.closest('.modal').style.display = 'none';
    });
});

cancelBtn.addEventListener('click', () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraContainer.style.display = 'none';
    expenseModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === expenseModal) {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraContainer.style.display = 'none';
        expenseModal.style.display = 'none';
    }
    if (e.target === detailsModal) detailsModal.style.display = 'none';
});

// Bildval
receiptImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            selectedImageData = event.target.result;
            imagePreview.innerHTML = `<img src="${selectedImageData}" alt="Preview">`;
            setOcrStatus('Bild vald. Klicka på Skanna kvitto för att autofylla.', '');
        };
        reader.readAsDataURL(file);
    }
});

scanReceiptBtn.addEventListener('click', async () => {
    if (!selectedImageData) {
        alert('Välj en kvittobild först.');
        return;
    }

    try {
        const parsed = await recognizeReceipt(selectedImageData);
        if (parsed.store) expenseStore.value = parsed.store;
        if (parsed.date) expenseDate.value = parsed.date;
        if (parsed.amount) expenseAmount.value = parseFloat(parsed.amount);
        if (!parsed.store && !parsed.date && !parsed.amount) {
            setOcrStatus('Kunde inte hitta affär, datum eller belopp. Kontrollera bilden.', 'error');
        }
    } catch (err) {
        console.error('OCR-fel:', err);
        setOcrStatus('OCR misslyckades: ' + err.message, 'error');
    }
});

// Kamera - öppna
cameraBtn.addEventListener('click', async () => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        
        cameraFeed.srcObject = cameraStream;
        cameraContainer.style.display = 'flex';
    } catch (err) {
        console.error('Kameraåtkomst nekad:', err);
        alert('Kunde inte öppna kamera. Kontrollera behörigheter och försök igen.');
    }
});

// Kamera - ta foto
captureBtn.addEventListener('click', () => {
    if (!cameraStream) return;

    // Ställ canvas till samma storlek som video
    photoCanvas.width = cameraFeed.videoWidth;
    photoCanvas.height = cameraFeed.videoHeight;

    // Rita video frame till canvas
    const ctx = photoCanvas.getContext('2d');
    ctx.drawImage(cameraFeed, 0, 0);

    // Konvertera canvas till base64
    selectedImageData = photoCanvas.toDataURL('image/jpeg', 0.9);
    imagePreview.innerHTML = `<img src="${selectedImageData}" alt="Taget foto">`;
    setOcrStatus('Bild tagen. Klicka på Skanna kvitto för att autofylla.');

    // Stäng kamera
    closeCameraBtn.click();
});

// Kamera - stäng
closeCameraBtn.addEventListener('click', () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraContainer.style.display = 'none';
});

// Sätt dagens datum som default
expenseDate.valueAsDate = new Date();

// Spara nytt utlägg
saveBtn.addEventListener('click', () => {
    const date = expenseDate.value;
    const store = expenseStore.value.trim();
    const amount = parseFloat(expenseAmount.value);
    const description = expenseDescription.value.trim();

    if (!date || !store || !amount || !selectedImageData) {
        alert('Vänligen fyll i alla obligatoriska fält och välj en bild!');
        return;
    }

    const newExpense = {
        id: generateId(),
        date,
        store,
        amount,
        description,
        image: selectedImageData,
        createdAt: new Date().toISOString()
    };

    expenses.push(newExpense);
    saveExpenses();
    renderExpenses();
    
    expenseModal.style.display = 'none';
    resetForm();
});

// Rensa formulär
function resetForm() {
    expenseDate.valueAsDate = new Date();
    expenseStore.value = '';
    expenseAmount.value = '';
    expenseDescription.value = '';
    receiptImage.value = '';
    imagePreview.innerHTML = '';
    selectedImageData = null;
}

// Visa detaljer
function showDetails(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    const detailsHtml = `
        <div class="details-header">
            <div>
                <div class="details-title">${expense.store}</div>
                <div class="info-label" style="margin-top: 8px;">${formatDate(expense.date)}</div>
            </div>
            <div class="details-amount">${expense.amount.toFixed(2)} kr</div>
        </div>

        ${expense.description ? `
            <div class="form-group">
                <label class="info-label">Beskrivning</label>
                <p class="info-value">${expense.description}</p>
            </div>
        ` : ''}

        <div class="details-image">
            <img src="${expense.image}" alt="Kvitto">
        </div>

        <div class="details-actions">
            <button class="btn btn-secondary" onclick="editExpense('${expense.id}')">Redigera</button>
            <button class="btn btn-danger" onclick="deleteExpense('${expense.id}'); detailsModal.style.display='none'">Radera</button>
        </div>
    `;

    document.getElementById('expenseDetails').innerHTML = detailsHtml;
    detailsModal.style.display = 'block';
}

// Redigera utlägg
function editExpense(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    expenseDate.value = expense.date;
    expenseStore.value = expense.store;
    expenseAmount.value = expense.amount;
    expenseDescription.value = expense.description;
    imagePreview.innerHTML = `<img src="${expense.image}" alt="Befintlig kvitto">`;
    selectedImageData = expense.image;

    detailsModal.style.display = 'none';
    expenseModal.style.display = 'block';

    // Byt saveBtn till att uppdatera istället
    const oldSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(oldSaveBtn, saveBtn);

    oldSaveBtn.addEventListener('click', () => {
        const date = expenseDate.value;
        const store = expenseStore.value.trim();
        const amount = parseFloat(expenseAmount.value);
        const description = expenseDescription.value.trim();

        if (!date || !store || !amount) {
            alert('Vänligen fyll i alla obligatoriska fält!');
            return;
        }

        const index = expenses.findIndex(e => e.id === id);
        if (index !== -1) {
            expenses[index] = {
                ...expense,
                date,
                store,
                amount,
                description,
                image: selectedImageData
            };
            saveExpenses();
            renderExpenses();
            expenseModal.style.display = 'none';
            resetForm();
        }
    });
}

// Radera utlägg
function deleteExpense(id) {
    if (confirm('Är du säker på att du vill radera detta utlägg?')) {
        expenses = expenses.filter(e => e.id !== id);
        saveExpenses();
        renderExpenses();
    }
}

// Starta appen
loadExpenses();
