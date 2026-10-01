// src/tax.js
// Service 02 helpers: tax reserve, IRS quarterly deadlines, Schedule C savings,
// write-off scanning, yield radar, and the 1040-ES planning worksheet.
// Rates are whole percentages (24 means 24%). Everything here is a simplified planning
// estimate that applies each rate to gross revenue, as the product spec defines.

import { db } from './db';

export const FEDERAL_BRACKETS = [10, 12, 22, 24, 32, 35, 37];
export const STATE_RATES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.3];
export const SE_RATE = 15.3;

/** Business meals are only 50% deductible; everything else is 100%. */
export const DEDUCTIBLE_PCT = { 'Client Meals': 0.5 };
export const deductibleAmount = (amount, category) => amount * (DEDUCTIBLE_PCT[category] ?? 1);

export const combinedRate = ({ federal, state, se }) => (federal + state + (se ? SE_RATE : 0)) / 100;

export function calcReserve(gross, rates) {
  const g = Math.max(0, Number(gross) || 0);
  const federal = (g * rates.federal) / 100;
  const state = (g * rates.state) / 100;
  const selfEmployment = rates.se ? (g * SE_RATE) / 100 : 0;
  const total = federal + state + selfEmployment;
  return { federal, state, selfEmployment, total, keep: g - total, rate: combinedRate(rates) };
}

/** Tax saved by a write-off = deductible amount x (federal + state + self-employment rate). */
export const deductionValue = (amount, category, rates) => deductibleAmount(amount, category) * combinedRate(rates);

/* ---------- IRS estimated-tax calendar ---------- */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Deadlines that land on a weekend move to the next Monday (holidays are not modelled). */
const shiftToBusinessDay = (d) => {
  const x = new Date(d);
  if (x.getDay() === 6) x.setDate(x.getDate() + 2);
  else if (x.getDay() === 0) x.setDate(x.getDate() + 1);
  return x;
};

export function taxYearFor(today = new Date()) {
  const y = today.getFullYear();
  return startOfDay(today) <= shiftToBusinessDay(new Date(y, 0, 15)) ? y - 1 : y;
}

export function deadlinesFor(taxYear) {
  return [
    { quarter: 'Q1', period: 'Jan 1 to Mar 31', date: new Date(taxYear, 3, 15) },
    { quarter: 'Q2', period: 'Apr 1 to May 31', date: new Date(taxYear, 5, 15) },
    { quarter: 'Q3', period: 'Jun 1 to Aug 31', date: new Date(taxYear, 8, 15) },
    { quarter: 'Q4', period: 'Sep 1 to Dec 31', date: new Date(taxYear + 1, 0, 15) },
  ].map((d) => ({ ...d, date: shiftToBusinessDay(d.date) }));
}

export function nextDeadline(today = new Date()) {
  const taxYear = taxYearFor(today);
  const all = deadlinesFor(taxYear);
  const start = startOfDay(today);
  const upcoming = all.filter((d) => d.date >= start);
  const next = upcoming[0];
  const index = all.indexOf(next);
  const previous = index > 0 ? all[index - 1].date : new Date(taxYear, 0, 15);
  return { taxYear, all, next, remaining: upcoming.length, previous };
}

export const daysUntil = (date, today = new Date()) => Math.round((startOfDay(date) - startOfDay(today)) / 86400000);

export const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/* ---------- reading the local books ---------- */
const quarterIndexForMonth = (m) => (m <= 2 ? 0 : m <= 4 ? 1 : m <= 7 ? 2 : 3);

/** Business gross revenue (total and per IRS payment period) and deductible expenses for a tax year. */
export async function getYearFigures(taxYear) {
  const rows = await db.transactions.where('date').between(`${taxYear}-01-01`, `${taxYear}-12-31`, true, true).toArray();
  const biz = rows.filter((t) => t.entity === 'business');
  const byQuarter = [0, 0, 0, 0];
  let gross = 0;
  biz.forEach((t) => {
    if (t.type === 'income' && t.category !== 'Owner Distribution') {
      gross += t.amount;
      byQuarter[quarterIndexForMonth(Number(t.date.slice(5, 7)) - 1)] += t.amount;
    }
  });
  const deductibles = biz.filter((t) => t.type === 'expense' && t.isDeductible).sort((a, b) => (a.date < b.date ? 1 : -1));
  return { gross, byQuarter, deductibles };
}

/* ---------- Schedule C scanner ---------- */
const KEYWORDS = [
  ['Office Expenses/SaaS', ['software', 'saas', 'subscription', 'adobe', 'figma', 'notion', 'slack', 'zoom', 'github', 'office', 'domain', 'canva', 'microsoft', 'workspace']],
  ['Cloud Equipment', ['aws', 'azure', 'hosting', 'cloud', 'server', 'digitalocean', 'vercel', 'netlify', 'laptop', 'monitor']],
  ['Advertising', ['ads', 'advertis', 'facebook', 'meta', 'linkedin', 'campaign', 'promo', 'sponsor']],
  ['Travel', ['flight', 'airline', 'hotel', 'airbnb', 'uber', 'lyft', 'train', 'conference', 'travel', 'rental car']],
  ['Client Meals', ['restaurant', 'client dinner', 'client lunch', 'coffee', 'meal', 'cafe']],
];

const KEYWORD_REGEX = KEYWORDS.map(([category, words]) => [category, words.map((w) => new RegExp(`\\b${w}`, 'i'))]);

export function suggestCategory(text) {
  for (const [category, patterns] of KEYWORD_REGEX) {
    if (patterns.some((re) => re.test(text))) return category;
  }
  return null;
}

/** Business expenses not yet flagged deductible whose description looks like a Schedule C category. */
export async function scanForWriteOffs(taxYear) {
  const rows = await db.transactions.where('date').between(`${taxYear}-01-01`, `${taxYear}-12-31`, true, true).toArray();
  return rows
    .filter((t) => t.entity === 'business' && t.type === 'expense' && !t.isDeductible && t.category !== 'Owner Distribution')
    .map((t) => ({ ...t, suggested: suggestCategory(`${t.description} ${t.category}`) }))
    .filter((t) => t.suggested);
}

/* ---------- Yield radar ---------- */
export function calcYield({ balance, checkingApr, hysaApr }) {
  const annual = Math.max(0, balance) * Math.max(0, hysaApr - checkingApr) / 100;
  return { annual, monthly: annual / 12 };
}

/* ---------- 1040-ES planning worksheet ---------- */
export function buildVoucherText({ taxYear, next, rates, gross, locked, paid, stillOwed, payment }) {
  const money = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  const rate = combinedRate(rates);
  const federalShare = rate > 0 ? (rates.federal + (rates.se ? SE_RATE : 0)) / 100 / rate : 0;
  const federalPart = payment * federalShare;
  return [
    'FORM 1040-ES ESTIMATED TAX PLANNING WORKSHEET',
    'Prepared by Sirvanta Flow. A planning estimate, not an IRS form.',
    '',
    `Tax year:                     ${taxYear}`,
    `Payment:                      ${next.quarter} (income ${next.period})`,
    `Due date:                     ${fmtDate(next.date)}`,
    '',
    `Gross revenue, year to date:  ${money(gross)}`,
    `Federal rate:                 ${rates.federal}%`,
    `State rate:                   ${rates.state}%`,
    `Self-employment tax:          ${rates.se ? `${SE_RATE}%` : 'not included'}`,
    `Combined reserve rate:        ${(rate * 100).toFixed(1)}%`,
    '',
    `Reserved for the year:        ${money(locked)}`,
    `Already paid this year:       ${money(paid)}`,
    `Still to pay:                 ${money(stillOwed)}`,
    '',
    `SUGGESTED PAYMENT:            ${money(payment)}`,
    `  Federal and self-employment: ${money(federalPart)}`,
    `  State (pay to your state):   ${money(payment - federalPart)}`,
    '',
    'How to pay: use IRS Direct Pay or your IRS online account at irs.gov/payments,',
    'or mail a Form 1040-ES voucher with a check. State estimated tax is paid to your state agency.',
    '',
    'Important: this worksheet applies your rates to gross revenue. Your actual liability depends on net',
    'profit, deductions, credits, and prior payments. Confirm the amount with a CPA or tax preparer.',
    '',
  ].join('\n');
}
