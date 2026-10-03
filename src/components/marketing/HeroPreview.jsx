// src/components/marketing/HeroPreview.jsx
// Interactive mini-dashboard for the home page: move the sliders and the dial animates.

import React, { useMemo, useState } from 'react';
import { usd, calcSafeToSpend, dialSegments } from '../../finance';
import { MUTED } from '../../ui';

const ARC = 'M 20 120 A 100 100 0 0 1 220 120';
const SLIDERS = [
  { key: 'cash', label: 'Liquid cash', min: 0, max: 150000, step: 500 },
  { key: 'tax', label: 'Tax reserve', min: 0, max: 50000, step: 250 },
  { key: 'expenses', label: 'Next 30 days of expenses', min: 0, max: 40000, step: 250 },
  { key: 'buffer', label: 'Emergency buffer', min: 0, max: 60000, step: 500 },
];

function Arc({ len, start, color }) {
  const l = len < 0.2 ? 0 : len;
  return (
    <path
      d={ARC}
      fill="none"
      strokeWidth="16"
      pathLength="100"
      stroke={color}
      className="transition-all duration-300 ease-out motion-reduce:transition-none"
      style={{ strokeDasharray: `${l} ${100 - l}`, strokeDashoffset: -start }}
    />
  );
}

export default function HeroPreview() {
  const [v, setV] = useState({ cash: 48000, tax: 11500, expenses: 9800, buffer: 15000 });
  const { safe, short } = calcSafeToSpend(v);
  const seg = useMemo(() => dialSegments(v), [v]);

  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-[#2E5FBF]/30 via-transparent to-[#D4AF37]/25 blur-2xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
          <span className={`ml-2 text-xs font-medium ${MUTED}`}>Safe-to-Spend · live preview</span>
        </div>
        <div className="p-5">
          <div className="relative mx-auto w-full max-w-[300px]">
            <svg viewBox="0 0 240 135" className="w-full" role="img" aria-label={`Safe to spend ${usd(Math.max(safe, 0))}`}>
              <path d={ARC} fill="none" strokeWidth="16" pathLength="100" className="stroke-slate-200 dark:stroke-white/10" />
              <Arc len={seg.tax} start={0} color="#D97706" />
              <Arc len={seg.burn} start={seg.tax} color="#64748B" />
              <Arc len={seg.safe} start={seg.tax + seg.burn} color="#16A34A" />
            </svg>
            <div className="absolute inset-x-0 bottom-0 text-center" aria-live="polite">
              <div className={`text-3xl font-bold tabular-nums ${short ? 'text-[#DC2626]' : ''}`}>{usd(safe)}</div>
              <div className={`text-xs ${MUTED}`}>{short ? 'Short of your reserves' : 'Safe to spend'}</div>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
            {[['bg-[#D97706]', 'Locked for tax', usd(v.tax)], ['bg-slate-500', 'Bills + buffer', usd(v.expenses + v.buffer)], ['bg-[#16A34A]', 'Safe', usd(Math.max(safe, 0))]].map(([dot, label, value]) => (
              <div key={label}><dt className={`flex items-center gap-1.5 ${MUTED}`}><span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />{label}</dt><dd className="mt-0.5 font-semibold tabular-nums">{value}</dd></div>
            ))}
          </dl>

          <div className="mt-5 space-y-3">
            {SLIDERS.map((s) => (
              <div key={s.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <label htmlFor={`hp-${s.key}`} className={MUTED}>{s.label}</label>
                  <span className="font-semibold tabular-nums">{usd(v[s.key])}</span>
                </div>
                <input id={`hp-${s.key}`} type="range" min={s.min} max={s.max} step={s.step} value={v[s.key]} onChange={(e) => setV((p) => ({ ...p, [s.key]: Number(e.target.value) }))} className="mt-1 h-1.5 w-full cursor-pointer accent-[#C5A059]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
