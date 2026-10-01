// src/clients.js
// Service 03 helpers: effective hourly rate ranking, scope-creep insights, invoice maths.
// Pure functions with no React, so the AI advisor can reuse them later.

import { computeEHR } from './db';

export const EHR_HIGH = 150; // above this is high margin
export const EHR_TARGET = 75; // below this is toxic
export const TERMS = [15, 30, 60];

const round2 = (n) => Math.round(n * 100) / 100;

export const ehrTier = (ehr) => (ehr > EHR_HIGH ? 'high' : ehr >= EHR_TARGET ? 'target' : 'toxic');

export const totalHours = (c) => (Number(c.trackedHours) || 0) + (Number(c.scopeCreepHours) || 0);

export const scopeCreepShare = (c) => {
  const h = totalHours(c);
  return h > 0 ? (Number(c.scopeCreepHours) || 0) / h : 0;
};

/** Active clients ranked by effective hourly rate (highest first); paused clients listed separately. */
export function rankClients(clients) {
  const withEhr = clients.map((c) => ({ ...c, ehr: computeEHR(c) }));
  return {
    active: withEhr.filter((c) => c.status !== 'paused').sort((a, b) => b.ehr - a.ehr),
    paused: withEhr.filter((c) => c.status === 'paused'),
  };
}

/** Blended EHR across a set of clients: total (revenue - direct costs) / total hours. */
export function blendedEhr(clients) {
  const profit = clients.reduce((s, c) => s + (Number(c.monthlyRetainer) || 0) - (Number(c.directCosts) || 0), 0);
  const hours = clients.reduce((s, c) => s + totalHours(c), 0);
  return hours > 0 ? profit / hours : 0;
}

/** What the EHR would be if the unbilled scope-creep hours were billed at the client's target rate (or $75). */
export function ehrIfCreepBilled(c) {
  const rate = Number(c.hourlyRateTarget) > 0 ? Number(c.hourlyRateTarget) : EHR_TARGET;
  const hours = totalHours(c);
  const extra = (Number(c.scopeCreepHours) || 0) * rate;
  const ehr = hours > 0 ? ((Number(c.monthlyRetainer) || 0) + extra - (Number(c.directCosts) || 0)) / hours : 0;
  return { rate, extra, ehr };
}

/* ---------- invoices ---------- */
export const lineAmount = (item) => round2((Number(item.qty) || 0) * (Number(item.rate) || 0));

/** Subtotal, mandatory tax reserve (taxRate as a fraction), and what is left after the reserve. */
export function calcInvoice(items, taxRate) {
  const subtotal = round2(items.reduce((s, i) => s + lineAmount(i), 0));
  const reserve = round2(subtotal * taxRate);
  return { subtotal, reserve, keep: round2(subtotal - reserve) };
}

export function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A sent invoice past its due date counts as overdue even if it was never updated. */
export function displayStatus(inv, todayIso) {
  return inv.status === 'sent' && inv.dueDate < todayIso ? 'overdue' : inv.status;
}
