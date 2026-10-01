// src/App.jsx
// Root component: starts the database/store, applies the theme, and switches between
// the public landing page and the signed-in app based on `view`.

import React, { useEffect } from 'react';
import { useStore } from './store';
import LandingPage from './components/LandingPage';
import AppShell from './components/AppShell';
import UpgradeModal from './components/UpgradeModal';

export default function App() {
  const view = useStore((s) => s.view);
  const ready = useStore((s) => s.ready);
  const darkMode = useStore((s) => s.darkMode);
  const init = useStore((s) => s.init);
  const enterApp = useStore((s) => s.enterApp);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const openUpgrade = useStore((s) => s.openUpgrade);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.body.style.backgroundColor = darkMode ? '#0A0A0C' : '#F3ECDD';
  }, [darkMode]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-[#F3ECDD] text-sm text-[#655D4C] dark:bg-[#0A0A0C]">Loading Sirvanta Flow…</div>;
  }

  return (
    <>
      {view === 'landing' ? (
        <LandingPage
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          onLaunchSandbox={enterApp}
          onSignIn={enterApp}
          onUpgrade={(tierId) => openUpgrade('', tierId)}
        />
      ) : (
        <AppShell />
      )}
      <UpgradeModal />
    </>
  );
}
