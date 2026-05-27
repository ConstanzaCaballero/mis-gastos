'use strict';

/* ── Category definitions ──────────────────────────────── */
const CATS = [
  { id: 'supermercado',   icon: '🛒', label: 'Supermercado',       short: 'Súper',      color: '#16a34a' },
  { id: 'restaurantes',   icon: '🍔', label: 'Restaurantes',       short: 'Restaur.',   color: '#ea580c' },
  { id: 'alquiler',       icon: '🏠', label: 'Alquiler',           short: 'Alquiler',   color: '#2563eb' },
  { id: 'transporte',     icon: '🚇', label: 'Transporte',         short: 'Transp.',    color: '#0891b2' },
  { id: 'viajes',         icon: '✈️', label: 'Viajes',             short: 'Viajes',     color: '#d97706' },
  { id: 'ropa_compras',   icon: '🛍️', label: 'Ropa / Compras',    short: 'Ropa',       color: '#db2777' },
  { id: 'salud_gym',      icon: '💪', label: 'Salud / Gym',        short: 'Salud',      color: '#65a30d' },
  { id: 'fertilidad',     icon: '🧬', label: 'Fertilidad',         short: 'Fertilidad', color: '#9333ea' },
  { id: 'hogar',          icon: '🏠', label: 'Hogar',              short: 'Hogar',      color: '#475569' },
  { id: 'envios',         icon: '📦', label: 'Envíos',             short: 'Envíos',     color: '#92400e' },
  { id: 'ocio',           icon: '🎮', label: 'Ocio',               short: 'Ocio',       color: '#dc2626' },
  { id: 'suscripciones',  icon: '📺', label: 'Suscripciones',      short: 'Suscripc.',  color: '#4338ca' },
  { id: 'claude',         icon: '🤖', label: 'Claude',             short: 'Claude',     color: '#b45309' },
  { id: 'adopta_abuelo',  icon: '👴', label: 'Adopta un abuelo',   short: 'A. Abuelo',  color: '#c2410c' },
  { id: 'comunidad_stro', icon: '🏘️', label: 'Comunidad Stro',    short: 'Stro',       color: '#0d9488' },
  { id: 'temu',           icon: '🛍️', label: 'TEMU',              short: 'TEMU',       color: '#f97316' },
];
const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

/* ── State ─────────────────────────────────────────────── */
let currentMonth = todayYM();
let selectedCat  = CATS[0].id;

/* ── DOM refs ──────────────────────────────────────────── */
const monthLabel  = document.getElementById('month-label');
const heroAmount  = document.getElementById('hero-amount');
const catBarsEl   = document.getElementById('cat-bars');
const summaryEmpty= document.getElementById('summary-empty');
const catGrid     = document.getElementById('cat-grid');
const expList     = document.getElementById('expense-list');
const listEmpty   = document.getElementById('list-empty');
const form        = document.getElementById('expense-form');
const inpAmount   = document.getElementById('inp-amount');
const inpDate     = document.getElementById('inp-date');
const inpNote     = document.getElementById('inp-note');
const submitBtn   = document.getElementById('submit-btn');
const toast       = document.getElementById('toast');
const installBtn  = document.getElementById('install-btn');

/* ── Bootstrap ─────────────────────────────────────────── */
inpDate.value = todayISO();
buildCatGrid();
updateMonthLabel();
loadAll();

/* ── Month navigation ──────────────────────────────────── */
document.getElementById('prev-month').addEventListener('click', () => shiftMonth(-1));
document.getElementById('next-month').addEventListener('click', () => shiftMonth(+1));

function shiftMonth(delta) {
  const [y, m] = currentMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  updateMonthLabel();
  loadAll();
}

function updateMonthLabel() {
  const [y, m] = currentMonth.split('-').map(Number);
  const label = new Date(y, m - 1, 1)
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  monthLabel.textContent = label.charAt(0).toUpperCase() + label.slice(1);
}

/* ── Tab navigation ────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    btn.classList.add('active');
    // Scroll the main area to top when switching tabs
    document.querySelector('.app-main').scrollTop = 0;
  });
});

/* ── Category grid ─────────────────────────────────────── */
function buildCatGrid() {
  catGrid.innerHTML = CATS.map(c => `
    <button type="button" class="cat-cell${c.id === selectedCat ? ' active' : ''}"
      data-id="${c.id}" style="--cell-color:${c.color}">
      <span class="cat-emoji">${c.icon}</span>
      <span class="cat-lbl">${c.short}</span>
    </button>
  `).join('');
}

catGrid.addEventListener('click', e => {
  const cell = e.target.closest('.cat-cell');
  if (!cell) return;
  document.querySelectorAll('.cat-cell').forEach(c => c.classList.remove('active'));
  cell.classList.add('active');
  selectedCat = cell.dataset.id;
});

/* ── Load data ─────────────────────────────────────────── */
async function loadAll() {
  await Promise.all([loadSummary(), loadExpenses()]);
}

async function loadSummary() {
  try {
    const res  = await fetch(`/api/summary?month=${currentMonth}`);
    const data = await res.json();
    heroAmount.textContent = fmt(data.total);
    renderBars(data.by_category, data.total);
  } catch {
    heroAmount.textContent = 'Error';
  }
}

function renderBars(rows, grandTotal) {
  if (!rows.length) {
    catBarsEl.innerHTML = '';
    summaryEmpty.style.display = '';
    return;
  }
  summaryEmpty.style.display = 'none';
  catBarsEl.innerHTML = rows.map(r => {
    const cat = CAT_MAP[r.category] || { icon: '📦', label: r.category, color: '#888' };
    const pct = grandTotal > 0 ? (r.total / grandTotal) * 100 : 0;
    return `
      <div class="bar-row">
        <span class="bar-icon">${cat.icon}</span>
        <div class="bar-info">
          <div class="bar-label">${cat.label}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${cat.color}"></div>
          </div>
        </div>
        <span class="bar-amount">${fmt(r.total)}</span>
      </div>`;
  }).join('');
}

async function loadExpenses() {
  try {
    const res  = await fetch(`/api/expenses?month=${currentMonth}`);
    const data = await res.json();
    renderExpenses(data);
  } catch {
    showToast('Error al cargar gastos');
  }
}

function renderExpenses(expenses) {
  if (!expenses.length) {
    expList.innerHTML = '';
    expList.appendChild(listEmpty);
    listEmpty.style.display = '';
    return;
  }
  listEmpty.style.display = 'none';
  expList.innerHTML = expenses.map(exp => {
    const cat  = CAT_MAP[exp.category] || { icon: '📦', label: exp.category, color: '#888' };
    const note = exp.note || cat.label;
    return `
      <div class="exp-item" data-id="${exp.id}">
        <div class="exp-dot" style="background:${cat.color}22">
          ${cat.icon}
        </div>
        <div class="exp-body">
          <div class="exp-note">${esc(note)}</div>
          <div class="exp-sub">${cat.label} · ${fmtDate(exp.date)}</div>
        </div>
        <div class="exp-right">
          <span class="exp-amt" style="color:${cat.color}">${fmt(exp.amount)}</span>
          <button class="del-btn" data-id="${exp.id}" title="Eliminar">✕</button>
        </div>
      </div>`;
  }).join('');
}

/* ── Delete ─────────────────────────────────────────────── */
expList.addEventListener('click', async e => {
  const btn = e.target.closest('.del-btn');
  if (!btn) return;
  const id   = btn.dataset.id;
  const item = expList.querySelector(`.exp-item[data-id="${id}"]`);
  if (item) item.style.opacity = '.35';
  try {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    await loadAll();
    showToast('Gasto eliminado');
  } catch {
    if (item) item.style.opacity = '';
    showToast('Error al eliminar');
  }
});

/* ── Form submit ─────────────────────────────────────────── */
form.addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(inpAmount.value);
  if (!amount || amount <= 0) { showToast('Introduce un importe válido'); return; }

  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        category: selectedCat,
        note: inpNote.value.trim() || null,
        date: inpDate.value,
      }),
    });
    if (!res.ok) throw new Error();
    inpAmount.value = '';
    inpNote.value   = '';
    inpDate.value   = todayISO();
    showToast('✓ Gasto añadido');
    // If the expense is for current month, refresh data
    const expMonth = inpDate.value ? inpDate.value.slice(0, 7) : currentMonth;
    if (expMonth === currentMonth || !inpDate.value) await loadAll();
    // Switch to summary tab
    document.querySelector('[data-tab="summary"]').click();
  } catch {
    showToast('Error al guardar — revisa la conexión');
  } finally {
    submitBtn.disabled = false;
  }
});

/* ── PWA install ─────────────────────────────────────────── */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') installBtn.hidden = true;
  deferredPrompt = null;
});
window.addEventListener('appinstalled', () => { installBtn.hidden = true; });

/* ── Service worker ──────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('/static/sw.js').catch(() => {})
  );
}

/* ── Helpers ─────────────────────────────────────────────── */
function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayYM()  { return new Date().toISOString().slice(0, 7); }

function fmt(n) {
  return (n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

let _toastTimer = null;
function showToast(msg) {
  clearTimeout(_toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
