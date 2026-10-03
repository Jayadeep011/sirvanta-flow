// src/pages/public/Features.jsx
// Deep walk-through of every formula, the automation loop, and statement parsing.
// Worked examples are computed by the same functions the app uses, so they cannot drift.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usd, calcSafeToSpend, calcSafeDraw, projectLiquidity } from '../../finance';
import { calcReserve, calcYield, deductionValue } from '../../tax';
import { computeEHR } from '../../db';
import { useT } from '../../i18n';
import Reveal from '../../components/marketing/Reveal';
import { CARD, MUTED, GOLD_TEXT, BTN_GOLD, CONTAINER, TINT_BLUE, TINT_GOLD } from '../../ui';

function buildExamples() {
  const sts = calcSafeToSpend({ cash: 48000, tax: 11500, expenses: 3000, buffer: 15000 });
  const incomes = [14200, 10500, 18500, 11200, 16800, 13400];
  const draw = calcSafeDraw(incomes, 12000, true);
  const reserve = calcReserve(10000, { federal: 24, state: 5, se: true });
  const ehr = computeEHR({ monthlyRetainer: 6000, directCosts: 400, trackedHours: 32, scopeCreepHours: 4 });
  const meal = deductionValue(200, 'Client Meals', { federal: 24, state: 5, se: true });
  const lost = calcYield({ balance: 25000, checkingApr: 0.01, hysaApr: 4.5 });
  const stressed = projectLiquidity({ startBalance: 36500, monthlyInflow: 14100, revenueDropPct: 30, delayDays: 60, monthlyExpenses: 3000, monthlyDraw: 4000, taxRate: 0.443 });
  return [
    {
      name: 'Safe-to-Spend', formula: 'Safe-to-spend = Cash − (Tax reserve + 30-day expenses + Emergency buffer)',
      inputs: ['Cash: your liquid balance, or the total recorded in your books', 'Tax reserve: money already set aside for tax', '30-day expenses: bills you cannot skip', 'Buffer: months of expenses you want protected'],
      example: `${usd(48000)} − (${usd(11500)} + ${usd(3000)} + ${usd(15000)}) = ${usd(sts.safe)} safe to spend.`,
    },
    {
      name: 'Virtual Salary', formula: 'Safe draw = min( Average revenue × (1 − V), Target draw )',
      inputs: ['Average revenue: the mean of your last six months of income', 'V: volatility = standard deviation ÷ average, capped at 100%', 'Target draw: the monthly pay you would like'],
      example: `Six months averaging ${usd(draw.avg)} with V = ${Math.round(draw.volatility * 100)}% leaves ${usd(draw.adjusted)}. With a ${usd(12000)} target, the safe draw is ${usd(draw.draw)}.`,
    },
    {
      name: 'Tax reserve', formula: 'Reserve = Gross × (Federal % + State % + Self-employment %)',
      inputs: ['Federal bracket: 10% to 37%', 'State rate: 0% to 13.3%', 'Self-employment tax: 15.3% when switched on'],
      example: `On a ${usd(10000)} payment at 24% + 5% + 15.3%, set aside ${usd(reserve.total)} and keep ${usd(reserve.keep)}.`,
    },
    {
      name: 'Write-off value', formula: 'Tax saved = Deductible amount × (Federal % + State % + Self-employment %)',
      inputs: ['Deductible amount: the expense, or 50% of it for client meals', 'The same combined rate as the tax reserve'],
      example: `A ${usd(200)} client dinner is ${usd(100)} deductible and saves about ${usd(meal)}.`,
    },
    {
      name: 'Effective hourly rate', formula: 'EHR = (Revenue − Direct expenses) ÷ (Billed hours + Scope-creep hours)',
      inputs: ['Revenue: monthly retainer or project pay', 'Direct expenses: contractors, tools and ads for that client', 'Scope-creep hours: work done but never billed'],
      example: `(${usd(6000)} − ${usd(400)}) ÷ (32 + 4 hours) = ${usd(ehr)} an hour. Above 150 is high margin, 75 to 150 is on target, below 75 is toxic.`,
    },
    {
      name: 'Yield radar', formula: 'Lost earnings = Balance × (HYSA APR − Checking APR)',
      inputs: ['Balance: cash sitting in checking', 'Checking APR: usually close to zero', 'HYSA APR: a high-yield savings rate you could earn'],
      example: `${usd(25000)} at 0.01% instead of 4.5% gives up about ${usd(lost.annual)} a year.`,
    },
    {
      name: '12-month simulator', formula: 'Balance(t) = Balance(t−1) + Payment(t) × (1 − tax rate) − Expenses − Draw',
      inputs: ['Invoice delay (0 to 60 days) pushes each payment back, leaving a gap at the start', 'Revenue drop (0% to 50%) scales every future payment down', 'Starting balance is cash minus the tax reserve'],
      example: `With a 60-day delay and a 30% drop, a ${usd(36500)} starting balance reaches ${usd(stressed[12].balance)} after twelve months. The simulator shows when it dips below your buffer.`,
    },
  ];
}

const LOOP = [
  ['Record', 'Transactions come from your statements or manual entries.'],
  ['Classify', 'Income, expenses and likely write-offs are tagged.'],
  ['Reserve', 'Tax is set aside from each payment automatically.'],
  ['Forecast', 'Invoices due and fixed bills project the next 30 days and 12 months.'],
  ['Advise', 'Ask the Advisor, or get a monthly briefing.'],
];

const PARSER = [
  ['Split', 'Long statements are cut into small pieces so each request stays fast. A CSV header row is repeated on every piece.'],
  ['Read', 'Each piece goes through our server function to an AI provider, which returns a list of dated transactions as JSON.'],
  ['Validate', 'Every row is checked: numeric amount, real description, valid date. Unusable rows are dropped.'],
  ['Flag', 'Expenses that match a Schedule C category are marked deductible with the category.'],
  ['De-duplicate', 'Rows matching a date, amount and description already in your books are skipped.'],
  ['Save and undo', 'Rows are saved on your device, and one click removes the whole import.'],
];

export default function Features() {
  const navigate = useNavigate();
  const t = useT();
  const examples = buildExamples();

  return (
    <>
      <section className="hero-glow">
        <div className={`${CONTAINER} pb-14 pt-16`}>
          <Reveal>
            <p className={`text-sm font-semibold ${GOLD_TEXT}`}>Features</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Every formula, in the open.</h1>
            <p className={`mt-5 max-w-2xl text-lg leading-relaxed ${MUTED}`}>No black box. Here is how each number in Sirvanta Flow is calculated, with a worked example computed by the same code the app runs.</p>
          </Reveal>
        </div>
      </section>

      <section className={`${CONTAINER} pb-10`}>
        <div className="grid gap-5 md:grid-cols-2">
          {examples.map((e, i) => (
            <Reveal key={e.name} delay={(i % 2) * 0.05}>
              <article className={`${CARD} h-full p-6`}>
                <h2 className="text-lg font-semibold">{e.name}</h2>
                <p className={`mt-3 overflow-x-auto whitespace-nowrap rounded-lg px-3 py-2.5 font-mono text-[13px] ${TINT_BLUE}`}>{e.formula}</p>
                <ul className={`mt-4 list-disc space-y-1.5 pl-5 text-sm ${MUTED}`}>{e.inputs.map((x) => <li key={x}>{x}</li>)}</ul>
                <p className={`mt-4 rounded-lg p-3 text-sm leading-relaxed ${TINT_GOLD}`}><strong>Worked example.</strong> {e.example}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER} py-14`}>
        <Reveal><h2 className="text-3xl font-bold tracking-tight">The automation loop</h2><p className={`mt-3 max-w-2xl ${MUTED}`}>Five steps that run every time your numbers change.</p></Reveal>
        <ol className="mt-8 grid gap-4 md:grid-cols-5">
          {LOOP.map(([title, text], i) => (
            <Reveal key={title} delay={i * 0.05}>
              <li className={`${CARD} h-full p-5`}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white/15">{i + 1}</span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed ${MUTED}`}>{text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="border-y border-slate-200 bg-white/50 dark:border-white/10 dark:bg-white/[0.02]">
        <div className={`${CONTAINER} py-14`}>
          <Reveal><h2 className="text-3xl font-bold tracking-tight">Statement parsing</h2><p className={`mt-3 max-w-2xl ${MUTED}`}>From a pasted statement to categorized transactions, with checks at every step. PDFs are supported by copying their text; direct PDF reading is not available yet.</p></Reveal>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {PARSER.map(([title, text], i) => (
              <Reveal key={title} delay={(i % 3) * 0.05}>
                <li className={`${CARD} h-full p-5`}>
                  <h3 className="font-semibold"><span className={`mr-2 ${GOLD_TEXT}`}>{i + 1}.</span>{title}</h3>
                  <p className={`mt-1.5 text-sm leading-relaxed ${MUTED}`}>{text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${CONTAINER} py-14`}>
        <div className={`${CARD} flex flex-col items-start justify-between gap-5 p-8 md:flex-row md:items-center`}>
          <div><h2 className="text-2xl font-bold tracking-tight">Try the formulas with your own numbers.</h2><p className={`mt-1 ${MUTED}`}>The sandbox is free and needs no account.</p></div>
          <button onClick={() => navigate('/app/dashboard')} className={`${BTN_GOLD} gap-2`}>{t('pub.launch')}<ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </section>
    </>
  );
}
