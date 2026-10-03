// src/pages/public/Pricing.jsx
// Pricing with a Monthly / Yearly toggle, plan cards, a full feature matrix and an FAQ accordion.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Flame, Minus } from 'lucide-react';
import { useStore } from '../../store';
import { PLANS, FEATURE_MATRIX, PRICING_FAQ, ANNUAL_DISCOUNT, annualPrice, annualPerMonth } from '../../plans';
import { currencySymbol } from '../../finance';
import Reveal from '../../components/marketing/Reveal';
import { CARD, MUTED, GOLD_TEXT, BTN_GOLD, BTN_OUTLINE, CONTAINER, DIVIDER } from '../../ui';

const TOP = { free: 'border-t-slate-400', starter: 'border-t-[#0F8B8D]', pro: 'border-t-[#C5A059]', agency: 'border-t-[#5B4FC4]' };

function Cell({ value }) {
  if (value === true) return <Check size={17} className="mx-auto text-[#16A34A]" aria-label="Included" />;
  if (value === false) return <Minus size={17} className={`mx-auto ${MUTED}`} aria-label="Not included" />;
  return <span className="text-xs font-medium">{value}</span>;
}

export default function Pricing() {
  const navigate = useNavigate();
  const openUpgrade = useStore((s) => s.openUpgrade);
  const [billing, setBilling] = useState('monthly');
  const annual = billing === 'annual';
  const sym = currencySymbol();

  const choose = (plan) => (plan.id === 'free' ? navigate('/app/dashboard') : openUpgrade('', plan.id, billing));

  return (
    <>
      <section className="hero-glow">
        <div className={`${CONTAINER} pb-10 pt-16 text-center`}>
          <Reveal>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Simple pricing for irregular income.</h1>
            <p className={`mx-auto mt-5 max-w-2xl text-lg ${MUTED}`}>Start in the free sandbox. Upgrade when you want your data saved, the full engines, and AI.</p>
            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5" role="group" aria-label="Billing period">
              <button onClick={() => setBilling('monthly')} aria-pressed={!annual} className={`rounded-full px-5 py-2 text-sm font-semibold ${!annual ? 'bg-slate-900 text-white dark:bg-white/15' : MUTED}`}>Monthly</button>
              <button onClick={() => setBilling('annual')} aria-pressed={annual} className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold ${annual ? 'bg-slate-900 text-white dark:bg-white/15' : MUTED}`}>Yearly <span className="rounded-full bg-[#16A34A] px-2 py-0.5 text-[10px] font-bold text-white">Save {Math.round(ANNUAL_DISCOUNT * 100)}%</span></button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={`${CONTAINER} pb-16`}>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05}>
              <article className={`relative flex h-full flex-col rounded-xl border border-t-4 bg-white p-6 shadow-sm dark:bg-zinc-900/60 dark:backdrop-blur-md ${TOP[p.id]} ${p.popular ? 'border-[#C5A059] ring-1 ring-[#C5A059]' : 'border-slate-200 dark:border-white/10'}`}>
                {p.popular && <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-[#C5A059] px-3 py-1 text-xs font-bold text-slate-900"><Flame size={12} aria-hidden="true" />Most popular</span>}
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className={`mt-1 text-sm ${MUTED}`}>{p.blurb}</p>
                <p className="mt-5 text-4xl font-extrabold tabular-nums">{sym}{annual ? annualPerMonth(p) : p.price}<span className={`text-sm font-medium ${MUTED}`}>/mo</span></p>
                <p className={`mt-1 h-5 text-xs ${MUTED}`}>{p.price === 0 ? 'Free forever' : annual ? `Billed ${sym}${annualPrice(p)} a year` : 'Billed monthly'}</p>
                <button onClick={() => choose(p)} className={`${p.popular ? BTN_GOLD : BTN_OUTLINE} mt-4 w-full`}>{p.cta}</button>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.features.map(([label, on]) => (
                    <li key={label} className={`flex items-start gap-2 ${on ? '' : MUTED}`}>
                      {on ? <Check size={16} className="mt-0.5 shrink-0 text-[#16A34A]" aria-hidden="true" /> : <Minus size={16} className="mt-0.5 shrink-0 opacity-50" aria-hidden="true" />}
                      <span>{label}{on ? '' : ' (not included)'}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER} pb-16`}>
        <h2 className="text-2xl font-bold tracking-tight">Compare every feature</h2>
        <div className={`${CARD} mt-6 overflow-x-auto`}>
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Feature comparison by plan</caption>
            <thead>
              <tr className={`border-b ${DIVIDER}`}>
                <th scope="col" className="px-4 py-3 font-medium">Feature</th>
                {PLANS.map((p) => <th key={p.id} scope="col" className={`px-4 py-3 text-center font-semibold ${p.popular ? GOLD_TEXT : ''}`}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map(([label, ...cells]) => (
                <tr key={label} className={`border-b last:border-b-0 ${DIVIDER}`}>
                  <th scope="row" className="px-4 py-3 font-medium">{label}</th>
                  {cells.map((c, i) => <td key={PLANS[i].id} className="px-4 py-3 text-center"><Cell value={c} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="faq" className={`${CONTAINER} scroll-mt-24 pb-24`}>
        <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className={`${CARD} mt-6 divide-y divide-slate-200 dark:divide-white/10`}>
          {PRICING_FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className={`text-xl leading-none transition-transform group-open:rotate-45 ${MUTED}`} aria-hidden="true">+</span>
              </summary>
              <p className={`mt-3 text-sm leading-relaxed ${MUTED}`}>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
