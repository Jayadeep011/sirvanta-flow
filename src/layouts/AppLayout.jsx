// src/layouts/AppLayout.jsx
// The signed-in workspace shell: sidebar, top bar, sandbox banner, page transition, and Cmd+K palette.

import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useStore } from '../store';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import CommandPalette from '../components/CommandPalette';
import { CANVAS, INK, FONT, GOLD_TEXT } from '../ui';

export default function AppLayout() {
  const { pathname } = useLocation();
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const userTier = useStore((s) => s.userTier);
  const currency = useStore((s) => s.currency);
  const language = useStore((s) => s.language);
  const openUpgrade = useStore((s) => s.openUpgrade);
  const setMobileNav = useStore((s) => s.setMobileNav);
  const setPalette = useStore((s) => s.setPalette);
  const reduce = useReducedMotion();

  useEffect(() => {
    window.scrollTo(0, 0);
    setMobileNav(false);
  }, [pathname, setMobileNav]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPalette]);

  return (
    <div className={`min-h-screen ${CANVAS} ${INK}`} style={{ fontFamily: FONT }}>
      <a href="#main" className="sr-only z-50 rounded bg-white px-3 py-2 text-sm text-slate-900 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <Sidebar />
      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        {userTier === 'free' && (
          <div role="status" className="border-b border-amber-300/40 bg-amber-50 px-4 py-2 text-center text-sm text-slate-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            You are viewing Sirvanta Flow in Free Sandbox Mode.{' '}
            <button onClick={() => openUpgrade('', 'pro')} className={`font-bold underline ${GOLD_TEXT}`}>Upgrade to Pro</button>{' '}
            to unlock full local data saving &amp; AI capabilities.
          </div>
        )}
        <TopBar />
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <motion.div key={`${pathname}-${currency}-${language}`} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
