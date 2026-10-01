// src/components/LandingPage.jsx
// Sirvanta Flow V2.0 - public marketing page (view === 'landing').
//
// Props (wired to the Zustand store in the next step):
//   darkMode        boolean   - applies the dark palette
//   onToggleTheme   () => void
//   onLaunchSandbox () => void  - enter the app in Free Sandbox mode
//   onSignIn        () => void  - "Sign In / Launch Dashboard"
//   onUpgrade       (tierId: 'starter' | 'pro' | 'agency') => void
//
// Requires `darkMode: 'class'` in tailwind.config.js.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Menu, X, Sun, Moon, Wallet, ShieldCheck, Gauge, Sparkles, Check, Minus, Flame,
  HardDrive, KeyRound, EyeOff,
} from 'lucide-react';
import { PLANS as TIERS } from '../plans';

/* ---------- shared class strings (static so Tailwind can see them) ---------- */
const CANVAS = 'bg-[#F3ECDD] dark:bg-[#0A0A0C]';
const INK = 'text-[#1B2233] dark:text-[#F4F4F5]';
const MUTED = 'text-[#655D4C] dark:text-[#A1A1AA]';
const CARD = 'bg-[#FAF6EC] dark:bg-[#121216] border border-[#DDD2BA] dark:border-[#27272A] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]';
const BTN_BASE = 'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3ECDD] dark:focus-visible:ring-offset-[#0A0A0C]';
const BTN_GOLD = `${BTN_BASE} bg-[#C5A059] text-[#1B2233] hover:bg-[#B8934A] dark:bg-[#D4AF37] dark:hover:bg-[#C29F2E]`;
const BTN_OUTLINE = `${BTN_BASE} border border-[#CBBE9F] text-[#1B2233] hover:bg-[#E8DEC7] dark:border-[#3F3F46] dark:text-[#F4F4F5] dark:hover:bg-[#18181D]`;
const GOLD_TEXT = 'text-[#7A5A17] dark:text-[#D4AF37]';
const BTN_GHOST = `${BTN_BASE} border border-white/30 text-white hover:bg-white/10 focus-visible:ring-offset-[#12233F]`;

const usd = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const NAV = [
  { id: 'features', label: 'Features' },
  { id: 'engine', label: 'Mathematical Engine' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'security', label: 'Security' },
];

/* ---------- content ---------- */
const PILLARS = [
  {
    icon: Wallet,
    tile: 'bg-[#E1EBF8] text-[#2E5FBF] dark:bg-[#111C2E] dark:text-[#5B8DEF]',
    bar: 'bg-[#2E5FBF]/70 dark:bg-[#5B8DEF]/80',
    top: 'border-t-[#2E5FBF] dark:border-t-[#5B8DEF]',
    title: 'Steady pay from uneven months',
    body: 'Your six-month average and volatility set a draw you can sustain, then move it to your personal account with one click.',
    bars: [55, 90, 40, 75, 100, 65],
  },
  {
    icon: ShieldCheck,
    tile: 'bg-[#DDF0EC] text-[#0F8B8D] dark:bg-[#0F2321] dark:text-[#2DD4BF]',
    bar: 'bg-[#0F8B8D]/70 dark:bg-[#2DD4BF]/80',
    top: 'border-t-[#0F8B8D] dark:border-t-[#2DD4BF]',
    title: 'Taxes set aside as you earn',
    body: 'Every payment adds to a quarterly reserve. Log expenses against Schedule C categories and see what each one saves you.',
    bars: [30, 45, 60, 70, 85, 100],
  },
  {
    icon: Gauge,
    tile: 'bg-[#EFE3C6] text-[#9A7420] dark:bg-[#1B1810] dark:text-[#D4AF37]',
    bar: 'bg-[#C5A059]/80',
    top: 'border-t-[#C5A059] dark:border-t-[#D4AF37]',
    title: 'Client profitability, in dollars per hour',
    body: 'Effective hourly rate after direct costs and unbilled scope creep, ranked so the clients costing you money stand out.',
    bars: [100, 80, 62, 48, 30, 18],
  },
  {
    icon: Sparkles,
    tile: 'bg-[#E6E4F7] text-[#5B4FC4] dark:bg-[#1A1830] dark:text-[#8B83F0]',
    bar: 'bg-[#5B4FC4]/70 dark:bg-[#8B83F0]/80',
    top: 'border-t-[#5B4FC4] dark:border-t-[#8B83F0]',
    title: 'An advisor that works from your numbers',
    body: 'Drop in a bank statement, ask a what-if question, or generate a briefing. Answers use your balances and cash flow.',
    bars: [40, 70, 55, 95, 60, 85],
  },
];

const FORMULAS = [
  {
    name: 'Safe monthly draw',
    formula: 'Safe draw = min( Average revenue × (1 − V), Target draw )',
    note: 'V is volatility: the standard deviation of your last six months of income divided by their average, capped at 1.',
  },
  {
    name: 'Safe-to-spend',
    formula: 'Safe-to-spend = Cash − (Tax reserve + 30-day expenses + Emergency buffer)',
    note: 'What is left after every obligation is covered. It turns red when reserves exceed cash.',
  },
  {
    name: 'Effective hourly rate',
    formula: 'EHR = (Revenue − Direct expenses) ÷ (Billed hours + Scope creep hours)',
    note: 'Above $150 an hour is high margin, $75 to $150 is on target, below $75 is flagged as toxic.',
  },
  {
    name: 'Idle cash cost',
    formula: 'Lost earnings = Balance × (HYSA APR − Checking APR)',
    note: 'The yearly interest your checking balance gives up compared with a high-yield savings account.',
  },
];

const SECURITY = [
  {
    icon: HardDrive,
    title: 'Your records stay on your device',
    body: 'Transactions, clients, invoices, and settings live in your browser\'s local database. Clearing browser data removes them, so export a CSV backup regularly.',
  },
  {
    icon: EyeOff,
    title: 'AI sees only what you send',
    body: 'When you parse a statement or ask a question, that text and a summary of the figures needed to answer are sent through our server function to Anthropic. Nothing is sent otherwise.',
  },
  {
    icon: KeyRound,
    title: 'API keys never reach the browser',
    body: 'The Anthropic key is stored as a server environment variable and used only inside the serverless function.',
  },
];

const TIER_TOP = {
  free: 'border-t-[#8A94A6]',
  starter: 'border-t-[#0F8B8D]',
  pro: 'border-t-[#C5A059]',
  agency: 'border-t-[#12233F] dark:border-t-[#5B8DEF]',
};

const SEC_TILES = [
  'bg-[#E1EBF8] text-[#2E5FBF] dark:bg-[#111C2E] dark:text-[#5B8DEF]',
  'bg-[#E6E4F7] text-[#5B4FC4] dark:bg-[#1A1830] dark:text-[#8B83F0]',
  'bg-[#DDF0EC] text-[#0F8B8D] dark:bg-[#0F2321] dark:text-[#2DD4BF]',
];

const LEGAL = {
  terms: {
    title: 'Terms of Service',
    points: [
      'Sirvanta Flow provides calculators and AI-generated analysis for planning. It is not tax, legal, accounting, or investment advice.',
      'You are responsible for the figures you enter and for your own tax filings and payments.',
      'AI output can contain errors. Confirm important numbers with a licensed professional before acting on them.',
      'Paid plans are billed monthly and can be cancelled at any time.',
      'We may update these terms. Continuing to use the service after an update means you accept the change.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    points: [
      'Your transactions, clients, invoices, and settings are stored in your browser\'s local database on your device.',
      'When you use AI features, the text you submit and a summary of the figures needed to answer are sent through our server function to Anthropic to generate a response.',
      'Clearing your browser data deletes your local records. Export a CSV backup to keep a copy.',
      'Questions about your data can be sent to the contact address listed in your account.',
    ],
  },
};

/* ---------- Safe-to-Spend hero widget ---------- */
const SLIDERS = [
  { key: 'cash', label: 'Liquid cash', min: 0, max: 150000, step: 500 },
  { key: 'tax', label: 'Tax reserve', min: 0, max: 50000, step: 250 },
  { key: 'expenses', label: 'Next 30 days of expenses', min: 0, max: 40000, step: 250 },
  { key: 'buffer', label: 'Emergency buffer goal', min: 0, max: 60000, step: 500 },
];

function SafeToSpendWidget() {
  const [v, setV] = useState({ cash: 48000, tax: 11500, expenses: 9800, buffer: 15000 });

  const calc = useMemo(() => {
    const reserved = v.tax + v.expenses + v.buffer;
    const safe = v.cash - reserved;
    if (safe >= 0) {
      const base = v.cash || 1;
      return { safe, short: false, taxLen: (v.tax / base) * 100, burnLen: ((v.expenses + v.buffer) / base) * 100, safeLen: (safe / base) * 100 };
    }
    return { safe, short: true, taxLen: (v.tax / reserved) * 100, burnLen: ((v.expenses + v.buffer) / reserved) * 100, safeLen: 0 };
  }, [v]);

  const segments = [
    { len: calc.taxLen, start: 0, cls: 'stroke-[#D97706]' },
    { len: calc.burnLen, start: calc.taxLen, cls: 'stroke-[#655D4C] dark:stroke-[#71717A]' },
    { len: calc.safeLen, start: calc.taxLen + calc.burnLen, cls: 'stroke-[#16A34A]' },
  ];

  return (
    <div className={`${CARD} ${INK} p-6`}>
      <h2 className="text-base font-semibold">Safe-to-Spend</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>Move the sliders to see what you can spend after taxes, bills, and your buffer.</p>

      <div className="relative mx-auto mt-5 w-full max-w-[320px]">
        <svg viewBox="0 0 220 125" className="w-full" role="img" aria-label={`Safe to spend ${usd(Math.max(calc.safe, 0))}`}>
          <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" strokeWidth="16" pathLength="100" className="stroke-[#E5DAC2] dark:stroke-[#27272A]" />
          {segments.map((s, i) =>
            s.len > 0.2 ? (
              <path
                key={i}
                d="M 20 110 A 90 90 0 0 1 200 110"
                fill="none"
                strokeWidth="16"
                pathLength="100"
                strokeDasharray={`${s.len} ${100 - s.len}`}
                strokeDashoffset={-s.start}
                className={`${s.cls} transition-all duration-300 motion-reduce:transition-none`}
              />
            ) : null
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center" aria-live="polite">
          <div className={`text-3xl font-bold tabular-nums ${calc.short ? 'text-[#DC2626]' : INK}`}>{usd(calc.safe)}</div>
          <div className={`text-xs ${MUTED}`}>{calc.short ? 'Short of your reserves' : 'Safe to spend'}</div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {[
          ['bg-[#D97706]', 'Locked for tax', usd(v.tax)],
          ['bg-[#655D4C] dark:bg-[#71717A]', 'Bills and buffer', usd(v.expenses + v.buffer)],
          ['bg-[#16A34A]', 'Safe', usd(Math.max(calc.safe, 0))],
        ].map(([dot, label, value]) => (
          <div key={label}>
            <dt className={`flex items-center gap-1.5 ${MUTED}`}><span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />{label}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 space-y-3">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="flex items-baseline justify-between text-sm">
              <label htmlFor={`hero-${s.key}`} className={MUTED}>{s.label}</label>
              <span className="font-semibold tabular-nums">{usd(v[s.key])}</span>
            </div>
            <input
              id={`hero-${s.key}`}
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={v[s.key]}
              onChange={(e) => setV((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
              className="mt-1 h-1.5 w-full cursor-pointer accent-[#C5A059]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- small pieces ---------- */
function PillarCard({ icon: Icon, title, body, bars, tile, bar, top }) {
  return (
    <div className={`group border-t-4 p-6 ${CARD} ${top}`}>
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${tile}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="flex h-10 items-end gap-1" aria-hidden="true">
          {bars.map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}%` }}
              className={`w-1.5 origin-bottom scale-y-50 rounded-sm ${bar} transition-transform duration-500 group-hover:scale-y-100 motion-reduce:transition-none`}
            />
          ))}
        </div>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{body}</p>
    </div>
  );
}

function LegalModal({ kind, onClose }) {
  const closeRef = useRef(null);
  const content = LEGAL[kind];

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
        className={`${CARD} max-h-[85vh] w-full max-w-lg overflow-y-auto p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="legal-title" className="text-xl font-semibold">{content.title}</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className={`rounded-md p-1 ${MUTED} hover:bg-[#E8DEC7] dark:hover:bg-[#18181D]`}>
            <X size={18} />
          </button>
        </div>
        <ul className={`mt-4 space-y-3 text-sm leading-relaxed ${MUTED}`}>
          {content.points.map((p) => (
            <li key={p} className="flex gap-2"><Check size={16} className={`mt-0.5 shrink-0 ${GOLD_TEXT}`} aria-hidden="true" />{p}</li>
          ))}
        </ul>
        <button onClick={onClose} className={`${BTN_GOLD} mt-6 w-full`}>Close</button>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function LandingPage({
  darkMode = false,
  onToggleTheme = () => {},
  onLaunchSandbox = () => {},
  onSignIn = () => {},
  onUpgrade = () => {},
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState('pro');
  const [legal, setLegal] = useState(null);

  const handleTierCta = (tier) => (tier.id === 'free' ? onLaunchSandbox() : onUpgrade(tier.id));
  const linkCls = `text-sm font-medium ${MUTED} hover:text-[#1B2233] dark:hover:text-[#F4F4F5] transition-colors`;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
      `}</style>

      <div className={`min-h-screen ${CANVAS} ${INK}`} style={{ fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif" }}>
        {/* Header */}
        <header className={`sticky top-0 z-40 border-b border-[#DDD2BA] backdrop-blur dark:border-[#27272A] ${darkMode ? 'bg-[#0A0A0C]/90' : 'bg-[#F3ECDD]/90'}`}>
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <a href="#top" className="flex items-center gap-2.5" aria-label="Sirvanta Global home">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#12233F] text-base font-extrabold text-[#E7C873] dark:bg-[#D4AF37] dark:text-[#12233F]">S</span>
              <span className="text-base font-bold tracking-tight">Sirvanta <span className={`font-medium ${MUTED}`}>Global</span></span>
            </a>

            <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
              {NAV.map((n) => <a key={n.id} href={`#${n.id}`} className={linkCls}>{n.label}</a>)}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <button onClick={onToggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} className={`rounded-lg p-2.5 ${MUTED} hover:bg-[#E8DEC7] dark:hover:bg-[#18181D]`}>
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={onLaunchSandbox} className={`${BTN_OUTLINE} !py-2`}>Try Free Sandbox</button>
              <button onClick={onSignIn} className={`${BTN_GOLD} !py-2`}>Sign In / Launch Dashboard</button>
            </div>

            <div className="flex items-center gap-1 lg:hidden">
              <button onClick={onToggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} className={`rounded-lg p-2.5 ${MUTED}`}>
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Toggle menu" className="rounded-lg p-2.5">
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="border-t border-[#DDD2BA] px-5 pb-5 pt-3 dark:border-[#27272A] lg:hidden">
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {NAV.map((n) => (
                  <a key={n.id} href={`#${n.id}`} onClick={() => setMenuOpen(false)} className={`rounded-lg px-2 py-2.5 ${linkCls}`}>{n.label}</a>
                ))}
              </nav>
              <div className="mt-3 flex flex-col gap-2">
                <button onClick={onLaunchSandbox} className={BTN_OUTLINE}>Try Free Sandbox</button>
                <button onClick={onSignIn} className={BTN_GOLD}>Sign In / Launch Dashboard</button>
              </div>
            </div>
          )}
        </header>

        <main id="top">
          {/* Hero */}
          <section className="bg-gradient-to-br from-[#12233F] via-[#17325A] to-[#0F5A66] text-white dark:from-[#0B1526] dark:via-[#10213D] dark:to-[#0B3A44]">
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
            <div>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                The Financial Operating System for High-Yield Agencies &amp; Independents.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#C9D6EC]">
                Eliminate tax panic, smooth volatile monthly income into a predictable paycheck, and uncover toxic low-margin clients in real time.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={onLaunchSandbox} className={BTN_GHOST}>Launch Free Sandbox Mode</button>
                <button onClick={() => onUpgrade('pro')} className={BTN_GOLD}>Upgrade to Pro ($49/mo)</button>
              </div>
              <p className="mt-4 text-sm text-[#9FB2D0]">The sandbox needs no account and no card. Your data never leaves your browser unless you use an AI feature.</p>
            </div>
            <SafeToSpendWidget />
            </div>
          </section>

          {/* Features */}
          <section id="features" className="scroll-mt-20 border-t border-[#DDD2BA] dark:border-[#27272A]">
            <div className="mx-auto max-w-6xl px-5 py-20">
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Four tools that replace the spreadsheet and the guesswork.</h2>
              <p className={`mt-4 max-w-2xl ${MUTED}`}>Each one answers a question freelancers and agency owners ask every month.</p>
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {PILLARS.map((p) => <PillarCard key={p.title} {...p} />)}
              </div>
            </div>
          </section>

          {/* Mathematical engine */}
          <section id="engine" className="scroll-mt-20 border-t border-[#C5D5EA] bg-[#DCE7F5] dark:border-[#27272A] dark:bg-[#0C1626]">
            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Every number comes from a formula you can read.</h2>
                <p className={`mt-4 leading-relaxed ${MUTED}`}>No black box. These are the four calculations behind the dashboard, using the balances and rates you enter.</p>
              </div>
              <div className="space-y-4">
                {FORMULAS.map((f) => (
                  <div key={f.name} className={`${CARD} p-5`}>
                    <h3 className="text-sm font-semibold">{f.name}</h3>
                    <p className={`mt-2 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-[#2E5FBF] dark:text-[#5B8DEF]`}>{f.formula}</p>
                    <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{f.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="scroll-mt-20 border-t border-[#DDD2BA] dark:border-[#27272A]">
            <div className="mx-auto max-w-6xl px-5 py-20">
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Pick the plan that fits how you work.</h2>
              <p className={`mt-4 max-w-2xl ${MUTED}`}>Billed monthly. Start in the sandbox and upgrade when you want your data saved and the AI tools unlocked.</p>

              <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {TIERS.map((t) => {
                  const selected = selectedTier === t.id;
                  return (
                    <article
                      key={t.id}
                      onClick={() => setSelectedTier(t.id)}
                      className={`relative flex cursor-pointer flex-col rounded-xl border border-t-4 ${TIER_TOP[t.id]} bg-[#FAF6EC] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-colors dark:bg-[#121216] ${
                        selected ? 'border-[#C5A059] ring-1 ring-[#C5A059] dark:border-[#D4AF37] dark:ring-[#D4AF37]' : 'border-[#DDD2BA] dark:border-[#27272A]'
                      }`}
                    >
                      {t.popular && (
                        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-[#C5A059] px-3 py-1 text-xs font-bold text-[#1B2233] dark:bg-[#D4AF37]">
                          <Flame size={12} aria-hidden="true" /> Most popular
                        </span>
                      )}
                      <h3 className="text-lg font-semibold">{t.name}</h3>
                      <p className={`mt-1 text-sm ${MUTED}`}>{t.blurb}</p>
                      <div className="mt-5 flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold tracking-tight">${t.price}</span>
                        <span className={`text-sm ${MUTED}`}>/mo</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTierCta(t); }}
                        className={`${t.popular ? BTN_GOLD : BTN_OUTLINE} mt-5 w-full`}
                      >
                        {t.cta}
                      </button>
                      <ul className="mt-6 space-y-3 text-sm">
                        {t.features.map(([label, on]) => (
                          <li key={label} className={`flex items-start gap-2 ${on ? '' : MUTED}`}>
                            {on
                              ? <Check size={16} className="mt-0.5 shrink-0 text-[#16A34A]" aria-hidden="true" />
                              : <Minus size={16} className="mt-0.5 shrink-0 opacity-50" aria-hidden="true" />}
                            <span>{label}{on ? '' : ' (not included)'}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Security */}
          <section id="security" className="scroll-mt-20 border-t border-[#DDD2BA] dark:border-[#27272A]">
            <div className="mx-auto max-w-6xl px-5 py-20">
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Local-first, with clear limits on what leaves your device.</h2>
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {SECURITY.map(({ icon: Icon, title, body }, i) => (
                  <div key={title} className={`${CARD} p-6`}>
                    <span className={`grid h-10 w-10 place-items-center rounded-lg ${SEC_TILES[i]}`}><Icon size={20} aria-hidden="true" /></span>
                    <h3 className="mt-4 text-base font-semibold">{title}</h3>
                    <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Closing call to action */}
          <section className="bg-gradient-to-r from-[#12233F] to-[#0F5A66] text-white">
            <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 md:flex-row md:items-center">
              <h2 className="max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">See your real safe-to-spend number before the next tax deadline.</h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={onLaunchSandbox} className={BTN_GHOST}>Launch Free Sandbox Mode</button>
                <button onClick={() => onUpgrade('pro')} className={BTN_GOLD}>Upgrade to Pro ($49/mo)</button>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#DDD2BA] dark:border-[#27272A]">
          <div className="mx-auto max-w-6xl px-5 py-10">
            <p className={`max-w-3xl text-xs leading-relaxed ${MUTED}`}>
              Sirvanta Flow provides financial calculations and educational information. It is not tax, legal, or accounting advice, and Sirvanta is not a CPA, tax preparer, or financial advisor. Estimates use the rates you enter and may differ from your actual liability. AI-generated output can contain errors; confirm important figures with a licensed professional.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className={`text-sm ${MUTED}`}>&copy; {new Date().getFullYear()} Sirvanta Global. All rights reserved.</p>
              <div className="flex gap-5">
                <button onClick={() => setLegal('terms')} className={linkCls}>Terms of Service</button>
                <button onClick={() => setLegal('privacy')} className={linkCls}>Privacy Policy</button>
              </div>
            </div>
          </div>
        </footer>

        {legal && <LegalModal kind={legal} onClose={() => setLegal(null)} />}
      </div>
    </div>
  );
}
