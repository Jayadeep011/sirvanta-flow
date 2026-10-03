// src/finance.js
// Pure calculation helpers for Service 01 (cash flow). No React in here, so the same
// functions can also feed the AI advisor's context snapshot in a later step.

import { db, toISODate, effectiveTaxRate } from './db';
import { nextDeadline, getYearFigures } from './tax';

/* ---------- formatting ---------- */
// The active currency is set from the top bar. Amounts are labelled in that currency, not converted.
let currentCurrency = 'USD';
export const setCurrency = (code) => { currentCurrency = code || 'USD'; };
export const getCurrency = () => currentCurrency;

const LOCALES = { INR: 'en-IN', SGD: 'en-SG', CAD: 'en-CA' };
const localeFor = (code) => LOCALES[code] || 'en-US';
const format = (n, digits) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(localeFor(currentCurrency), {
    style: 'currency', currency: currentCurrency, minimumFractionDigits: digits, maximumFractionDigits: digits,
  });

/** Whole-unit money in the active currency (the name is historical; it is no longer USD only). */
export const usd = (n) => format(n, 0);
/** Money with cents, for invoices. */
export const usd2 = (n) => format(n, 2);

export const currencySymbol = () =>
  (0).toLocaleString(localeFor(currentCurrency), { style: 'currency', currency: currentCurrency, maximumFractionDigits: 0 }).replace(/[\d\s.,]/g, '');

export const usdCompact = (n) => {
  const a = Math.abs(n);
  const sym = currencySymbol();
  const s = a >= 1000 ? `${sym}${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `${sym}${Math.round(a)}`;
  return n < 0 ? `-${s}` : s;
};

export const monthLabel = (yyyyMm) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

/* ---------- Virtual Salary Engine ---------- */
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Population standard deviation. */
export const stdDev = (xs) => {
  if (!xs.length) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Volatility V = standard deviation / average, capped at 1 (100%). */
export const volatility = (xs) => {
  const m = mean(xs);
  return m > 0 ? Math.min(1, stdDev(xs) / m) : 0;
};

/**
 * Safe draw = min( average revenue x (1 - V), target draw ).
 * With adjustForVolatility = false (Starter plan) the volatility haircut is skipped.
 */
export function calcSafeDraw(entries, target, adjustForVolatility = true) {
  const avg = mean(entries);
  const v = volatility(entries);
  const adjusted = adjustForVolatility ? avg * (1 - v) : avg;
  const draw = Math.max(0, Math.min(adjusted, target));
  let limitedBy = 'target';
  if (adjusted < target) limitedBy = adjustForVolatility ? 'volatility' : 'income';
  return { avg, volatility: v, adjusted, draw, limitedBy };
}

/* ---------- Safe-to-Spend ---------- */
/** Safe-to-spend = cash - (tax reserve + 30-day expenses + emergency buffer). */
export function calcSafeToSpend({ cash, tax, expenses, buffer }) {
  const reserved = tax + expenses + buffer;
  const safe = cash - reserved;
  return { safe, reserved, short: safe < 0 };
}

/** Arc segment lengths (0 to 100) for the gauge: tax, burn (expenses + buffer), safe. */
export function dialSegments({ cash, tax, expenses, buffer }) {
  const burn = expenses + buffer;
  const { safe, reserved, short } = calcSafeToSpend({ cash, tax, expenses, buffer });
  if (!short) {
    const base = cash > 0 ? cash : 1;
    return { tax: (tax / base) * 100, burn: (burn / base) * 100, safe: (safe / base) * 100 };
  }
  return { tax: (tax / reserved) * 100, burn: (burn / reserved) * 100, safe: 0 };
}

/* ---------- 12-month liquidity simulator ---------- */
/**
 * Projects the spendable balance month by month.
 * - Revenue drop scales every future payment down.
 * - Invoice delay pushes each payment back, so the first months receive less cash.
 * - Each payment is reduced by the tax set-aside rate; expenses and the owner draw leave every month.
 */
export function projectLiquidity({
  startBalance, monthlyInflow, revenueDropPct = 0, delayDays = 0,
  monthlyExpenses, monthlyDraw, taxRate, months = 12,
}) {
  const factor = 1 - revenueDropPct / 100;
  const billed = (j) => (j >= 1 ? monthlyInflow * factor : 0);
  const whole = Math.floor(delayDays / 30);
  const frac = (delayDays % 30) / 30;

  let balance = startBalance;
  const points = [{ month: 0, balance: Math.round(balance) }];
  for (let t = 1; t <= months; t++) {
    const received = (1 - frac) * billed(t - whole) + frac * billed(t - whole - 1);
    balance += received * (1 - taxRate) - monthlyExpenses - monthlyDraw;
    points.push({ month: t, balance: Math.round(balance) });
  }
  return points;
}

export function summarizeProjection(points, buffer) {
  const lowest = points.reduce((a, p) => (p.balance < a.balance ? p : a), points[0]);
  const zero = points.find((p) => p.balance < 0);
  const below = points.find((p) => p.balance < buffer);
  return {
    lowest,
    end: points[points.length - 1].balance,
    zeroMonth: zero ? zero.month : null,
    bufferMonth: below ? below.month : null,
  };
}

/* ---------- Read numbers from the local books ---------- */
/**
 * Cash = income minus expenses recorded for the entity.
 * Monthly expenses = average of the last 90 days, ignoring owner distributions.
 */
export async function getRecordedSnapshot(entity = 'business') {
  const all = await db.transactions.toArray();
  const rows = entity === 'consolidated' ? all : all.filter((t) => t.entity === entity);
  const cash = rows.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceIso = toISODate(since);
  const spent = rows
    .filter((t) => t.type === 'expense' && t.category !== 'Owner Distribution' && t.date >= sinceIso)
    .reduce((sum, t) => sum + t.amount, 0);

  return { count: rows.length, cash: Math.max(0, Math.round(cash)), monthlyExpenses: Math.round(spent / 3) };
}

/* ---------- starting values for the Safe-to-Spend inputs ---------- */
/** Cash and tax reserve come from recorded transactions when there are any; otherwise sample values. */
export async function getDefaultCashInputs(entity, settings) {
  const recorded = await getRecordedSnapshot(entity);
  if (!recorded.count) return { cash: 48000, tax: 11500, expenses: settings.monthlyBurn, buffer: settings.bufferTarget };
  const { gross } = await getYearFigures(nextDeadline(new Date()).taxYear);
  const tax = entity === 'personal' ? 0 : Math.round(gross * effectiveTaxRate(settings));
  return { cash: recorded.cash, tax, expenses: settings.monthlyBurn, buffer: settings.bufferTarget };
}

/* ---------- 30-day forecast ---------- */
/**
 * Day-by-day spendable balance for the next 30 days.
 * Expenses leave evenly (monthly burn / 30). Each receipt { day, amount } arrives on its day,
 * reduced by the tax set-aside rate.
 */
export function buildForecast30({ startBalance, monthlyBurn, receipts, taxRate, days = 30 }) {
  const daily = monthlyBurn / 30;
  let balance = startBalance;
  const points = [{ day: 0, balance: Math.round(balance) }];
  for (let d = 1; d <= days; d++) {
    balance -= daily;
    receipts.filter((r) => r.day === d).forEach((r) => { balance += r.amount * (1 - taxRate); });
    points.push({ day: d, balance: Math.round(balance) });
  }
  return points;
}
