// src/navigation.js
// Single list of workspace pages, used by the sidebar, breadcrumbs, and the Cmd+K palette.

import { LayoutDashboard, Gauge, Wallet, Landmark, Users, Sparkles, FileUp, BookOpen, Settings } from 'lucide-react';

export const APP_NAV = [
  { id: 'dashboard', path: '/app/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, group: 'main' },
  { id: 'safe', path: '/app/safe-to-spend', labelKey: 'nav.safe', icon: Gauge, group: 'main' },
  { id: 'salary', path: '/app/virtual-salary', labelKey: 'nav.salary', icon: Wallet, group: 'main' },
  { id: 'tax', path: '/app/tax-vault', labelKey: 'nav.tax', icon: Landmark, group: 'main' },
  { id: 'clients', path: '/app/client-matrix', labelKey: 'nav.clients', icon: Users, group: 'main' },
  { id: 'advisor', path: '/app/ai-advisor', labelKey: 'nav.advisor', icon: Sparkles, group: 'main' },
  { id: 'parser', path: '/app/statement-parser', labelKey: 'nav.parser', icon: FileUp, group: 'main' },
  { id: 'docs', path: '/app/docs', labelKey: 'nav.docs', icon: BookOpen, group: 'bottom' },
  { id: 'settings', path: '/app/settings', labelKey: 'nav.settings', icon: Settings, group: 'bottom' },
];

export const PUBLIC_NAV = [
  { path: '/features', labelKey: 'pub.features' },
  { path: '/pricing', labelKey: 'pub.pricing' },
  { path: '/security', labelKey: 'pub.security' },
  { path: '/about', labelKey: 'pub.about' },
];
