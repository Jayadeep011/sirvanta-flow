// src/components/Sidebar.jsx
// Collapsible left navigation: workspace switcher, page links, docs, settings and profile card.

import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronsUpDown, Check, Lock, PanelLeftClose, PanelLeftOpen, Plus, X } from 'lucide-react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { APP_NAV } from '../navigation';
import { TIER_NAMES } from '../plans';
import { MUTED, GOLD_TEXT, DIVIDER, CARD } from '../ui';

function Logo({ collapsed }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Sirvanta Flow home">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#E7C873] to-[#C5A059] text-base font-extrabold text-slate-900">S</span>
      {!collapsed && <span className="text-base font-bold tracking-tight">Sirvanta Flow</span>}
    </Link>
  );
}

function WorkspaceSwitcher({ collapsed }) {
  const t = useT();
  const userTier = useStore((s) => s.userTier);
  const entity = useStore((s) => s.selectedEntity);
  const setEntity = useStore((s) => s.setEntity);
  const openUpgrade = useStore((s) => s.openUpgrade);
  const name = useStore((s) => s.profile.name);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const agency = userTier === 'agency';

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const items = [
    { id: 'business', label: name ? `${name}'s Workspace` : 'My Workspace', locked: false },
    { id: 'personal', label: 'Personal', locked: !agency },
    { id: 'consolidated', label: 'Consolidated', locked: !agency },
  ];
  const current = items.find((i) => i.id === entity) || items[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? current.label : undefined}
        className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/5 ${DIVIDER}`}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-900 text-xs font-bold text-[#E7C873] dark:bg-white/10">{current.label[0]}</span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{current.label}</span>
              <span className={`flex items-center gap-1.5 text-xs ${MUTED}`}><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />{TIER_NAMES[userTier]}</span>
            </span>
            <ChevronsUpDown size={15} className={MUTED} aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <div role="menu" className={`${CARD} absolute z-30 mt-2 w-60 p-1.5 ${collapsed ? 'left-full top-0 ml-2 mt-0' : 'left-0'}`}>
          <p className={`px-2.5 pb-1 pt-1.5 text-xs font-semibold ${MUTED}`}>{t('ui.workspace')}</p>
          {items.map((i) => (
            <button
              key={i.id}
              role="menuitemradio"
              aria-checked={i.id === entity}
              onClick={() => { setEntity(i.id); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <span className="truncate">{i.label}</span>
              {i.id === entity ? <Check size={15} aria-hidden="true" /> : i.locked ? <Lock size={13} className={MUTED} aria-hidden="true" /> : null}
            </button>
          ))}
          <div className={`my-1 border-t ${DIVIDER}`} />
          <button
            role="menuitem"
            onClick={() => { setOpen(false); if (!agency) openUpgrade('Extra agency workspaces are included with Agency & CFO.', 'agency'); else setEntity('consolidated'); }}
            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 ${GOLD_TEXT}`}
          >
            <Plus size={14} aria-hidden="true" />{t('ui.addAgency').replace(/^\+\s*/, '')}
          </button>
        </div>
      )}
    </div>
  );
}

function NavItem({ item, collapsed, onNavigate }) {
  const t = useT();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      title={collapsed ? t(item.labelKey) : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-slate-900 text-white shadow-sm dark:bg-white/10 dark:text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100'
        } ${collapsed ? 'justify-center' : ''}`
      }
    >
      <Icon size={18} aria-hidden="true" className="shrink-0" />
      {collapsed ? <span className="sr-only">{t(item.labelKey)}</span> : <span className="truncate">{t(item.labelKey)}</span>}
    </NavLink>
  );
}

function SidebarBody({ collapsed, onNavigate, showCollapse }) {
  const t = useT();
  const userTier = useStore((s) => s.userTier);
  const profile = useStore((s) => s.profile);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 pt-4`}>
        <Logo collapsed={collapsed} />
      </div>
      <div className="px-3 pt-4"><WorkspaceSwitcher collapsed={collapsed} /></div>

      <nav aria-label="Workspace" className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {APP_NAV.filter((i) => i.group === 'main').map((i) => <NavItem key={i.id} item={i} collapsed={collapsed} onNavigate={onNavigate} />)}
      </nav>

      <div className={`space-y-1 border-t px-3 pb-3 pt-3 ${DIVIDER}`}>
        {APP_NAV.filter((i) => i.group === 'bottom').map((i) => <NavItem key={i.id} item={i} collapsed={collapsed} onNavigate={onNavigate} />)}

        <div className={`mt-2 flex items-center gap-2.5 rounded-lg border p-2 ${DIVIDER} ${collapsed ? 'justify-center' : ''}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2E5FBF] to-[#5B4FC4] text-sm font-bold text-white" aria-hidden="true">{(profile.name || 'U')[0].toUpperCase()}</span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{profile.name || 'Your profile'}</span>
              <span className={`text-xs ${GOLD_TEXT}`}>{TIER_NAMES[userTier]} {t('ui.plan')}</span>
            </span>
          )}
          {showCollapse && (
            <button
              onClick={toggleSidebar}
              aria-label={collapsed ? t('ui.expand') : t('ui.collapse')}
              className={`rounded-md p-1.5 ${MUTED} hover:bg-slate-100 dark:hover:bg-white/5 ${collapsed ? 'hidden' : ''}`}
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
        {showCollapse && collapsed && (
          <button onClick={toggleSidebar} aria-label={t('ui.expand')} className={`flex w-full justify-center rounded-md p-2 ${MUTED} hover:bg-slate-100 dark:hover:bg-white/5`}>
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const mobileOpen = useStore((s) => s.mobileNavOpen);
  const setMobileNav = useStore((s) => s.setMobileNav);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMobileNav(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, setMobileNav]);

  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
        className="fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 lg:block"
      >
        <SidebarBody collapsed={collapsed} showCollapse onNavigate={undefined} />
      </motion.aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNav(false)} />
          <motion.aside
            initial={{ x: reduce ? 0 : -288 }}
            animate={{ x: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 w-72 border-r border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-950"
          >
            <button onClick={() => setMobileNav(false)} aria-label="Close menu" className={`absolute right-3 top-4 rounded-md p-1.5 ${MUTED} hover:bg-slate-100 dark:hover:bg-white/5`}><X size={18} /></button>
            <SidebarBody collapsed={false} showCollapse={false} onNavigate={() => setMobileNav(false)} />
          </motion.aside>
        </div>
      )}
    </>
  );
}
