// src/pages/app/VirtualSalary.jsx
// Virtual Salary: the engine, a pay schedule, the gross revenue needed to fund the draw, and the distribution log.

import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { usd } from '../../finance';
import useCashModel from '../../hooks/useCashModel';
import PageHeader from '../../components/PageHeader';
import LockedCard from '../../components/LockedCard';
import { SalaryEngineCard } from '../../components/CashFlowTab';
import { CARD_TEAL, CARD_BLUE, TINT_TEAL, TINT_BLUE, MUTED, DIVIDER } from '../../ui';

const PAYDAY_KEY = 'sirvanta-payday';

const readPayday = () => {
  try {
    const n = Number(localStorage.getItem(PAYDAY_KEY));
    return n >= 1 && n <= 28 ? n : 1;
  } catch {
    return 1;
  }
};

function nextPaydays(day, count = 3) {
  const now = new Date();
  const dates = [];
  for (let i = 0; dates.length < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, day);
    if (d >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) dates.push(d);
  }
  return dates;
}

function ScheduleCard({ draw, taxRate }) {
  const [day, setDay] = useState(readPayday);
  const dates = useMemo(() => nextPaydays(day), [day]);
  const grossNeeded = taxRate < 1 ? draw / (1 - taxRate) : draw;

  const change = (value) => {
    const n = Math.min(28, Math.max(1, Number(value) || 1));
    setDay(n);
    try { localStorage.setItem(PAYDAY_KEY, String(n)); } catch { /* the choice still applies this session */ }
  };

  return (
    <section className={`${CARD_BLUE} p-6`} aria-labelledby="sched-title">
      <h2 id="sched-title" className="text-lg font-semibold">Pay schedule</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>Pay yourself the same amount on the same day, whatever the month brought in.</p>

      <div className="mt-5">
        <label htmlFor="payday" className="mb-1 block text-sm font-medium">Day of the month</label>
        <input id="payday" type="number" min="1" max="28" value={day} onChange={(e) => change(e.target.value)} className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums dark:border-white/15 dark:bg-zinc-950" />
      </div>

      <ul className="mt-4 space-y-2">
        {dates.map((d) => (
          <li key={d.toISOString()} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${TINT_BLUE}`}>
            <span className="font-medium">{d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="font-semibold tabular-nums">{usd(draw)}</span>
          </li>
        ))}
      </ul>

      <div className={`mt-5 rounded-lg p-4 ${TINT_TEAL}`}>
        <p className={`text-xs ${MUTED}`}>Revenue needed each month to fund this draw after tax</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{usd(grossNeeded)}</p>
        <p className={`mt-1 text-xs ${MUTED}`}>Draw ÷ (1 − {(taxRate * 100).toFixed(1)}% tax rate). About {usd(grossNeeded - draw)} of it goes to the tax vault.</p>
      </div>
      <p className={`mt-4 border-t pt-3 text-xs ${DIVIDER} ${MUTED}`}>The schedule is a reminder. Money only moves when you record a transfer in the engine and send it at your bank.</p>
    </section>
  );
}

function DistributionLog() {
  const rows = useLiveQuery(
    () => db.transactions.where('category').equals('Owner Distribution').filter((t) => t.type === 'expense').toArray(),
    [],
    []
  );
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));
  const year = String(new Date().getFullYear());
  const thisYear = sorted.filter((r) => r.date.startsWith(year)).reduce((s, r) => s + r.amount, 0);

  return (
    <section className={`${CARD_TEAL} p-6`} aria-labelledby="dist-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="dist-title" className="text-lg font-semibold">Distribution log</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>Every transfer you recorded from the business to yourself.</p>
        </div>
        <div className={`rounded-lg px-3 py-2 text-right ${TINT_TEAL}`}>
          <p className={`text-xs ${MUTED}`}>Drawn in {year}</p>
          <p className="text-lg font-bold tabular-nums">{usd(thisYear)}</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className={`mt-5 rounded-lg p-4 text-sm ${TINT_TEAL}`}>No transfers yet. Use “Transfer to Personal Bank Account” in the engine to record your first draw.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[24rem] text-left text-sm">
            <caption className="sr-only">Owner distributions</caption>
            <thead className={MUTED}><tr><th className="py-2 pr-3 font-medium">Date</th><th className="pr-3 font-medium">Description</th><th className="text-right font-medium">Amount</th></tr></thead>
            <tbody>
              {sorted.slice(0, 12).map((r) => (
                <tr key={r.id} className={`border-t ${DIVIDER}`}>
                  <td className="py-2 pr-3 whitespace-nowrap">{r.date}</td>
                  <td className="pr-3">{r.description}</td>
                  <td className="text-right font-semibold tabular-nums">{usd(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function VirtualSalaryPage() {
  const m = useCashModel();
  return (
    <div>
      <PageHeader title="Virtual Salary" description="Turn six uneven months into one steady paycheck, schedule it, and keep a log of every distribution." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <LockedCard locked={!m.hasStarter} tier="starter" label="Virtual Salary Engine">
          <SalaryEngineCard
            entries={m.entries}
            labels={m.labels}
            overridden={m.overridden}
            onEdit={m.editEntry}
            onReset={m.resetOverride}
            target={m.target}
            setTarget={m.setTarget}
            engine={m.engine}
            full={m.full}
            userTier={m.userTier}
          />
        </LockedCard>
        <div className="space-y-6">
          <ScheduleCard draw={m.engine.draw} taxRate={m.taxRate} />
          <DistributionLog />
        </div>
      </div>
    </div>
  );
}
