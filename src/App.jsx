// src/App.jsx
// Routes: public marketing pages at /, /features, /pricing, /security, /about
// and the private workspace under /app/*.

import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './store';
import PublicLayout from './layouts/PublicLayout';
import AppLayout from './layouts/AppLayout';
import UpgradeModal from './components/UpgradeModal';
import Home from './pages/public/Home';
import Features from './pages/public/Features';
import Pricing from './pages/public/Pricing';
import Security from './pages/public/Security';
import About from './pages/public/About';
import Dashboard from './pages/app/Dashboard';
import SafeToSpend from './pages/app/SafeToSpend';
import VirtualSalary from './pages/app/VirtualSalary';
import TaxVault from './pages/app/TaxVault';
import ClientMatrix from './pages/app/ClientMatrix';
import AiAdvisor from './pages/app/AiAdvisor';
import StatementParser from './pages/app/StatementParser';
import Docs from './pages/app/Docs';
import Settings from './pages/app/Settings';

function Loading() {
  return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500 dark:bg-zinc-950 dark:text-zinc-400">Loading Sirvanta Flow…</div>;
}

/** Route guard: the workspace opens only after the local database is ready and sandbox data is loaded. */
function RequireWorkspace({ children }) {
  const ready = useStore((s) => s.ready);
  const prepareWorkspace = useStore((s) => s.prepareWorkspace);
  const [prepared, setPrepared] = React.useState(false);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    prepareWorkspace().finally(() => { if (!cancelled) setPrepared(true); });
    return () => { cancelled = true; };
  }, [ready, prepareWorkspace]);

  return ready && prepared ? children : <Loading />;
}

export default function App() {
  const ready = useStore((s) => s.ready);
  const darkMode = useStore((s) => s.darkMode);
  const init = useStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  if (!ready) return <Loading />;

  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/security" element={<Security />} />
          <Route path="/about" element={<About />} />
        </Route>

        <Route path="/app" element={<RequireWorkspace><AppLayout /></RequireWorkspace>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="safe-to-spend" element={<SafeToSpend />} />
          <Route path="virtual-salary" element={<VirtualSalary />} />
          <Route path="tax-vault" element={<TaxVault />} />
          <Route path="client-matrix" element={<ClientMatrix />} />
          <Route path="ai-advisor" element={<AiAdvisor />} />
          <Route path="statement-parser" element={<StatementParser />} />
          <Route path="docs" element={<Docs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpgradeModal />
    </>
  );
}
