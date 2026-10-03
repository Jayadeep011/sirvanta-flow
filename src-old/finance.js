// src/finance.js
// Pure calculation helpers for Service 01 (cash flow). No React in here, so the same
// functions can also feed the AI advisor's context snapshot in a later step.

import { db, toISODate } from './db';

/* ---------- formatting ---------- */
export const usd = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const usdCompact = (n) => {
  const a = Math.abs(n);
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `$${Math.round(a)}`;
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
