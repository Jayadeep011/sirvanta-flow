// src/advisor.js
// Client helpers for Service 04 (Sirvanta Advisor): calling the Netlify function, turning
// statement text into clean transactions, and building the context snapshot the AI receives.

import { db, getSettings, getMonthlyIncomeHistory, effectiveTaxRate, toISODate, SCHEDULE_C_CATEGORIES } from './db';
import { mean, volatility, projectLiquidity, getRecordedSnapshot } from './finance';
import { nextDeadline, daysUntil, getYearFigures, suggestCategory } from './tax';
import { rankClients, ehrTier, scopeCreepShare, displayStatus } from './clients';

const ENDPOINT = '/.netlify/functions/sirvanta-advisor';

/* ---------- calling the serverless function ---------- */
export async function callAdvisor({ mode, prompt, contextData }) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, prompt, contextData }),
    });
  } catch {
    throw new Error('Could not reach the Sirvanta Advisor. Check your internet connection.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON answers (for example a gateway timeout page) are handled below.
  }

  if (res.status === 404) {
    throw new Error('The advisor function was not found. When testing on your computer, start the app with "npx netlify dev" instead of "npm run dev".');
  }
  if ((res.status === 502 || res.status === 504) && !(data && data.error)) {
    throw new Error('The advisor took too long to answer. Try a shorter statement or question.');
  }
  if (!res.ok || !data || data.error) {
    throw new Error((data && data.error) || `The advisor returned an error (${res.status}). Try again.`);
  }
  return data.text;
}

/* ---------- statement parsing ---------- */
const CHUNK_CHARS = 2000; // small pieces keep each request inside Netlify's 10 second free-plan limit

/** Splits statement text into pieces small enough to answer quickly. A CSV header row is repeated on every piece. */
export function chunkStatement(text, maxChars = CHUNK_CHARS) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (!lines.length) return [];
  const looksLikeHeader = /date/i.test(lines[0]) && /(amount|debit|credit|description)/i.test(lines[0]);
  const header = looksLikeHeader ? lines[0] : '';
  const body = looksLikeHeader ? lines.slice(1) : lines;

  const chunks = [];
  let current = header ? [header] : [];
  let size = header.length;
  const flush = () => {
    if (current.length > (header ? 1 : 0)) chunks.push(current.join('\n'));
    current = header ? [header] : [];
    size = header.length;
  };

  body.forEach((raw) => {
    const line = raw.length > maxChars ? raw.slice(0, maxChars) : raw;
    if (size + line.length + 1 > maxChars) flush();
    current.push(line);
    size += line.length + 1;
  });
  flush();
  return chunks;
}

/** Pulls the first JSON array out of a model answer, tolerating stray text or code fences. */
export function extractJsonArray(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error('The AI did not return a list of transactions.');
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error('The AI answer was not a list.');
  return parsed;
}

/** Validates one parsed row. Returns null when the row is unusable. */
export function cleanParsedRow(raw, entity) {
  if (!raw || typeof raw !== 'object') return null;
  const amount = Number(String(raw.amount).replace(/[$,\s]/g, ''));
  const description = String(raw.description || '').trim();
  if (!Number.isFinite(amount) || amount === 0 || !description) return null;

  const type = amount > 0 ? 'income' : 'expense';
  let deductible = type === 'expense' && Boolean(raw.isDeductible);
  let category = SCHEDULE_C_CATEGORIES.includes(raw.scheduleCCategory) ? raw.scheduleCCategory : '';
  if (deductible && !category) category = suggestCategory(description) || '';
  if (!category) deductible = false;

  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date)) ? raw.date : toISODate(),
    description,
    amount,
    type,
    category: String(raw.category || (deductible ? category : 'Uncategorized')).trim(),
    isDeductible: deductible,
    scheduleCCategory: deductible ? category : '',
    entity,
  };
}

/**
 * Runs the parser over every chunk in turn.
 * Returns { rows, failedAt, failure }: rows from the chunks that worked, and where it stopped if one failed.
 */
export async function parseStatement(text, { entity, onProgress = () => {} }) {
  const chunks = chunkStatement(text);
  const year = new Date().getFullYear();
  const rows = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress(i + 1, chunks.length);
    try {
      const answer = await callAdvisor({
        mode: 'parse_statement',
        prompt: chunks[i],
        contextData: { currentYear: year, part: i + 1, of: chunks.length },
      });
      extractJsonArray(answer).forEach((r) => {
        const row = cleanParsedRow(r, entity);
        if (row) rows.push(row);
      });
    } catch (err) {
      return { rows, failedAt: i + 1, total: chunks.length, failure: err.message };
    }
  }
  return { rows, failedAt: null, total: chunks.length, failure: null };
}

/** Removes rows that already exist (same date, amount, description, type and entity). */
export async function dropDuplicates(rows) {
  const existing = await db.transactions.toArray();
  const key = (t) => `${t.date}|${t.amount}|${t.description.toLowerCase()}|${t.type}|${t.entity}`;
  const seen = new Set(existing.map(key));
  const fresh = [];
  rows.forEach((r) => {
    const k = key({ ...r, amount: Math.abs(r.amount) });
    if (!seen.has(k)) {
      seen.add(k);
      fresh.push(r);
    }
  });
  return { fresh, duplicates: rows.length - fresh.length };
}

/* ---------- context snapshot sent with questions and briefings ---------- */
const round = (n) => Math.round(Number(n) || 0);

/** Cash-based monthly income, spending and net for the last N months across all entities. */
async function monthlyNet(months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, income: 0, spending: 0 });
  }
  const rows = await db.transactions.where('date').aboveOrEqual(`${buckets[0].month}-01`).toArray();
  rows.forEach((t) => {
    if (t.category === 'Owner Distribution') return; // moves money between your own entities
    const b = buckets.find((x) => x.month === t.date.slice(0, 7));
    if (!b) return;
    if (t.type === 'income') b.income += t.amount;
    else b.spending += t.amount;
  });
  return buckets.map((b) => ({ month: b.month, income: round(b.income), spending: round(b.spending), net: round(b.income - b.spending) }));
}

/**
 * The figures the AI can see. Everything comes from the local database and settings;
 * nothing else about the user is sent.
 */
export async function buildContextSnapshot(entity = 'business') {
  const settings = await getSettings();
  const rate = effectiveTaxRate(settings);
  const today = toISODate();

  const [recorded, history, invoices, clients, net] = await Promise.all([
    getRecordedSnapshot(entity),
    getMonthlyIncomeHistory(6, entity),
    db.invoices.toArray(),
    db.clients.toArray(),
    monthlyNet(6),
  ]);

  const calendar = nextDeadline(new Date());
  const { gross } = await getYearFigures(calendar.taxYear);
  const taxReserve = round(gross * rate);
  const incomes = history.map((h) => h.income);
  const avg = mean(incomes);
  const burn = settings.monthlyBurn;
  const buffer = settings.bufferTarget;

  const projection = projectLiquidity({
    startBalance: recorded.cash - taxReserve,
    monthlyInflow: avg,
    monthlyExpenses: burn,
    monthlyDraw: 0,
    taxRate: rate,
  }).map((p) => p.balance);

  const { active } = rankClients(clients);
  const overdue = invoices.filter((i) => displayStatus(i, today) === 'overdue');
  const awaiting = invoices.filter((i) => ['sent', 'overdue'].includes(displayStatus(i, today)));

  return {
    asOf: today,
    entityView: entity,
    note: 'Cash figures are recorded income minus recorded expenses, so they may differ from live bank balances. The projection assumes no owner draw.',
    safeToSpend: {
      liquidCash: recorded.cash,
      taxReserveEstimate: taxReserve,
      fixed30DayExpenses: burn,
      emergencyBuffer: buffer,
      safeToSpend: recorded.cash - (taxReserve + burn + buffer),
    },
    income: {
      last6Months: history.map((h) => ({ month: h.month, income: round(h.income) })),
      averageMonthly: round(avg),
      volatilityPct: Math.round(volatility(incomes) * 100),
    },
    projectedBalanceNext12Months: projection,
    monthlyCashNet: net,
    tax: {
      combinedReserveRatePct: Math.round(rate * 1000) / 10,
      taxYear: calendar.taxYear,
      grossRevenueYearToDate: round(gross),
      nextPayment: `${calendar.next.quarter} due ${toISODate(calendar.next.date)}`,
      daysUntilNextPayment: daysUntil(calendar.next.date),
    },
    clients: active.map((c) => ({
      name: c.name,
      monthlyPay: round(c.monthlyRetainer),
      effectiveHourlyRate: round(c.ehr),
      margin: ehrTier(c.ehr),
      scopeCreepHours: c.scopeCreepHours,
      scopeCreepPct: Math.round(scopeCreepShare(c) * 100),
      averagePaymentDelayDays: c.avgPaymentDelayDays,
    })),
    invoices: {
      awaitingPaymentTotal: round(awaiting.reduce((s, i) => s + i.amount, 0)),
      overdueCount: overdue.length,
      overdueTotal: round(overdue.reduce((s, i) => s + i.amount, 0)),
    },
  };
}
