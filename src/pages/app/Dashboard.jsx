// src/pages/app/Dashboard.jsx
// Dashboard Overview: headline numbers, the Safe-to-Spend dial, a 30-day forecast, tax warnings,
// client alerts and recent activity. Everything is read live from the local database.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarClock, FileText } from 'lucide-react';
import { db, toISODate } from '../../db';
import { useStore } from '../../store';
import { usd, usdCompact, calcSafeToSpend, buildForecast30 } from '../../finance';
import { nextDeadline, daysUntil, fmtDate, getYearFigures } from '../../tax';
import { rankClients, blendedEhr, ehrTier, displayStatus, scopeCreepShare } from '../../clients';
import useCashModel from '../../hooks/useCashModel';
import PageHeader from '../../components/PageHeader';
import { SafeDial } from '../../components/CashFlowTab';
import { CARD, CARD_TEAL, CARD_BLUE, CARD_GOLD, TINT_RED, TINT_GOLD, TINT_TEAL, MUTED, GOLD_TEXT, DIVIDER } from '../../ui';

function Sparkline({ data, color }) {
  return (
    <div className="h-10 w-24" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}><Line type="monotone" dataKey="balance" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ label, value, hint, tone, children }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs font-medium ${MUTED}`}>{label}</p>
          <p className={`mt-1 truncate text-2xl font-bold tabular-nums ${tone || ''}`}>{value}</p>
        </div>
        {children}
      </div>
      {hint && <p className={`mt-1 text-xs ${MUTED}`}>{hint}</p>}
    </div>
  );
}

const daysBetween = (isoA, isoB) => Math.round((new Date(`${isoB}T12:00:00`) - new Date(`${isoA}T12:00:00`)) / 86400000);

export default function DashboardPage() {
  const m = useCashModel();
  const darkMode = useStore((s) => s.darkMode);
  const { inputs, taxRate } = m;

  const clients = useLiveQuery(() => db.clients.toArray(), [], []);
  const invoices = useLiveQuery(() => db.invoices.toArray(), [], []);
  const recentTx = useLiveQuery(() => db.transactions.orderBy('date').reverse().limit(8).toArray(), [], []);
  const calendar = useMemo(() => nextDeadline(new Date()), []);
  const figures = useLiveQuery(() => getYearFigures(calendar.taxYear), [calendar.taxYear]);

  const today = toISODate();
  const { safe, short } = calcSafeToSpend(inputs);
  const { active } = useMemo(() => rankClients(clients), [clients]);
  const overdue = invoices.filter((i) => displayStatus(i, today) === 'overdue');
  const overdueTotal = overdue.reduce((s, i) => s + i.amount, 0);

  /* ---- 30-day forecast: expected invoice payments in, fixed expenses out ---- */
  const forecast = useMemo(() => {
    const delays = Object.fromEntries(clients.map((c) => [c.name, c.avgPaymentDelayDays || 0]));
    const receipts = [];
    invoices.forEach((inv) => {
      const status = displayStatus(inv, today);
      if (status !== 'sent' && status !== 'overdue') return;
      let day = daysBetween(today, inv.dueDate) + (delays[inv.clientName] || 0);
      if (day < 1) day = 7; // already late: assume it arrives within a week
      if (day <= 30) receipts.push({ day, amount: inv.amount });
    });
    const points = buildForecast30({ startBalance: inputs.cash - inputs.tax, monthlyBurn: inputs.expenses, receipts, taxRate });
    const base = new Date();
    return points.map((p) => ({ ...p, label: new Date(base.getFullYear(), base.getMonth(), base.getDate() + p.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }));
  }, [clients, invoices, inputs, taxRate, today]);

  const lowest = forecast.reduce((a, p) => (p.balance < a.balance ? p : a), forecast[0]);
  const endBalance = forecast[forecast.length - 1].balance;

  /* ---- tax warnings ---- */
  const days = daysUntil(calendar.next.date);
  const estimate = figures ? Math.round(figures.gross * taxRate) : 0;
  const reserveGap = Math.max(0, estimate - inputs.tax);
  const warnings = [];
  if (short) warnings.push({ tone: 'red', text: `Your reserves exceed your cash by ${usd(-safe)}. Hold spending until income arrives.` });
  if (reserveGap > 0) warnings.push({ tone: 'amber', text: `Your tax reserve is ${usd(reserveGap)} below the ${usd(estimate)} estimated from this year's income.` });
  if (days <= 30) warnings.push({ tone: 'amber', text: `${calendar.next.quarter} payment is due in ${days} ${days === 1 ? 'day' : 'days'}.` });
  if (overdue.length > 0) warnings.push({ tone: 'amber', text: `${overdue.length} overdue ${overdue.length === 1 ? 'invoice' : 'invoices'} worth ${usd(overdueTotal)}.` });

  /* ---- client alerts ---- */
  const alerts = active
    .filter((c) => ehrTier(c.ehr) === 'toxic' || scopeCreepShare(c) >= 0.3 || c.avgPaymentDelayDays > 30)
    .slice(0, 4);

  /* ---- activity feed ---- */
  const feed = useMemo(() => {
    const items = recentTx.map((t) => ({
      key: `t${t.id}`, date: t.date, title: t.description, sub: t.category,
      amount: t.type === 'income' ? t.amount : -t.amount, kind: 'tx',
    }));
    invoices.slice(-4).forEach((i) => items.push({
      key: `i${i.id}`, date: i.issueDate, title: `Invoice ${i.invoiceNumber}`, sub: `${i.clientName} · ${displayStatus(i, today)}`, amount: i.amount, kind: 'invoice',
    }));
    return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  }, [recentTx, invoices, today]);

  const axis = darkMode ? '#A1A1AA' : '#64748B';
  const grid = darkMode ? '#27272A' : '#E2E8F0';
  const tones = { red: TINT_RED, amber: TINT_GOLD };

  return (
    <div>
      <PageHeader title="Dashboard Overview" description="Where your money stands today, what the next 30 days look like, and what needs attention." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Safe to spend" value={usd(safe)} tone={short ? 'text-[#DC2626]' : 'text-[#16A34A]'} hint="After tax, bills and buffer">
          <Sparkline data={forecast} color={short ? '#DC2626' : '#16A34A'} />
        </StatCard>
        <StatCard label="Locked for taxes" value={usd(inputs.tax)} tone="text-[#D97706]" hint={`Estimate this year: ${usd(estimate)}`} />
        <StatCard label="Average monthly income" value={usd(m.engine.avg)} hint={`Volatility ${Math.round(m.engine.volatility * 100)}%`} />
        <StatCard label="Overdue invoices" value={usd(overdueTotal)} tone={overdue.length ? 'text-[#DC2626]' : ''} hint={`${overdue.length} ${overdue.length === 1 ? 'invoice' : 'invoices'}`} />
        <StatCard label="Blended hourly rate" value={`${usd(blendedEhr(active))}/hr`} hint={`${active.length} active ${active.length === 1 ? 'client' : 'clients'}`} />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
        <section className={`${CARD_TEAL} p-6`} aria-labelledby="dash-dial">
          <div className="flex items-center justify-between">
            <h2 id="dash-dial" className="text-lg font-semibold">Safe-to-Spend</h2>
            <Link to="/app/safe-to-spend" className={`inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>Open engine <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          <div className="mt-4"><SafeDial inputs={inputs} /></div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
            {[['bg-[#D97706]', 'Tax', usd(inputs.tax)], ['bg-slate-500 dark:bg-zinc-500', 'Bills + buffer', usd(inputs.expenses + inputs.buffer)], ['bg-[#16A34A]', 'Safe', usd(Math.max(safe, 0))]].map(([dot, label, value]) => (
              <div key={label}><dt className={`flex items-center gap-1.5 ${MUTED}`}><span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />{label}</dt><dd className="mt-0.5 font-semibold tabular-nums">{value}</dd></div>
            ))}
          </dl>
        </section>

        <section className={`${CARD_BLUE} p-6 xl:col-span-2`} aria-labelledby="dash-forecast">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="dash-forecast" className="text-lg font-semibold">30-day forecast</h2>
              <p className={`mt-1 text-sm ${MUTED}`}>Spendable cash after tax, with expected invoice payments in and fixed expenses out.</p>
            </div>
            <div className="flex gap-4 text-right text-sm">
              <div><p className={`text-xs ${MUTED}`}>Lowest</p><p className={`font-bold tabular-nums ${lowest.balance < 0 ? 'text-[#DC2626]' : ''}`}>{usd(lowest.balance)}</p></div>
              <div><p className={`text-xs ${MUTED}`}>In 30 days</p><p className={`font-bold tabular-nums ${endBalance < 0 ? 'text-[#DC2626]' : ''}`}>{usd(endBalance)}</p></div>
            </div>
          </div>
          <div className="mt-4 h-60 w-full" role="img" aria-label="Forecast of spendable balance for the next 30 days">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2E5FBF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2E5FBF" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" interval={6} tick={{ fill: axis, fontSize: 12 }} axisLine={{ stroke: grid }} tickLine={false} />
                <YAxis tickFormatter={usdCompact} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(v) => [usd(v), 'Spendable']} contentStyle={{ background: darkMode ? '#18181B' : '#FFFFFF', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 13 }} labelStyle={{ color: axis }} />
                <ReferenceLine y={0} stroke="#DC2626" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="balance" stroke="#5B8DEF" strokeWidth={2.5} fill="url(#dashBlue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className={`mt-3 text-xs leading-relaxed ${MUTED}`}>Unpaid invoices are expected on their due date plus the client&apos;s average payment delay. Invoices already late are assumed to arrive within a week. Each payment is reduced by your tax set-aside rate.</p>
        </section>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <section className={`${CARD_GOLD} p-6`} aria-labelledby="dash-tax">
          <h2 id="dash-tax" className="text-lg font-semibold">Tax reserve</h2>
          <div className={`mt-4 rounded-xl p-4 ${TINT_TEAL}`}>
            <p className="flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} aria-hidden="true" />{calendar.next.quarter} payment · {fmtDate(calendar.next.date)}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{days}<span className={`ml-2 text-sm font-medium ${MUTED}`}>{days === 1 ? 'day' : 'days'} left</span></p>
          </div>
          <ul className="mt-4 space-y-2" aria-live="polite">
            {warnings.length === 0 && <li className={`rounded-lg p-3 text-sm ${TINT_TEAL}`}>Nothing needs attention right now.</li>}
            {warnings.map((w) => (
              <li key={w.text} className={`flex gap-2 rounded-lg p-3 text-sm ${tones[w.tone]}`}><AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#D97706]" aria-hidden="true" />{w.text}</li>
            ))}
          </ul>
          <Link to="/app/tax-vault" className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>Open Tax Vault <ArrowRight size={14} aria-hidden="true" /></Link>
        </section>

        <section className={`${CARD} p-6`} aria-labelledby="dash-clients">
          <h2 id="dash-clients" className="text-lg font-semibold">Client alerts</h2>
          {alerts.length === 0 ? (
            <p className={`mt-4 rounded-lg p-3 text-sm ${TINT_TEAL}`}>No clients are flagged. Rates, scope and payment times look healthy.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {alerts.map((c) => (
                <li key={c.id} className={`rounded-lg border p-3 text-sm ${DIVIDER}`}>
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold">{c.name}</span><span className="font-bold tabular-nums">{usd(c.ehr)}/hr</span></div>
                  <p className={`mt-1 text-xs ${MUTED}`}>
                    {[ehrTier(c.ehr) === 'toxic' && 'Below your rate floor', scopeCreepShare(c) >= 0.3 && `${Math.round(scopeCreepShare(c) * 100)}% unbilled scope creep`, c.avgPaymentDelayDays > 30 && `Pays ${c.avgPaymentDelayDays} days late`].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/app/client-matrix" className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>Open Client Matrix <ArrowRight size={14} aria-hidden="true" /></Link>
        </section>

        <section className={`${CARD} p-6`} aria-labelledby="dash-activity">
          <h2 id="dash-activity" className="text-lg font-semibold">Recent activity</h2>
          {feed.length === 0 ? (
            <p className={`mt-4 rounded-lg p-3 text-sm ${TINT_TEAL}`}>No activity yet. Import a statement or add a client to get started.</p>
          ) : (
            <ul className="mt-4">
              {feed.map((f) => (
                <li key={f.key} className={`flex items-center gap-3 border-t py-2.5 first:border-t-0 ${DIVIDER}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${f.kind === 'invoice' ? 'bg-[#E6E4F7] text-[#5B4FC4] dark:bg-[#1A1830] dark:text-[#8B83F0]' : f.amount >= 0 ? 'bg-[#DCF3E4] text-[#146C34] dark:bg-[#0F2A1A] dark:text-[#4ADE80]' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-zinc-300'}`}>
                    {f.kind === 'invoice' ? <FileText size={15} aria-hidden="true" /> : f.amount >= 0 ? <ArrowDownLeft size={15} aria-hidden="true" /> : <ArrowUpRight size={15} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{f.title}</span><span className={`block truncate text-xs ${MUTED}`}>{f.date} · {f.sub}</span></span>
                  <span className={`text-sm font-semibold tabular-nums ${f.amount >= 0 ? 'text-[#16A34A]' : ''}`}>{f.amount >= 0 ? '+' : '−'}{usd(Math.abs(f.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
