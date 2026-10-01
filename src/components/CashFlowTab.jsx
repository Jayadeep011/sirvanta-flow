// src/components/CashFlowTab.jsx
// Service 01: Irregular cash flow and income smoothing.
//   - Safe-to-Spend dial (all plans)
//   - Virtual Salary Engine (Starter: basic, Pro and above: volatility-adjusted)
//   - 12-month liquidity simulator with stress sliders (Pro and above)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Lock, RotateCcw } from 'lucide-react';
import { getSettings, updateSettings, getMonthlyIncomeHistory, logPersonalDistribution, effectiveTaxRate, TIER_LIMITS } from '../db';
import { useStore } from '../store';
import { tierAtLeast, lockedMessage } from '../plans';
import MoneyField from './MoneyField';
import LockedCard from './LockedCard';
import {
  usd, usdCompact, monthLabel, calcSafeDraw, calcSafeToSpend, dialSegments,
  projectLiquidity, summarizeProjection, getRecordedSnapshot,
} from '../finance';
import { CARD_BLUE, CARD_TEAL, CARD_INDIGO, TINT_BLUE, TINT_TEAL, TINT_GOLD, MUTED, GOLD_TEXT, DIVIDER, BTN_GOLD, BTN_OUTLINE } from '../ui';

const ARC = 'M 20 130 A 110 110 0 0 1 240 130';

function SafeDial({ inputs }) {
  const { safe, short } = calcSafeToSpend(inputs);
  const seg = dialSegments(inputs);
  const parts = [
    { len: seg.tax, start: 0, cls: 'stroke-[#D97706]' },
    { len: seg.burn, start: seg.tax, cls: 'stroke-[#655D4C] dark:stroke-[#71717A]' },
    { len: seg.safe, start: seg.tax + seg.burn, cls: 'stroke-[#16A34A]' },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <svg viewBox="0 0 260 150" className="w-full" role="img" aria-label={`Safe to spend ${usd(Math.max(safe, 0))}`}>
        <path d={ARC} fill="none" strokeWidth="18" pathLength="100" className="stroke-[#E5DAC2] dark:stroke-[#27272A]" />
        {parts.map((p, i) =>
          p.len > 0.2 ? (
            <path
              key={i}
              d={ARC}
              fill="none"
              strokeWidth="18"
              pathLength="100"
              strokeDasharray={`${p.len} ${100 - p.len}`}
              strokeDashoffset={-p.start}
              className={`${p.cls} transition-all duration-300 motion-reduce:transition-none`}
            />
          ) : null
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center" aria-live="polite">
        <div className={`text-4xl font-bold tabular-nums ${short ? 'text-[#DC2626]' : ''}`}>{usd(safe)}</div>
        <div className={`text-xs ${MUTED}`}>{short ? 'Short of your reserves' : 'Safe to spend'}</div>
      </div>
    </div>
  );
}

/* ---------- Safe-to-Spend card ---------- */
function SafeToSpendCard({ inputs, setInputs, taxRate, canSave, entity }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const { safe, short } = calcSafeToSpend(inputs);
  const set = (key) => (value) => setInputs((p) => ({ ...p, [key]: value }));

  const persist = () => {
    if (canSave) updateSettings({ monthlyBurn: inputs.expenses, bufferTarget: inputs.buffer }).catch(() => {});
  };

  const fillFromRecords = async () => {
    setBusy(true);
    try {
      const snap = await getRecordedSnapshot(entity);
      if (!snap.count) {
        setNote('No transactions are recorded for this entity yet.');
      } else {
        setInputs((p) => ({ ...p, cash: snap.cash, expenses: snap.monthlyExpenses }));
        setNote(`Filled cash and monthly expenses from ${snap.count} recorded transactions.`);
      }
    } catch {
      setNote('Could not read your records. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${CARD_TEAL} p-6`} aria-labelledby="sts-title">
      <h2 id="sts-title" className="text-lg font-semibold">Safe-to-Spend</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>What is left after tax, the next 30 days of bills, and your emergency buffer.</p>

      <div className="mt-5"><SafeDial inputs={inputs} /></div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {[
          ['bg-[#D97706]', 'Locked for tax', usd(inputs.tax)],
          ['bg-[#655D4C] dark:bg-[#71717A]', 'Bills and buffer', usd(inputs.expenses + inputs.buffer)],
          ['bg-[#16A34A]', 'Safe', usd(Math.max(safe, 0))],
        ].map(([dot, label, value]) => (
          <div key={label}>
            <dt className={`flex items-center gap-1.5 ${MUTED}`}><span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <p className={`mt-4 text-sm ${short ? 'text-[#DC2626]' : MUTED}`}>
        {short
          ? `Your reserves exceed your cash by ${usd(-safe)}. Hold spending until income arrives.`
          : `${usd(safe)} is free to spend without touching taxes, bills, or your buffer.`}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <MoneyField id="sts-cash" label="Liquid cash balance" value={inputs.cash} onChange={set('cash')} />
        <MoneyField id="sts-tax" label="Earmarked tax reserve" value={inputs.tax} onChange={set('tax')} hint={`At your rates, each $1,000 of income sets aside ${usd(1000 * taxRate)}.`} />
        <MoneyField id="sts-exp" label="Fixed 30-day expenses" value={inputs.expenses} onChange={set('expenses')} onBlur={persist} />
        <MoneyField id="sts-buf" label="Emergency buffer goal" value={inputs.buffer} onChange={set('buffer')} onBlur={persist} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={fillFromRecords} disabled={busy} className={`${BTN_OUTLINE} !py-2`}>Fill from my records</button>
        {note && <p role="status" className={`text-sm ${MUTED}`}>{note}</p>}
      </div>
      <p className={`mt-4 border-t pt-3 text-xs ${DIVIDER} ${MUTED}`}>Safe-to-spend = cash − (tax reserve + 30-day expenses + emergency buffer)</p>
    </section>
  );
}

/* ---------- Virtual Salary Engine card ---------- */
function SalaryEngineCard({ entries, labels, overridden, onEdit, onReset, target, setTarget, engine, full, userTier }) {
  const openUpgrade = useStore((s) => s.openUpgrade);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { ok: boolean, text: string }

  const transfer = async () => {
    if (!TIER_LIMITS[userTier].canSaveData) {
      openUpgrade(lockedMessage('Saving transfers to your books', 'starter'), 'starter');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const amount = await logPersonalDistribution(engine.draw, 'Virtual salary draw');
      setMessage({ ok: true, text: `${usd(amount)} was recorded as a transfer to your personal account. Move the money at your bank to match.` });
    } catch (err) {
      setMessage({ ok: false, text: err.message || 'The transfer could not be recorded.' });
    } finally {
      setBusy(false);
    }
  };

  const limitText = {
    volatility: 'Your income swings enough that the volatility adjustment sets the draw, not your target.',
    income: 'Your average income is below your target, so the draw follows income.',
    target: 'Your target is the limit. Income is steady enough to support it.',
  }[engine.limitedBy];

  return (
    <section className={`${CARD_BLUE} p-6`} aria-labelledby="vse-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="vse-title" className="text-lg font-semibold">Virtual Salary Engine</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>Turns six uneven months into one steady paycheck.</p>
        </div>
        {overridden && (
          <button onClick={onReset} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${MUTED} hover:bg-[#E8DEC7] dark:hover:bg-[#18181D]`}>
            <RotateCcw size={13} aria-hidden="true" />Reset to recorded
          </button>
        )}
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Monthly income, oldest to newest</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((value, i) => (
            <MoneyField key={labels[i]} id={`vse-m${i}`} label={labels[i]} value={Math.round(value)} onChange={(v) => onEdit(i, v)} />
          ))}
        </div>
      </fieldset>

      <div className="mt-4"><MoneyField id="vse-target" label="Target personal draw per month" value={target} onChange={setTarget} /></div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className={`rounded-lg p-3 ${TINT_BLUE}`}>
          <dt className={`text-xs ${MUTED}`}>Average monthly revenue</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums">{usd(engine.avg)}</dd>
        </div>
        <div className={`rounded-lg p-3 ${TINT_TEAL}`}>
          <dt className={`text-xs ${MUTED}`}>Income volatility (V)</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums">
            {full ? (
              `${Math.round(engine.volatility * 100)}%`
            ) : (
              <button onClick={() => openUpgrade(lockedMessage('The volatility-adjusted draw', 'pro'), 'pro')} className={`inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>
                <Lock size={13} aria-hidden="true" />Pro
              </button>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg border border-[#C5A059] p-4 dark:border-[#D4AF37]">
        <div className={`text-sm ${MUTED}`}>{full ? 'Recommended safe draw' : 'Basic draw estimate'}</div>
        <div className="mt-1 text-3xl font-bold tabular-nums" aria-live="polite">{usd(engine.draw)}<span className={`text-sm font-medium ${MUTED}`}> / month</span></div>
        <p className={`mt-1 text-sm ${MUTED}`}>{limitText}</p>
      </div>

      <button onClick={transfer} disabled={busy || engine.draw <= 0} className={`${BTN_GOLD} mt-4 w-full`}>
        {busy ? 'Recording…' : `Transfer ${usd(engine.draw)} to Personal Bank Account`}
      </button>
      <div aria-live="polite">
        {message && <p className={`mt-3 text-sm ${message.ok ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{message.text}</p>}
      </div>
      <p className={`mt-4 border-t pt-3 text-xs ${DIVIDER} ${MUTED}`}>
        {full ? 'Safe draw = min( average revenue × (1 − V), target draw ). V is the standard deviation of the six months divided by their average, capped at 100%.' : 'Basic draw = min( average revenue, target draw ). Pro adds the volatility adjustment.'}
      </p>
    </section>
  );
}

/* ---------- Liquidity simulator card ---------- */
function LiquidityCard({ start, monthlyInflow, expenses, draw, buffer, taxRate }) {
  const darkMode = useStore((s) => s.darkMode);
  const [delay, setDelay] = useState(0);
  const [drop, setDrop] = useState(0);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 13 }, (_, t) => (t === 0 ? 'Now' : new Date(now.getFullYear(), now.getMonth() + t, 1).toLocaleString('en-US', { month: 'short' })));
  }, []);

  const { data, summary } = useMemo(() => {
    const common = { startBalance: start, monthlyInflow, monthlyExpenses: expenses, monthlyDraw: draw, taxRate };
    const base = projectLiquidity({ ...common });
    const stressed = projectLiquidity({ ...common, revenueDropPct: drop, delayDays: delay });
    return {
      data: base.map((p, i) => ({ label: months[i], baseline: p.balance, stressed: stressed[i].balance })),
      summary: summarizeProjection(stressed, buffer),
    };
  }, [start, monthlyInflow, expenses, draw, buffer, taxRate, delay, drop, months]);

  const axis = darkMode ? '#A1A1AA' : '#655D4C';
  const grid = darkMode ? '#27272A' : '#DDD2BA';

  let status = { tone: 'text-[#16A34A]', text: 'Your balance stays above your emergency buffer for all 12 months.' };
  if (summary.zeroMonth !== null) {
    status = { tone: 'text-[#DC2626]', text: summary.zeroMonth === 0 ? 'Your spendable balance is already negative today.' : `Cash runs out in ${months[summary.zeroMonth]}. Reduce the draw or cut expenses to avoid it.` };
  } else if (summary.bufferMonth !== null) {
    status = { tone: 'text-[#D97706]', text: summary.bufferMonth === 0 ? 'You are already below your emergency buffer.' : `Your balance dips below your emergency buffer in ${months[summary.bufferMonth]}.` };
  }

  return (
    <section className={`${CARD_INDIGO} p-6`} aria-labelledby="sim-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="sim-title" className="text-lg font-semibold">12-month liquidity simulator</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>Drag the sliders to test late-paying clients and a drop in revenue.</p>
        </div>
        {(delay > 0 || drop > 0) && (
          <button onClick={() => { setDelay(0); setDrop(0); }} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${MUTED} hover:bg-[#E8DEC7] dark:hover:bg-[#18181D]`}>
            <RotateCcw size={13} aria-hidden="true" />Reset sliders
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <div className="flex items-baseline justify-between text-sm"><label htmlFor="sim-delay" className="font-medium">Invoice delay</label><span className="font-semibold tabular-nums">{delay} days</span></div>
          <input id="sim-delay" type="range" min="0" max="60" step="5" value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="mt-2 h-1.5 w-full cursor-pointer accent-[#C5A059]" />
        </div>
        <div>
          <div className="flex items-baseline justify-between text-sm"><label htmlFor="sim-drop" className="font-medium">Revenue drop or churn</label><span className="font-semibold tabular-nums">{drop}%</span></div>
          <input id="sim-drop" type="range" min="0" max="50" step="1" value={drop} onChange={(e) => setDrop(Number(e.target.value))} className="mt-2 h-1.5 w-full cursor-pointer accent-[#C5A059]" />
        </div>
      </div>

      <div className="mt-6 h-72 w-full" role="img" aria-label="Projected spendable balance over the next 12 months">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cfGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C5A059" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#C5A059" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} axisLine={{ stroke: grid }} tickLine={false} />
            <YAxis tickFormatter={usdCompact} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              formatter={(v, name) => [usd(v), name]}
              contentStyle={{ background: darkMode ? '#121216' : '#FAF6EC', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 13 }}
              labelStyle={{ color: axis }}
            />
            <ReferenceLine y={0} stroke="#DC2626" strokeOpacity={0.5} />
            <ReferenceLine y={buffer} stroke="#D97706" strokeDasharray="4 4" label={{ value: 'Emergency buffer', fill: '#D97706', fontSize: 11, position: 'insideTopRight' }} />
            <Area type="monotone" dataKey="baseline" name="Baseline" stroke={axis} strokeDasharray="5 4" strokeWidth={1.5} fill="none" />
            <Area type="monotone" dataKey="stressed" name="With stress" stroke="#C5A059" strokeWidth={2.5} fill="url(#cfGold)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className={`mt-3 text-sm font-medium ${status.tone}`} aria-live="polite">{status.text}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ['Lowest balance', `${usd(summary.lowest.balance)} (${months[summary.lowest.month]})`],
          ['Balance in 12 months', usd(summary.end)],
          ['Monthly draw used', usd(draw)],
        ].map(([k, v]) => (
          <div key={k} className={`rounded-lg p-3 ${TINT_GOLD}`}>
            <dt className={`text-xs ${MUTED}`}>{k}</dt>
            <dd className="mt-0.5 font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <p className={`mt-4 border-t pt-3 text-xs leading-relaxed ${DIVIDER} ${MUTED}`}>
        Assumes your average monthly revenue continues, {Math.round(taxRate * 1000) / 10}% of each payment is set aside for taxes, and you pay yourself the draw above. The starting balance is your cash minus your tax reserve. A delay pushes every payment back, which leaves a gap at the start.
      </p>
    </section>
  );
}

/* ---------- tab ---------- */
export default function CashFlowTab() {
  const userTier = useStore((s) => s.userTier);
  const selectedEntity = useStore((s) => s.selectedEntity);

  const settings = useLiveQuery(() => getSettings(), []);
  const history = useLiveQuery(() => getMonthlyIncomeHistory(6, selectedEntity), [selectedEntity]);

  const [inputs, setInputs] = useState({ cash: 48000, tax: 11500, expenses: 3000, buffer: 15000 });
  const [target, setTarget] = useState(4000);
  const [override, setOverride] = useState(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (settings && !seeded.current) {
      seeded.current = true;
      setInputs((p) => ({ ...p, expenses: settings.monthlyBurn, buffer: settings.bufferTarget }));
    }
  }, [settings]);

  useEffect(() => setOverride(null), [selectedEntity]);

  const recorded = history ? history.map((h) => h.income) : [0, 0, 0, 0, 0, 0];
  const entries = override ?? recorded;
  const labels = history ? history.map((h) => monthLabel(h.month)) : ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];

  const hasStarter = tierAtLeast(userTier, 'starter');
  const full = tierAtLeast(userTier, 'pro');
  const engine = calcSafeDraw(entries, target, full);
  const taxRate = settings ? effectiveTaxRate(settings) : 0.443;

  const editEntry = (i, value) => {
    const next = [...entries];
    next[i] = value;
    setOverride(next);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Irregular cash flow and income smoothing</h1>
      <p className={`mt-2 max-w-2xl ${MUTED}`}>Turn uneven monthly income into a predictable draw, see what is safe to spend, and test how late clients or lost revenue would change the next year.</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <SafeToSpendCard inputs={inputs} setInputs={setInputs} taxRate={taxRate} canSave={TIER_LIMITS[userTier].canSaveData} entity={selectedEntity} />
        <LockedCard locked={!hasStarter} tier="starter" label="Virtual Salary Engine">
          <SalaryEngineCard
            entries={entries}
            labels={labels}
            overridden={override !== null}
            onEdit={editEntry}
            onReset={() => setOverride(null)}
            target={target}
            setTarget={setTarget}
            engine={engine}
            full={full}
            userTier={userTier}
          />
        </LockedCard>
      </div>

      <div className="mt-6">
        <LockedCard locked={!full} tier="pro" label="12-month liquidity simulator">
          <LiquidityCard
            start={inputs.cash - inputs.tax}
            monthlyInflow={engine.avg}
            expenses={inputs.expenses}
            draw={engine.draw}
            buffer={inputs.buffer}
            taxRate={taxRate}
          />
        </LockedCard>
      </div>
    </div>
  );
}
