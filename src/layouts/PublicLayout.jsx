// src/layouts/PublicLayout.jsx
// Marketing site shell: sticky header, page content, multi-column footer.

import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { PUBLIC_NAV } from '../navigation';
import { COUNTRIES, LANGUAGES } from '../regions';
import { SOCIAL } from '../content/site';
import LegalModal from '../components/LegalModal';
import { CANVAS, INK, FONT, MUTED, BTN_GOLD } from '../ui';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Sirvanta Flow home">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#E7C873] to-[#C5A059] text-base font-extrabold text-slate-900">S</span>
      <span className="text-base font-bold tracking-tight">Sirvanta <span className={`font-medium ${MUTED}`}>Flow</span></span>
    </Link>
  );
}

export default function PublicLayout() {
  const t = useT();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const darkMode = useStore((s) => s.darkMode);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const country = useStore((s) => s.country);
  const language = useStore((s) => s.language);
  const currency = useStore((s) => s.currency);
  const [menuOpen, setMenuOpen] = useState(false);
  const [legal, setLegal] = useState(null);

  useEffect(() => {
    setMenuOpen(false);
    if (!hash) window.scrollTo(0, 0);
    else setTimeout(() => document.querySelector(hash)?.scrollIntoView(), 0);
  }, [pathname, hash]);

  const flag = (COUNTRIES.find((c) => c.id === country) || COUNTRIES[0]).flag;
  const langName = (LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]).name;
  const linkCls = ({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-slate-900 dark:text-white' : `${MUTED} hover:text-slate-900 dark:hover:text-white`}`;

  const columns = [
    { title: 'Product', links: [['/features', t('pub.features')], ['/pricing', t('pub.pricing')], ['/security', t('pub.security')]] },
    { title: 'Company', links: [['/about', t('pub.about')]] },
    { title: 'Resources', links: [['/app/docs', t('nav.docs')], ['/pricing#faq', 'Pricing FAQ'], ['/app/dashboard', t('pub.sandbox')]] },
  ];
  const socials = SOCIAL.filter((s) => s.href);

  return (
    <div className={`min-h-screen ${CANVAS} ${INK}`} style={{ fontFamily: FONT }}>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {PUBLIC_NAV.map((n) => <NavLink key={n.path} to={n.path} className={linkCls}>{t(n.labelKey)}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} className={`rounded-lg p-2.5 ${MUTED} hover:bg-slate-100 dark:hover:bg-white/5`}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={() => navigate('/app/dashboard')} className={`${BTN_GOLD} !py-2`}>{t('pub.launch')}</button>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <button onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} className={`rounded-lg p-2.5 ${MUTED}`}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Toggle menu" className="rounded-lg p-2.5">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-200 px-5 pb-5 pt-3 dark:border-white/10 md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {PUBLIC_NAV.map((n) => <NavLink key={n.path} to={n.path} className={({ isActive }) => `rounded-lg px-2 py-2.5 ${linkCls({ isActive })}`}>{t(n.labelKey)}</NavLink>)}
            </nav>
            <button onClick={() => navigate('/app/dashboard')} className={`${BTN_GOLD} mt-3 w-full`}>{t('pub.launch')}</button>
          </div>
        )}
      </header>

      <main><Outlet /></main>

      <footer className="border-t border-slate-200 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
            <div>
              <Logo />
              <p className={`mt-4 max-w-xs text-sm leading-relaxed ${MUTED}`}>The financial operating system for high-yield agencies and independents. Built by Sirvanta Global.</p>
              {socials.length > 0 && (
                <ul className="mt-4 flex gap-4 text-sm">
                  {socials.map((s) => <li key={s.label}><a href={s.href} target="_blank" rel="noreferrer" className={`${MUTED} hover:text-slate-900 dark:hover:text-white`}>{s.label}</a></li>)}
                </ul>
              )}
            </div>
            {columns.map((c) => (
              <div key={c.title}>
                <h3 className="text-sm font-semibold">{c.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map(([to, label]) => <li key={label}><Link to={to} className={`text-sm ${MUTED} hover:text-slate-900 dark:hover:text-white`}>{label}</Link></li>)}
                </ul>
              </div>
            ))}
            <div>
              <h3 className="text-sm font-semibold">Legal</h3>
              <ul className="mt-4 space-y-2.5">
                <li><button onClick={() => setLegal('terms')} className={`text-sm ${MUTED} hover:text-slate-900 dark:hover:text-white`}>Terms of Service</button></li>
                <li><button onClick={() => setLegal('privacy')} className={`text-sm ${MUTED} hover:text-slate-900 dark:hover:text-white`}>Privacy Policy</button></li>
              </ul>
            </div>
          </div>

          <p className={`mt-12 max-w-3xl text-xs leading-relaxed ${MUTED}`}>
            Sirvanta Flow provides financial calculations and educational information. It is not tax, legal, or accounting advice, and Sirvanta is not a CPA, tax preparer, or financial advisor. Estimates use the rates you enter and may differ from your actual liability. AI-generated output can contain errors; confirm important figures with a licensed professional.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-sm dark:border-white/10">
            <p className={MUTED}>&copy; {new Date().getFullYear()} Sirvanta Global. All rights reserved.</p>
            <p className={`flex items-center gap-2 ${MUTED}`}><span aria-hidden="true">{flag}</span>{langName} · {currency}</p>
          </div>
        </div>
      </footer>

      {legal && <LegalModal kind={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
