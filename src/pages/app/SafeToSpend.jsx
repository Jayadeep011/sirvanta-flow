// src/pages/app/SafeToSpend.jsx
// Safe-to-Spend Engine: the dial, allocation rules with a buffer slider, and the 12-month simulator.

import React from 'react';
import { updateSettings, TIER_LIMITS } from '../../db';
import { tierAtLeast } from '../../plans';
import { dialSegments, usd } from '../../finance';
import useCashModel from '../../hooks/useCashModel';
import PageHeader from '../../components/PageHeader';
import LockedCard from '../../components/LockedCard';
import { SafeToSpendCard, LiquidityCard } from '../../components/CashFlowTab';
import { CARD_INDIGO, MUTED, DIVIDER, TINT_INDIGO } from '../../ui';

function AllocationCard({ inputs, setInputs, taxRate, canSave }) {
  const seg = dialSegments(inputs);
  const months = inputs.expenses > 0 ? Math.round((inputs.buffer / inputs.expenses) * 2) / 2 : 0;

  const setMonths = (m) => setInputs((p) => ({ ...p, buffer: Math.round(m * p.expenses) }));
  const persist = () => { if (canSave) updateSettings({ bufferTarget: inputs.buffer }).catch(() => {}); };

  const rules = [
    ['Taxes first', `Every payment sets aside ${(taxRate * 100).toFixed(1)}% before you can spend it.`],
    ['Bills second', `The next 30 days of fixed expenses (${usd(inputs.expenses)}) stay in cash.`],
    ['Buffer third', `An emergency buffer of ${months} ${months === 1 ? 'month' : 'months'} of expenses (${usd(inputs.buffer)}) is protected.`],
    ['Everything else is yours', 'Only the remainder shows up as safe to spend.'],
  ];

  return (
    <section className={`${CARD_INDIGO} p-6`} aria-labelledby="alloc-title">
      <h2 id="alloc-title" className="text-lg font-semibold">Allocation rules</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>How your cash is divided, in the order it is protected.</p>

      <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" role="img" aria-label="Cash allocation: tax, bills and buffer, safe">
        <div className="bg-[#D97706] transition-all" style={{ width: `${seg.tax}%` }} />
        <div className="bg-slate-500 transition-all dark:bg-zinc-500" style={{ width: `${seg.burn}%` }} />
        <div className="bg-[#16A34A] transition-all" style={{ width: `${seg.safe}%` }} />
      </div>
      <p className={`mt-2 text-xs ${MUTED}`}>Amber is locked for tax, grey is bills and buffer, green is safe to spend.</p>

      <div className="mt-6">
        <div className="flex items-baseline justify-between text-sm">
          <label htmlFor="buffer-months" className="font-medium">Emergency buffer</label>
          <span className="font-semibold tabular-nums">{months} {months === 1 ? 'month' : 'months'} · {usd(inputs.buffer)}</span>
        </div>
        <input
          id="buffer-months"
          type="range"
          min="0"
          max="12"
          step="0.5"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          onPointerUp={persist}
          onKeyUp={persist}
          className="mt-2 h-1.5 w-full cursor-pointer accent-[#5B4FC4]"
        />
        <p className={`mt-1 text-xs ${MUTED}`}>Most freelancers aim for three to six months of expenses.</p>
      </div>

      <ol className="mt-6 space-y-3">
        {rules.map(([title, body], i) => (
          <li key={title} className={`flex gap-3 rounded-lg p-3 ${TINT_INDIGO}`}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#5B4FC4] text-xs font-bold text-white">{i + 1}</span>
            <span className="text-sm"><strong>{title}.</strong> <span className={MUTED}>{body}</span></span>
          </li>
        ))}
      </ol>
      <p className={`mt-4 border-t pt-3 text-xs ${DIVIDER} ${MUTED}`}>Changing the buffer here updates the dial, the dashboard, and the simulator.</p>
    </section>
  );
}

export default function SafeToSpendPage() {
  const m = useCashModel();
  const canSave = TIER_LIMITS[m.userTier].canSaveData;

  return (
    <div>
      <PageHeader title="Safe-to-Spend Engine" description="See exactly how much is free to spend after taxes, bills and your emergency buffer, then stress-test the next twelve months." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SafeToSpendCard inputs={m.inputs} setInputs={m.setInputs} taxRate={m.taxRate} canSave={canSave} entity={m.entity} />
        <AllocationCard inputs={m.inputs} setInputs={m.setInputs} taxRate={m.taxRate} canSave={canSave} />
      </div>
      <div className="mt-6">
        <LockedCard locked={!tierAtLeast(m.userTier, 'pro')} tier="pro" label="12-month liquidity simulator">
          <LiquidityCard
            start={m.inputs.cash - m.inputs.tax}
            monthlyInflow={m.engine.avg}
            expenses={m.inputs.expenses}
            draw={m.engine.draw}
            buffer={m.inputs.buffer}
            taxRate={m.taxRate}
          />
        </LockedCard>
      </div>
    </div>
  );
}
