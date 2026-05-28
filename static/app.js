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
  { id: 'envios',         icon: '📦', label: 'Envíos',             short: 'Envíos',     color: '#92400e' },
  { id: 'ocio',           icon: '🎮', label: 'Ocio',               short: 'Ocio',       color: '#dc2626' },
  { id: 'suscripciones',  icon: '📺', label: 'Suscripciones',      short: 'Suscripc.',  color: '#4338ca' },
  { id: 'claude',         icon: '🤖', label: 'Claude',             short: 'Claude',     color: '#b45309' },
  { id: 'adopta_abuelo',  icon: '👴', label: 'Adopta un abuelo',   short: 'A. Abuelo',  color: '#c2410c' },
  { id: 'comunidad_stro', icon: '🏘️', label: 'Comunidad Stro',    short: 'Stro',       color: '#0d9488' },
  { id: 'temu',           icon: '🛍️', label: 'TEMU',              short: 'TEMU',       color: '#f97316' },
  { id: 'otros',          icon: '🗂️', label: 'Otros',             short: 'Otros',      color: '#6b7280' },
];
const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

/* ── User metadata (for compare tab) ───────────────────── */
const USER_META = {
  'admin':     { icon: '👩‍💼', color: '#7C3AED', label: 'Admin' },
  'Maximo':    { icon: '👦',   color: '#2563eb', label: 'Maximo' },
  'Guillermo': { icon: '👨',   color: '#16a34a', label: 'Guillermo' },
};

/* ── State ─────────────────────────────────────────────── */
let currentMonth  = todayYM();
let selectedCat   = CATS[0].id;
let compareUser1  = window.CURRENT_USER;
let compareUser2  = Object.keys(USER_META).find(u => u !== compareUser1) || Object.keys(USER_META)[1];
let compareMode   = 'category';

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
buildEvolutionSelect();
buildCompareUI();
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
  if (document.getElementById('tab-charts').classList.contains('active')) {
    loadPieChart();
  }
  if (document.getElementById('tab-compare').classList.contains('active') && compareMode === 'category') {
    loadCompare();
  }
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
    document.querySelector('.app-main').scrollTop = 0;
    if (id === 'charts')  loadCharts();
    if (id === 'compare') loadCompare();
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
    if (res.status === 401) { location.href = '/login'; return; }
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
    if (res.status === 401) { location.href = '/login'; return; }
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

/* ── Charts ──────────────────────────────────────────────── */
let chartMonthly = null, chartPie = null, chartLine = null;

// Shared Chart.js defaults
Chart.defaults.font.family = "'Segoe UI', system-ui, -apple-system, sans-serif";
Chart.defaults.font.size   = 11;
Chart.defaults.color       = '#6B7280';

function buildEvolutionSelect() {
  const sel = document.getElementById('evolution-cat');
  sel.innerHTML = CATS.map(c =>
    `<option value="${c.id}">${c.icon} ${c.label}</option>`
  ).join('');
  sel.addEventListener('change', loadLineChart);
}

async function loadCharts() {
  await Promise.all([loadMonthlyChart(), loadPieChart(), loadLineChart()]);
}

async function loadMonthlyChart() {
  try {
    const res = await fetch('/api/charts/monthly');
    if (res.status === 401) { location.href = '/login'; return; }
    const data = await res.json();
    const ctx  = document.getElementById('chart-monthly').getContext('2d');
    if (chartMonthly) { chartMonthly.destroy(); chartMonthly = null; }
    if (!data.length) return;

    // Fill all 12 months, missing ones as 0
    const allMonths = getLast12Months();
    const map = Object.fromEntries(data.map(d => [d.month, d.total]));
    const values = allMonths.map(m => map[m] || 0);

    chartMonthly = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: allMonths.map(fmtMonthShort),
        datasets: [{
          data: values,
          backgroundColor: allMonths.map(m =>
            m === currentMonth ? '#7C3AED' : '#C4B5FD'
          ),
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: i => fmt(i.parsed.y) } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => '€' + v, maxTicksLimit: 5 }, grid: { color: '#F3F4F6' } },
          x: { grid: { display: false } },
        },
      },
    });
  } catch (e) { console.error('Monthly chart:', e); }
}

async function loadPieChart() {
  try {
    const res = await fetch(`/api/summary?month=${currentMonth}`);
    if (res.status === 401) { location.href = '/login'; return; }
    const data = await res.json();
    document.getElementById('pie-month-label').textContent = monthLabel.textContent;
    const ctx = document.getElementById('chart-pie').getContext('2d');
    if (chartPie) { chartPie.destroy(); chartPie = null; }
    if (!data.by_category.length) return;

    const grandTotal = data.total;
    chartPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.by_category.map(d => {
          const c = CAT_MAP[d.category];
          return c ? `${c.icon} ${c.label}` : d.category;
        }),
        datasets: [{
          data: data.by_category.map(d => d.total),
          backgroundColor: data.by_category.map(d => CAT_MAP[d.category]?.color || '#888'),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 10, boxWidth: 11, font: { size: 10 } },
          },
          tooltip: {
            callbacks: {
              label: i => {
                const pct = ((i.parsed / grandTotal) * 100).toFixed(1);
                return ` ${fmt(i.parsed)}  (${pct}%)`;
              },
            },
          },
        },
      },
    });
  } catch (e) { console.error('Pie chart:', e); }
}

async function loadLineChart() {
  try {
    const cat  = document.getElementById('evolution-cat').value;
    const meta = CAT_MAP[cat] || CATS[0];
    const res  = await fetch(`/api/charts/evolution?category=${cat}`);
    if (res.status === 401) { location.href = '/login'; return; }
    const data = await res.json();
    const ctx  = document.getElementById('chart-line').getContext('2d');
    if (chartLine) { chartLine.destroy(); chartLine = null; }

    const allMonths = getLast12Months();
    const map    = Object.fromEntries(data.map(d => [d.month, d.total]));
    const values = allMonths.map(m => map[m] || 0);

    chartLine = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allMonths.map(fmtMonthShort),
        datasets: [{
          data: values,
          borderColor: meta.color,
          backgroundColor: meta.color + '18',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: meta.color,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: i => fmt(i.parsed.y) } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => '€' + v, maxTicksLimit: 5 }, grid: { color: '#F3F4F6' } },
          x: { grid: { display: false } },
        },
      },
    });
  } catch (e) { console.error('Line chart:', e); }
}

/* ── Chart helpers ───────────────────────────────────────── */
function getLast12Months() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function fmtMonthShort(ym) {
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1, 3);
}

/* ── Compare tab ─────────────────────────────────────────── */
let chartCompare = null;

function buildCompareUI() {
  ['picker1', 'picker2'].forEach((pickerId, slot) => {
    const picker = document.getElementById(pickerId);
    picker.innerHTML = Object.entries(USER_META).map(([uname, meta]) => `
      <button class="cmp-btn" data-user="${uname}" style="--cmp-color:${meta.color}">
        <span class="cmp-icon">${meta.icon}</span>
        <span class="cmp-name">${meta.label}</span>
      </button>`).join('');

    picker.addEventListener('click', e => {
      const btn = e.target.closest('.cmp-btn');
      if (!btn) return;
      if (slot === 0) compareUser1 = btn.dataset.user;
      else            compareUser2 = btn.dataset.user;
      syncPickerActive();
      loadCompare();
    });
  });
  syncPickerActive();

  document.getElementById('compare-mode-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    compareMode = btn.dataset.mode;
    loadCompare();
  });
}

function syncPickerActive() {
  document.querySelectorAll('#picker1 .cmp-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.user === compareUser1));
  document.querySelectorAll('#picker2 .cmp-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.user === compareUser2));
}

async function loadCompare() {
  const summaryEl = document.getElementById('compare-summary');
  if (compareUser1 === compareUser2) {
    summaryEl.innerHTML = '<p class="compare-warning">Selecciona dos usuarios distintos</p>';
    if (chartCompare) { chartCompare.destroy(); chartCompare = null; }
    return;
  }
  compareMode === 'category' ? await loadCompareCategory() : await loadCompareMonthly();
}

async function loadCompareCategory() {
  try {
    const res = await fetch(
      `/api/compare/category?user1=${compareUser1}&user2=${compareUser2}&month=${currentMonth}`
    );
    if (res.status === 401) { location.href = '/login'; return; }
    const data = await res.json();
    if (data.error) return;

    const meta1 = USER_META[data.user1] || { color: '#888', label: data.user1 };
    const meta2 = USER_META[data.user2] || { color: '#aaa', label: data.user2 };
    const total1 = data.categories.reduce((s, c) => s + c.user1_total, 0);
    const total2 = data.categories.reduce((s, c) => s + c.user2_total, 0);
    renderCompareSummary(meta1, data.user1, total1, meta2, data.user2, total2);

    const wrap = document.getElementById('compare-chart-wrap');
    const ctx  = document.getElementById('chart-compare').getContext('2d');
    if (chartCompare) { chartCompare.destroy(); chartCompare = null; }

    if (!data.categories.length) return;

    wrap.style.height = Math.max(200, data.categories.length * 46) + 'px';

    chartCompare = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.categories.map(c => {
          const cat = CAT_MAP[c.category];
          return cat ? `${cat.icon} ${cat.label}` : c.category;
        }),
        datasets: [
          { label: meta1.label, data: data.categories.map(c => c.user1_total),
            backgroundColor: meta1.color, borderRadius: 3 },
          { label: meta2.label, data: data.categories.map(c => c.user2_total),
            backgroundColor: meta2.color, borderRadius: 3 },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
          tooltip: { callbacks: { label: i => ` ${fmt(i.parsed.x)}` } },
        },
        scales: {
          x: { beginAtZero: true, ticks: { callback: v => '€' + v, maxTicksLimit: 4 }, grid: { color: '#F3F4F6' } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  } catch (e) { console.error('Compare category:', e); }
}

async function loadCompareMonthly() {
  try {
    const res = await fetch(`/api/compare/monthly?user1=${compareUser1}&user2=${compareUser2}`);
    if (res.status === 401) { location.href = '/login'; return; }
    const data = await res.json();
    if (data.error) return;

    const meta1 = USER_META[data.user1] || { color: '#888', label: data.user1 };
    const meta2 = USER_META[data.user2] || { color: '#aaa', label: data.user2 };
    const total1 = data.months.reduce((s, m) => s + m.user1_total, 0);
    const total2 = data.months.reduce((s, m) => s + m.user2_total, 0);
    renderCompareSummary(meta1, data.user1, total1, meta2, data.user2, total2);

    const wrap = document.getElementById('compare-chart-wrap');
    const ctx  = document.getElementById('chart-compare').getContext('2d');
    if (chartCompare) { chartCompare.destroy(); chartCompare = null; }

    wrap.style.height = '220px';

    chartCompare = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.months.map(m => fmtMonthShort(m.month)),
        datasets: [
          { label: meta1.label, data: data.months.map(m => m.user1_total),
            backgroundColor: meta1.color, borderRadius: 3 },
          { label: meta2.label, data: data.months.map(m => m.user2_total),
            backgroundColor: meta2.color, borderRadius: 3 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
          tooltip: { callbacks: { label: i => ` ${fmt(i.parsed.y)}` } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => '€' + v, maxTicksLimit: 5 }, grid: { color: '#F3F4F6' } },
          x: { grid: { display: false } },
        },
      },
    });
  } catch (e) { console.error('Compare monthly:', e); }
}

function renderCompareSummary(meta1, user1, total1, meta2, user2, total2) {
  document.getElementById('compare-summary').innerHTML = `
    <div class="cmp-chip" style="--c:${meta1.color}">
      ${meta1.icon} ${meta1.label}<br><strong>${fmt(total1)}</strong>
    </div>
    <div class="cmp-chip" style="--c:${meta2.color}">
      ${meta2.icon} ${meta2.label}<br><strong>${fmt(total2)}</strong>
    </div>`;
}
