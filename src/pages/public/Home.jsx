// src/pages/public/Home.jsx
// Main landing page: hero with live preview, problem vs solution, feature bento, local-first, ROI calculator, social proof.

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Cloud, Database, Gauge, HardDrive, Landmark, ServerOff, Users, Wallet, X } from 'lucide-react';
import { useT } from '../../i18n';
import { FACTS, TESTIMONIALS, TRUST } from '../../content/site';
import HeroPreview from '../../components/marketing/HeroPreview';
import RoiCalculator from '../../components/marketing/RoiCalculator';
import Reveal from '../../components/marketing/Reveal';
import { CARD, MUTED, GOLD_TEXT, BTN_GOLD, BTN_OUTLINE, CONTAINER } from '../../ui';

const OLD_WAY = [
  'A spreadsheet that breaks the moment a column moves',
  'Tax deadlines you remember a week too late',
  'A bank balance that looks safe but is already owed to the IRS',
  'No idea which client is quietly costing you money',
];
const NEW_WAY = [
  'Tax set aside on every payment, before you can spend it',
  'A steady virtual salary built from six months of income',
  'One safe-to-spend number you can trust',
  'Hourly rate per client, after costs and unbilled scope creep',
];

const PILLARS = [
  {
    id: 'safe', icon: Gauge, label: 'Safe-to-Spend', title: 'Know what is actually yours',
    body: 'Cash minus tax, the next 30 days of bills, and an emergency buffer. One dial, always current.',
    tiles: [['Live dial', 'Edit any input and watch the dial and your forecast update together.'], ['Allocation rules', 'Tax first, bills second, buffer third. Only the remainder is spendable.'], ['12-month simulator', 'Drag invoice delay and revenue drop sliders to stress-test the year.']],
    stat: ['3 buckets', 'tax, bills plus buffer, safe'],
  },
  {
    id: 'salary', icon: Wallet, label: 'Virtual Salary', title: 'Turn uneven months into a paycheck',
    body: 'A safe monthly draw based on your average income and how much it swings.',
    tiles: [['Volatility-aware', 'The steadier your income, the closer your draw gets to your target.'], ['One-click records', 'Log each transfer to your personal account in a distribution log.'], ['Pay schedule', 'Pick a payday and see the revenue needed to fund it.']],
    stat: ['min(avg × (1 − V), target)', 'the whole formula'],
  },
  {
    id: 'tax', icon: Landmark, label: 'Tax Vault', title: 'Never be surprised by a tax bill',
    body: 'Quarterly estimates, a countdown to the next deadline, and every write-off counted.',
    tiles: [['Quarterly vault', 'Live from your transactions on Pro, with a suggested payment each quarter.'], ['Schedule C scanner', 'Log expenses and scan for write-offs you missed.'], ['1040-ES worksheet', 'Download a planning worksheet for each payment.']],
    stat: ['4 deadlines', 'tracked for you each year'],
  },
  {
    id: 'clients', icon: Users, label: 'Client Matrix', title: 'See what clients really pay you',
    body: 'Effective hourly rate after direct costs and unbilled work, ranked and colour-coded.',
    tiles: [['Leaderboard', 'Green above 150 an hour, gold 75 to 150, red below 75.'], ['Scope-creep fixes', 'See how billing the extra hours would change a client\'s rate.'], ['Invoice builder', 'Branded PDF invoices with the tax reserve worked out first.']],
    stat: ['$/hr', 'per client, not per project'],
  },
];

function Bento() {
  const [active, setActive] = useState('safe');
  const reduce = useReducedMotion();
  const p = PILLARS.find((x) => x.id === active);
  const Icon = p.icon;

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div role="tablist" aria-label="Core tools" className="flex gap-2 overflow-x-auto lg:flex-col">
        {PILLARS.map((x) => {
          const I = x.icon;
          const on = x.id === active;
          return (
            <button
              key={x.id}
              role="tab"
              id={`bento-tab-${x.id}`}
              aria-selected={on}
              aria-controls="bento-panel"
              onClick={() => setActive(x.id)}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${on ? 'border-[#C5A059] bg-white shadow-sm dark:border-[#D4AF37] dark:bg-white/10' : `border-slate-200 ${MUTED} hover:bg-white dark:border-white/10 dark:hover:bg-white/5`}`}
            >
              <I size={18} aria-hidden="true" />{x.label}
            </button>
          );
        })}
      </div>

      <div id="bento-panel" role="tabpanel" aria-labelledby={`bento-tab-${active}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className={`${CARD} p-6 sm:col-span-2`}>
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#F6EFD9] text-[#9A7420] dark:bg-[#1B1810] dark:text-[#D4AF37]"><Icon size={20} aria-hidden="true" /></span>
              <h3 className="mt-4 text-2xl font-bold tracking-tight">{p.title}</h3>
              <p className={`mt-2 max-w-xl ${MUTED}`}>{p.body}</p>
            </div>
            {p.tiles.slice(0, 2).map(([title, text]) => (
              <div key={title} className={`${CARD} p-5`}><h4 className="font-semibold">{title}</h4><p className={`mt-1.5 text-sm leading-relaxed ${MUTED}`}>{text}</p></div>
            ))}
            <div className={`${CARD} p-5`}><h4 className="font-semibold">{p.tiles[2][0]}</h4><p className={`mt-1.5 text-sm leading-relaxed ${MUTED}`}>{p.tiles[2][1]}</p></div>
            <div className="rounded-xl bg-gradient-to-br from-[#12233F] to-[#0F5A66] p-5 text-white">
              <p className="break-words font-mono text-lg font-semibold">{p.stat[0]}</p>
              <p className="mt-1 text-sm text-slate-300">{p.stat[1]}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, children }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className={`text-sm font-semibold ${GOLD_TEXT}`}>{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {children && <p className={`mt-4 text-lg leading-relaxed ${MUTED}`}>{children}</p>}
    </div>
  );
}

export default function Home() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <>
      <section className="hero-glow">
        <div className={`${CONTAINER} grid items-center gap-12 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24`}>
          <Reveal>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              The Financial Operating System for <span className="bg-gradient-to-r from-[#2E5FBF] to-[#C5A059] bg-clip-text text-transparent">High-Yield Agencies &amp; Independents.</span>
            </h1>
            <p className={`mt-6 max-w-xl text-lg leading-relaxed ${MUTED}`}>
              Stop running your business out of a spreadsheet. See exactly what is safe to spend, set tax aside before it disappears, and find the clients that quietly cost you money, all before the next deadline surprises you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate('/app/dashboard')} className={`${BTN_GOLD} gap-2`}>{t('pub.launch')}<ArrowRight size={16} aria-hidden="true" /></button>
              <button onClick={() => navigate('/app/safe-to-spend')} className={BTN_OUTLINE}>{t('pub.sandbox')}</button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {TRUST.map((x) => <li key={x} className={`flex items-center gap-1.5 text-sm ${MUTED}`}><Check size={15} className="text-[#16A34A]" aria-hidden="true" />{x}</li>)}
            </ul>
          </Reveal>
          <Reveal delay={0.1}><HeroPreview /></Reveal>
        </div>
      </section>

      <section className={`${CONTAINER} py-20`}>
        <Reveal><SectionTitle eyebrow="Why it exists" title="Your bank balance is not your safe-to-spend.">Most independents find out the difference at tax time. Sirvanta Flow shows it every day.</SectionTitle></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className={`${CARD} h-full p-6`}>
              <h3 className="text-lg font-semibold text-[#B42318] dark:text-[#F87171]">The old way</h3>
              <ul className="mt-4 space-y-3">{OLD_WAY.map((x) => <li key={x} className="flex gap-3 text-sm"><X size={17} className="mt-0.5 shrink-0 text-[#DC2626]" aria-hidden="true" />{x}</li>)}</ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-xl border border-[#C5A059]/50 bg-gradient-to-br from-[#C5A059]/10 to-transparent p-6">
              <h3 className={`text-lg font-semibold ${GOLD_TEXT}`}>The Sirvanta Flow way</h3>
              <ul className="mt-4 space-y-3">{NEW_WAY.map((x) => <li key={x} className="flex gap-3 text-sm"><Check size={17} className="mt-0.5 shrink-0 text-[#16A34A]" aria-hidden="true" />{x}</li>)}</ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/50 dark:border-white/10 dark:bg-white/[0.02]">
        <div className={`${CONTAINER} py-20`}>
          <Reveal><SectionTitle eyebrow="Four core tools" title="Everything a one-person finance team would do.">Pick a tool to see what it does.</SectionTitle></Reveal>
          <div className="mt-10"><Bento /></div>
          <p className="mt-8"><Link to="/features" className={`inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>See every formula and automation <ArrowRight size={14} aria-hidden="true" /></Link></p>
        </div>
      </section>

      <section className={`${CONTAINER} py-20`}>
        <Reveal><SectionTitle eyebrow="Local-first" title="Your numbers stay on your device.">Records are stored in your browser&apos;s own database. Nothing is uploaded unless you choose to use an AI feature.</SectionTitle></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[[HardDrive, 'Stored in your browser', 'Transactions, clients, invoices and settings live in IndexedDB on your device. No account database to breach.'], [ServerOff, 'No always-on sync', 'There is no background upload. Back up and restore with a file when you decide to.'], [Cloud, 'AI only when you ask', 'Statement parsing and questions send just the text or figures you submit, through a server function that keeps the API key off your device.']].map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 0.06}>
              <div className={`${CARD} h-full p-6`}>
                <Icon size={22} className={GOLD_TEXT} aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6"><Link to="/security" className={`inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}><Database size={14} aria-hidden="true" />Read the full privacy manifest <ArrowRight size={14} aria-hidden="true" /></Link></p>
      </section>

      <section className="border-y border-slate-200 bg-white/50 dark:border-white/10 dark:bg-white/[0.02]">
        <div className={`${CONTAINER} py-20`}>
          <Reveal><SectionTitle eyebrow="Estimate your savings" title="What could late tax and unbilled work be costing you?">Move the sliders. Every assumption is shown beneath them.</SectionTitle></Reveal>
          <Reveal className="mt-10"><RoiCalculator /></Reveal>
        </div>
      </section>

      <section className={`${CONTAINER} py-20`}>
        <Reveal><SectionTitle eyebrow="Built for people like you" title="What independents say.">These are illustrative examples while we collect real customer stories.</SectionTitle></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((q, i) => (
            <Reveal key={q.name} delay={i * 0.06}>
              <figure className={`${CARD} flex h-full flex-col p-6`}>
                <blockquote className="flex-1 text-sm leading-relaxed">&ldquo;{q.quote}&rdquo;</blockquote>
                <figcaption className="mt-5 flex items-center justify-between gap-2 text-sm">
                  <span><span className="block font-semibold">{q.name}</span><span className={MUTED}>{q.role}</span></span>
                  {q.illustrative && <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-white/20 dark:text-zinc-400">Illustrative example</span>}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <dl className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {FACTS.map((f) => <div key={f.label} className={`${CARD} p-5 text-center`}><dt className={`text-sm ${MUTED}`}>{f.label}</dt><dd className="mt-1 text-3xl font-bold tabular-nums">{f.value}</dd></div>)}
        </dl>
      </section>

      <section className="bg-gradient-to-r from-[#12233F] to-[#0F5A66] text-white">
        <div className={`${CONTAINER} flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center`}>
          <h2 className="max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">See your real safe-to-spend number before the next tax deadline.</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => navigate('/app/dashboard')} className={BTN_GOLD}>{t('pub.launch')}</button>
            <button onClick={() => navigate('/pricing')} className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">{t('pub.pricing')}</button>
          </div>
        </div>
      </section>
    </>
  );
}
