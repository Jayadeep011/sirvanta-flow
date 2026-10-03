// src/components/TopBar.jsx
// App header: mobile menu, breadcrumbs, Cmd+K search, region/currency/language selectors, plan badge, theme.

import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, Menu, Moon, Search, Sun } from 'lucide-react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { APP_NAV } from '../navigation';
import { COUNTRIES, CURRENCIES, LANGUAGES } from '../regions';
import { TIER_NAMES } from '../plans';
import { MUTED, GOLD_TEXT, DIVIDER, BTN_GOLD } from '../ui';

const selectCls = 'h-9 rounded-lg border bg-transparent px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#C5A059] border-slate-300 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100';

export default function TopBar() {
  const t = useT();
  const { pathname } = useLocation();
  const darkMode = useStore((s) => s.darkMode);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setMobileNav = useStore((s) => s.setMobileNav);
  const setPalette = useStore((s) => s.setPalette);
  const userTier = useStore((s) => s.userTier);
  const openUpgrade = useStore((s) => s.openUpgrade);
  const country = useStore((s) => s.country);
  const currency = useStore((s) => s.currency);
  const language = useStore((s) => s.language);
  const setCountry = useStore((s) => s.setCountry);
  const setCurrency = useStore((s) => s.setCurrency);
  const setLanguage = useStore((s) => s.setLanguage);

  const current = APP_NAV.find((i) => pathname.startsWith(i.path));

  const changeCountry = (id) => {
    const preset = COUNTRIES.find((c) => c.id === id);
    const msg = `Apply the ${preset.name} preset? This sets the currency to ${preset.currency} and your tax rates to ${preset.federal}% income tax, ${preset.state}% regional tax, self-employment tax ${preset.se ? 'on' : 'off'}. These are rough starting points, so adjust them in the Tax Vault. Deadlines and forms still follow US rules.`;
    if (window.confirm(msg)) setCountry(id);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={() => setMobileNav(true)} aria-label="Open menu" className={`rounded-md p-2 lg:hidden ${MUTED} hover:bg-slate-100 dark:hover:bg-white/5`}><Menu size={20} /></button>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
          <span className={MUTED}>{t('ui.app')}</span>
          <ChevronRight size={14} className={MUTED} aria-hidden="true" />
          <span className="truncate font-semibold" aria-current="page">{current ? t(current.labelKey) : ''}</span>
        </nav>

        <button
          onClick={() => setPalette(true)}
          className={`ml-auto flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border px-3 text-left text-sm sm:ml-auto ${DIVIDER} ${MUTED} hover:bg-slate-100 dark:hover:bg-white/5`}
          aria-label="Open command palette"
        >
          <Search size={15} aria-hidden="true" />
          <span className="flex-1 truncate">{t('ui.search')}</span>
          <kbd className="hidden rounded border border-slate-300 px-1.5 text-[10px] font-semibold dark:border-white/20 sm:inline">⌘K</kbd>
        </button>

        <div className="hidden items-center gap-2 xl:flex">
          <label className="sr-only" htmlFor="tb-country">{t('ui.country')}</label>
          <select id="tb-country" value={country} onChange={(e) => changeCountry(e.target.value)} className={selectCls} title={t('ui.country')}>
            {COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="tb-currency">{t('ui.currency')}</label>
          <select id="tb-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls} title={t('ui.currency')}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="tb-lang">{t('ui.language')}</label>
          <select id="tb-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className={selectCls} title={t('ui.language')}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        <span className={`hidden rounded-full border px-2.5 py-1 text-xs font-semibold md:inline ${DIVIDER} ${GOLD_TEXT}`}>{TIER_NAMES[userTier]} {t('ui.plan')}</span>
        {userTier !== 'agency' && (
          <button onClick={() => openUpgrade('', userTier === 'pro' ? 'agency' : 'pro')} className={`${BTN_GOLD} !px-3.5 !py-2 !text-xs`}>{t('ui.upgrade')}</button>
        )}
        <button onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} className={`rounded-md p-2 ${MUTED} hover:bg-slate-100 dark:hover:bg-white/5`}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
