// src/db.js
// Sirvanta Flow V2.0 - local-first database (Dexie.js on top of IndexedDB).
//
// Conventions
// - Transaction amounts are stored as POSITIVE numbers; `type` ('income' | 'expense') carries the direction.
//   Anything that arrives with a sign (for example the AI statement parser) goes through normalizeTransaction().
// - Dates are stored as local 'YYYY-MM-DD' strings.
// - Tax rates in settings are whole percentages (24 means 24%).

import Dexie from 'dexie';

export const db = new Dexie('SirvantaFlowDB');

db.version(1).stores({
  transactions: '++id, date, type, category, entity, isDeductible',
  clients: '++id, name, status',
  invoices: '++id, invoiceNumber, clientName, status, dueDate',
  settings: 'id',
});

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const SCHEDULE_C_CATEGORIES = [
  'Advertising',
  'Office Expenses/SaaS',
  'Cloud Equipment',
  'Travel',
  'Client Meals',
];

export const DEFAULT_SETTINGS = {
  id: 1,
  userTier: 'free', // 'free' | 'starter' | 'pro' | 'agency'
  selectedEntity: 'business', // 'business' | 'personal' | 'consolidated'
  monthlyBurn: 3000,
  bufferTarget: 15000,
  federalTaxRate: 24,
  stateTaxRate: 5,
  hysaRate: 4.5,
  selfEmploymentTax: true, // adds the 15.3% self-employment rate to reserve math
};

export const TIER_LIMITS = {
  free: {
    maxClients: 2,
    aiParsesPerMonth: 0,
    aiQueriesPerMonth: 0,
    canSaveData: false,
    features: {
      fullSalaryEngine: false, realTimeTaxVault: false, scheduleCScanner: false, ehrMatrix: false,
      entitySwitcher: false, yieldRadar: false, executiveBriefing: false, invoiceBuilder: false,
      csvExport: false, aiAdvisor: false,
    },
  },
  starter: {
    maxClients: 5,
    aiParsesPerMonth: 0,
    aiQueriesPerMonth: 0,
    canSaveData: true,
    features: {
      fullSalaryEngine: false, realTimeTaxVault: false, scheduleCScanner: false, ehrMatrix: false,
      entitySwitcher: false, yieldRadar: false, executiveBriefing: false, invoiceBuilder: false,
      csvExport: true, aiAdvisor: false,
    },
  },
  pro: {
    maxClients: Infinity,
    aiParsesPerMonth: 10,
    aiQueriesPerMonth: 15,
    canSaveData: true,
    features: {
      fullSalaryEngine: true, realTimeTaxVault: true, scheduleCScanner: true, ehrMatrix: true,
      entitySwitcher: false, yieldRadar: false, executiveBriefing: false, invoiceBuilder: false,
      csvExport: true, aiAdvisor: true,
    },
  },
  agency: {
    maxClients: Infinity,
    aiParsesPerMonth: Infinity,
    aiQueriesPerMonth: Infinity,
    canSaveData: true,
    features: {
      fullSalaryEngine: true, realTimeTaxVault: true, scheduleCScanner: true, ehrMatrix: true,
      entitySwitcher: true, yieldRadar: true, executiveBriefing: true, invoiceBuilder: true,
      csvExport: true, aiAdvisor: true,
    },
  },
};

export const hasFeature = (tier, feature) => Boolean(TIER_LIMITS[tier]?.features?.[feature]);

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0');

export const toISODate = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const round2 = (n) => Math.round(n * 100) / 100;

/** Combined reserve rate as a fraction, e.g. 0.443 for 24% federal + 5% state + 15.3% self-employment. */
export const effectiveTaxRate = (settings) =>
  ((Number(settings.federalTaxRate) || 0) +
    (Number(settings.stateTaxRate) || 0) +
    (settings.selfEmploymentTax ? 15.3 : 0)) / 100;

/** Effective hourly rate for a client: (revenue - direct costs) / (billed + scope creep hours). */
export const computeEHR = (client) => {
  const hours = (Number(client.trackedHours) || 0) + (Number(client.scopeCreepHours) || 0);
  if (hours <= 0) return 0;
  return ((Number(client.monthlyRetainer) || 0) - (Number(client.directCosts) || 0)) / hours;
};

/** Badge for an EHR value: green above $150/hr, gold from $75 to $150, crimson below $75. */
export const getEhrBadge = (ehr) => {
  if (ehr > 150) return { label: 'High margin', color: '#16A34A' };
  if (ehr >= 75) return { label: 'Target margin', color: '#C5A059' };
  return { label: 'Toxic low margin', color: '#DC2626' };
};

const makeTierError = (message) => {
  const err = new Error(message);
  err.code = 'TIER_LIMIT';
  return err;
};

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

db.on('populate', (tx) => {
  tx.table('settings').add({ ...DEFAULT_SETTINGS });
});

export async function getSettings() {
  const existing = await db.settings.get(1);
  if (existing) return { ...DEFAULT_SETTINGS, ...existing };
  await db.settings.put({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS };
}

export async function updateSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch, id: 1 };
  await db.settings.put(next);
  return next;
}

export const setUserTier = (tier) => {
  if (!TIER_LIMITS[tier]) return Promise.reject(new Error(`Unknown tier: ${tier}`));
  return updateSettings({ userTier: tier });
};

/* ------------------------------------------------------------------ */
/* AI usage metering (per calendar month, kept inside settings)        */
/* ------------------------------------------------------------------ */

const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** { month, parses, queries } for the current month; resets automatically when the month changes. */
export async function getAiUsage() {
  const settings = await getSettings();
  const usage = settings.aiUsage;
  return usage && usage.month === monthKey() ? usage : { month: monthKey(), parses: 0, queries: 0 };
}

/** kind: 'parse' (statement parsing) or 'query' (scenario questions and briefings). */
export async function recordAiUsage(kind) {
  const usage = await getAiUsage();
  const field = kind === 'parse' ? 'parses' : 'queries';
  const next = { ...usage, [field]: usage[field] + 1 };
  await updateSettings({ aiUsage: next });
  return next;
}

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

export function normalizeTransaction(raw = {}) {
  const signed = Number(raw.amount);
  if (!Number.isFinite(signed)) throw new Error('Transaction amount must be a number.');

  const type = raw.type === 'income' || raw.type === 'expense' ? raw.type : signed >= 0 ? 'income' : 'expense';
  const parsedDate = raw.date ? new Date(raw.date) : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? toISODate() : toISODate(parsedDate);
  const isDeductible = type === 'expense' && Boolean(raw.isDeductible);

  return {
    date,
    description: String(raw.description || 'Untitled transaction').trim(),
    amount: round2(Math.abs(signed)),
    category: String(raw.category || 'Uncategorized').trim(),
    type,
    isDeductible,
    scheduleCCategory: isDeductible ? String(raw.scheduleCCategory || '').trim() : '',
    entity: ['personal', 'business'].includes(raw.entity) ? raw.entity : 'business',
  };
}

export async function addTransaction(raw) {
  return db.transactions.add(normalizeTransaction(raw));
}

/** Used by the AI statement parser: accepts an array of loosely shaped rows, returns counts and the new ids (for undo). */
export async function addTransactions(rows) {
  if (!Array.isArray(rows)) throw new Error('Parsed statement must be an array of transactions.');
  const cleaned = [];
  for (const row of rows) {
    try {
      cleaned.push(normalizeTransaction(row));
    } catch {
      // Skip rows without a usable amount instead of failing the whole import.
    }
  }
  const ids = cleaned.length ? await db.transactions.bulkAdd(cleaned, { allKeys: true }) : [];
  return { saved: cleaned.length, skipped: rows.length - cleaned.length, ids };
}

export const deleteTransaction = (id) => db.transactions.delete(id);

/**
 * Virtual Salary "Transfer to Personal Bank Account":
 * books the money out of the business entity and into the personal entity in one atomic step.
 */
export async function logPersonalDistribution(amount, note = 'Virtual salary draw') {
  const value = Number(amount);
  if (!(value > 0)) throw new Error('Draw amount must be greater than zero.');
  const date = toISODate();
  const base = { date, description: note, amount: round2(value), category: 'Owner Distribution', isDeductible: false, scheduleCCategory: '' };

  await db.transaction('rw', db.transactions, async () => {
    await db.transactions.add({ ...base, type: 'expense', entity: 'business' });
    await db.transactions.add({ ...base, type: 'income', entity: 'personal' });
  });
  return round2(value);
}

/** Monthly income totals for the last N months, oldest first. Owner distributions are not revenue. */
export async function getMonthlyIncomeHistory(months = 6, entity = 'business') {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ month: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, income: 0 });
  }
  const start = `${buckets[0].month}-01`;
  const rows = await db.transactions.where('date').aboveOrEqual(start).toArray();

  rows.forEach((t) => {
    if (t.type !== 'income' || t.category === 'Owner Distribution') return;
    if (entity !== 'consolidated' && t.entity !== entity) return;
    const bucket = buckets.find((b) => b.month === t.date.slice(0, 7));
    if (bucket) bucket.income = round2(bucket.income + t.amount);
  });
  return buckets;
}

export async function exportTransactionsCsv() {
  const rows = await db.transactions.orderBy('date').toArray();
  const header = ['date', 'description', 'amount', 'type', 'category', 'entity', 'isDeductible', 'scheduleCCategory'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [header.join(','), ...rows.map((r) => header.map((h) => escape(r[h])).join(','))].join('\n');
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export async function addClient(data) {
  const [settings, count] = await Promise.all([getSettings(), db.clients.count()]);
  const limit = TIER_LIMITS[settings.userTier].maxClients;
  if (count >= limit) {
    throw makeTierError(`The ${settings.userTier} plan includes up to ${limit} clients. Upgrade to add more.`);
  }
  if (!String(data.name || '').trim()) throw new Error('Client name is required.');

  return db.clients.add({
    name: String(data.name).trim(),
    monthlyRetainer: Number(data.monthlyRetainer) || 0,
    hourlyRateTarget: Number(data.hourlyRateTarget) || 0,
    trackedHours: Number(data.trackedHours) || 0,
    scopeCreepHours: Number(data.scopeCreepHours) || 0,
    directCosts: Number(data.directCosts) || 0,
    avgPaymentDelayDays: Number(data.avgPaymentDelayDays) || 0,
    status: data.status === 'paused' ? 'paused' : 'active',
  });
}

export const updateClient = (id, patch) => db.clients.update(id, patch);
export const deleteClient = (id) => db.clients.delete(id);

/* ------------------------------------------------------------------ */
/* Invoices                                                            */
/* ------------------------------------------------------------------ */

export async function nextInvoiceNumber() {
  const all = await db.invoices.toArray();
  const year = new Date().getFullYear();
  const highest = all.reduce((max, inv) => {
    const n = parseInt(String(inv.invoiceNumber).split('-').pop(), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `INV-${year}-${String(highest + 1).padStart(3, '0')}`;
}

export async function addInvoice(data) {
  const settings = await getSettings();
  const amount = round2(Number(data.amount) || 0);
  const issueDate = data.issueDate || toISODate();
  return db.invoices.add({
    invoiceNumber: data.invoiceNumber || (await nextInvoiceNumber()),
    clientName: String(data.clientName || '').trim(),
    amount,
    taxWithheld: data.taxWithheld ?? round2(amount * effectiveTaxRate(settings)),
    issueDate,
    dueDate: data.dueDate || toISODate(addDays(issueDate, 30)),
    status: ['draft', 'sent', 'paid', 'overdue'].includes(data.status) ? data.status : 'draft',
  });
}

export const updateInvoiceStatus = (id, status) => db.invoices.update(id, { status });

/* ------------------------------------------------------------------ */
/* Demo data (Free Sandbox) and reset                                  */
/* ------------------------------------------------------------------ */

export async function clearAllData() {
  await db.transaction('rw', db.transactions, db.clients, db.invoices, async () => {
    await Promise.all([db.transactions.clear(), db.clients.clear(), db.invoices.clear()]);
  });
}

/** Replaces transactions, clients and invoices with six months of realistic sample data. Settings are kept. */
export async function seedDemoData() {
  const settings = await getSettings();
  const rate = effectiveTaxRate(settings);
  const now = new Date();
  const at = (monthsAgo, day) => toISODate(new Date(now.getFullYear(), now.getMonth() - monthsAgo, day));

  const tx = (date, description, amount, category, type, extra = {}) => ({
    date, description, amount, category, type,
    isDeductible: false, scheduleCCategory: '', entity: 'business', ...extra,
  });
  const deductible = (date, description, amount, cat) =>
    tx(date, description, amount, cat, 'expense', { isDeductible: true, scheduleCCategory: cat });

  const projectPay = [3700, 0, 8000, 700, 6300, 2900]; // oldest to newest
  const meals = [180, 220, 150, 260, 210, 190];
  const ads = [300, 0, 450, 300, 0, 350];

  const transactions = [];
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const i = 5 - monthsAgo;
    transactions.push(tx(at(monthsAgo, 5), 'Apex Robotics retainer', 6000, 'Client Revenue', 'income'));
    transactions.push(tx(at(monthsAgo, 12), 'Northwind Studio retainer', 4500, 'Client Revenue', 'income'));
    if (projectPay[i] > 0) transactions.push(tx(at(monthsAgo, 20), 'Lumen Health project milestone', projectPay[i], 'Client Revenue', 'income'));

    transactions.push(deductible(at(monthsAgo, 3), 'Software subscriptions', 640, 'Office Expenses/SaaS'));
    transactions.push(deductible(at(monthsAgo, 8), 'Cloud hosting', 480, 'Cloud Equipment'));
    transactions.push(deductible(at(monthsAgo, 16), 'Client meals', meals[i], 'Client Meals'));
    if (ads[i] > 0) transactions.push(deductible(at(monthsAgo, 18), 'Paid social campaign', ads[i], 'Advertising'));
    if (i === 2) transactions.push(deductible(at(monthsAgo, 22), 'Conference travel', 1250, 'Travel'));
    transactions.push(tx(at(monthsAgo, 1), 'Apartment rent', 2400, 'Housing', 'expense', { entity: 'personal' }));
  }

  const clients = [
    { name: 'Apex Robotics', monthlyRetainer: 6000, hourlyRateTarget: 150, trackedHours: 32, scopeCreepHours: 4, directCosts: 400, avgPaymentDelayDays: 20, status: 'active' },
    { name: 'Northwind Studio', monthlyRetainer: 4500, hourlyRateTarget: 110, trackedHours: 30, scopeCreepHours: 6, directCosts: 250, avgPaymentDelayDays: 8, status: 'active' },
    { name: 'Lumen Health', monthlyRetainer: 8000, hourlyRateTarget: 125, trackedHours: 44, scopeCreepHours: 10, directCosts: 900, avgPaymentDelayDays: 12, status: 'active' },
    { name: 'Kestrel Labs', monthlyRetainer: 2500, hourlyRateTarget: 90, trackedHours: 18, scopeCreepHours: 22, directCosts: 300, avgPaymentDelayDays: 41, status: 'active' },
  ];

  const year = now.getFullYear();
  const invoice = (n, clientName, amount, issuedDaysAgo, terms, status) => {
    const issue = addDays(now, -issuedDaysAgo);
    return {
      invoiceNumber: `INV-${year}-${String(n).padStart(3, '0')}`,
      clientName, amount,
      taxWithheld: round2(amount * rate),
      issueDate: toISODate(issue),
      dueDate: toISODate(addDays(issue, terms)),
      status,
    };
  };
  const invoices = [
    invoice(1, 'Apex Robotics', 6000, 40, 30, 'paid'),
    invoice(2, 'Northwind Studio', 4500, 25, 15, 'overdue'),
    invoice(3, 'Lumen Health', 2900, 20, 30, 'sent'),
    invoice(4, 'Kestrel Labs', 2500, 55, 30, 'overdue'),
    invoice(5, 'Apex Robotics', 6000, 5, 30, 'sent'),
  ];

  await db.transaction('rw', db.transactions, db.clients, db.invoices, async () => {
    await Promise.all([db.transactions.clear(), db.clients.clear(), db.invoices.clear()]);
    await db.transactions.bulkAdd(transactions);
    await db.clients.bulkAdd(clients);
    await db.invoices.bulkAdd(invoices);
  });

  return { transactions: transactions.length, clients: clients.length, invoices: invoices.length };
}

export default db;
