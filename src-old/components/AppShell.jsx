// src/components/AppShell.jsx
// The signed-in workspace (view === 'app'): sandbox banner, navy header, entity switcher and tab navigation.
// Each tab is its own component; TAB_VIEWS maps a tab id to the screen it shows.
// The Pricing tab lives here because it only reads the plan list and switches plans.

import React from 'react';
import { Sun, Moon, Lock, Check, ChevronLeft } from 'lucide-react';
import { useStore, TABS } from '../store';
import CashFlowTab from './CashFlowTab';
import TaxTab from './TaxTab';
import ClientsTab from './ClientsTab';
import AdvisorTab from './AdvisorTab';
import { PLANS, TIER_NAMES, TIER_ORDER } from '../plans';
import { MUTED, INK, CANVAS, GOLD_TEXT, BTN_GOLD, BTN_OUTLINE, FONT } from '../ui';

const ENTITIES = [
  { id: 'business', label: 'Business' },
  { id: 'personal', label: 'Personal' },
  { id: 'consolidated', label: 'Consolidated' },
];

function PricingTab() {
  const userTier = useStore((s) => s.userTier);
  const openUpgrade = useStore((s) => s.openUpgrade);
  const changeTier = useStore((s) => s.changeTier);
  const current = TIER_ORDER.indexOf(userTier);

  const downgrade = async (plan) => {
    if (window.confirm(`Switch to ${plan.name}? This is a simulated plan change for testing.`)) {
      try {
        await changeTier(plan.id);
      } catch (err) {
        window.alert(err.message || 'Could not change plan.');
      }
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pricing</h1>
      <p className={`mt-2 max-w-2xl ${MUTED}`}>You are on the {TIER_NAMES[userTier]} plan. Plan changes here are simulated until real billing is connected.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = p.id === userTier;
          const rank = TIER_ORDER.indexOf(p.id);
          return (
            <article key={p.id} className={`flex flex-col rounded-xl border bg-[#FAF6EC] p-6 dark:bg-[#121216] ${isCurrent ? 'border-[#C5A059] ring-1 ring-[#C5A059] dark:border-[#D4AF37] dark:ring-[#D4AF37]' : 'border-[#DDD2BA] dark:border-[#27272A]'}`}>
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <div className="mt-3 flex items-baseline gap-1"><span className="text-3xl font-extrabold">${p.price}</span><span className={`text-sm ${MUTED}`}>/mo</span></div>
              {isCurrent ? (
                <button disabled className={`${BTN_OUTLINE} mt-4 w-full`}>Current plan</button>
              ) : rank > current ? (
                <button onClick={() => openUpgrade('', p.id)} className={`${BTN_GOLD} mt-4 w-full`}>Upgrade to {p.name}</button>
              ) : (
                <button onClick={() => downgrade(p)} className={`${BTN_OUTLINE} mt-4 w-full`}>Switch to {p.name}</button>
              )}
              <ul className="mt-5 space-y-2.5 text-sm">
                {p.features.map(([label, on]) => (
                  <li key={label} className={`flex items-start gap-2 ${on ? '' : MUTED}`}>
                    {on ? <Check size={16} className="mt-0.5 shrink-0 text-[#16A34A]" aria-hidden="true" /> : <Lock size={14} className="mt-1 shrink-0 opacity-50" aria-hidden="true" />}
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const TAB_VIEWS = { cashflow: CashFlowTab, tax: TaxTab, clients: ClientsTab, ai: AdvisorTab, pricing: PricingTab };

export default function AppShell() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const userTier = useStore((s) => s.userTier);
  const darkMode = useStore((s) => s.darkMode);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const goLanding = useStore((s) => s.goLanding);
  const openUpgrade = useStore((s) => s.openUpgrade);
  const selectedEntity = useStore((s) => s.selectedEntity);
  const setEntity = useStore((s) => s.setEntity);
  const clearSampleData = useStore((s) => s.clearSampleData);

  const ActiveView = TAB_VIEWS[activeTab] || CashFlowTab;
  const free = userTier === 'free';
  const canSwitchEntity = userTier === 'agency';

  const onClear = async () => {
    if (window.confirm('Delete all transactions, clients, and invoices from this browser? Your settings and plan are kept.')) {
      try {
        await clearSampleData();
      } catch (err) {
        window.alert(err.message || 'Could not clear data.');
      }
    }
  };

  return (
    <div className={`min-h-screen ${CANVAS} ${INK}`} style={{ fontFamily: FONT }}>
      {free && (
        <div role="status" className="bg-[#E9DEC4] px-5 py-2.5 text-center text-sm text-[#1B2233] dark:bg-[#1B1810] dark:text-[#F4F4F5]">
          You are viewing Sirvanta Flow in Free Sandbox Mode.{' '}
          <button onClick={() => openUpgrade('', 'pro')} className={`font-bold underline ${GOLD_TEXT}`}>Upgrade to Pro</button>{' '}
          to unlock full local data saving &amp; AI capabilities.
        </div>
      )}

      <header className="border-b border-white/10 bg-[#12233F] text-white dark:bg-[#0B1526]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <button onClick={goLanding} className={`inline-flex items-center gap-1 rounded-lg p-1.5 text-sm text-[#B8C4DA] hover:bg-white/10`} aria-label="Back to website">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#E7C873] text-base font-extrabold text-[#12233F]">S</span>
            <span className="text-base font-bold tracking-tight">Sirvanta Flow</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold border-white/25 text-[#E7C873]`}>{TIER_NAMES[userTier]}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Entity" className={`flex rounded-lg border border-white/20 p-0.5`}>
              {ENTITIES.map((en) => {
                const active = selectedEntity === en.id;
                const locked = !canSwitchEntity && en.id !== 'business';
                return (
                  <button
                    key={en.id}
                    onClick={() => setEntity(en.id)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active ? 'bg-[#E7C873] text-[#12233F]' : `text-[#B8C4DA] hover:bg-white/10`
                    }`}
                  >
                    {locked && <Lock size={11} aria-hidden="true" />}{en.label}
                  </button>
                );
              })}
            </div>
            {!free && <button onClick={onClear} className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-[#B8C4DA] hover:bg-white/10`}>Clear sample data</button>}
            <button onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} className={`rounded-lg p-2 text-[#B8C4DA] hover:bg-white/10`}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl overflow-x-auto px-5" aria-label="Sections">
          <div role="tablist" className="flex gap-1">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(t.id)}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    active ? 'border-[#E7C873] text-white' : `border-transparent text-[#B8C4DA] hover:text-white`
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10" role="tabpanel">
        <ActiveView />
      </main>
    </div>
  );
}
