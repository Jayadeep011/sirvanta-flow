// src/store.js
// Global app state (Zustand). Persistent data lives in Dexie (db.js); this store holds
// navigation, theme, the current plan, and the access-control "gatekeeper" actions.

import { create } from 'zustand';
import {
  db, getSettings, setUserTier, updateSettings, seedDemoData, clearAllData,
  hasFeature, getAiUsage, TIER_LIMITS,
} from './db';
import { TIER_ORDER, TIER_NAMES, lockedMessage } from './plans';

export const TABS = [
  { id: 'cashflow', label: 'Cash flow' },
  { id: 'tax', label: 'Tax & expenses' },
  { id: 'clients', label: 'Clients' },
  { id: 'ai', label: 'Sirvanta Advisor' },
  { id: 'pricing', label: 'Pricing' },
];

const THEME_KEY = 'sirvanta-theme';

const readTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark';
  } catch {
    return false;
  }
};

/** Lowest plan that includes a feature flag from TIER_LIMITS. */
const lowestTierWith = (feature) => TIER_ORDER.find((t) => hasFeature(t, feature)) || 'pro';

export const useStore = create((set, get) => ({
  view: 'landing', // 'landing' | 'app'
  activeTab: 'cashflow', // 'cashflow' | 'tax' | 'clients' | 'ai' | 'pricing'
  darkMode: readTheme(),
  userTier: 'free', // 'free' | 'starter' | 'pro' | 'agency'
  selectedEntity: 'business', // 'business' | 'personal' | 'consolidated'
  ready: false,
  upgradeModal: null, // null | { reason: string, tier: 'starter' | 'pro' | 'agency' }

  /* ---- startup ---- */
  init: async () => {
    try {
      const settings = await getSettings();
      set({ userTier: settings.userTier, selectedEntity: settings.selectedEntity, ready: true });
    } catch (err) {
      // IndexedDB can be blocked (some private-browsing modes). Fall back to in-memory defaults.
      console.error('Sirvanta: could not open local database.', err);
      set({ ready: true });
    }
  },

  /* ---- navigation and theme ---- */
  enterApp: async () => {
    if (get().userTier === 'free') {
      try {
        if ((await db.transactions.count()) === 0) await seedDemoData();
      } catch (err) {
        console.error('Sirvanta: could not load demo data.', err);
      }
    }
    set({ view: 'app', activeTab: 'cashflow' });
  },
  goLanding: () => set({ view: 'landing' }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleTheme: () => {
    const next = !get().darkMode;
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      // Theme still switches for this session if storage is unavailable.
    }
    set({ darkMode: next });
  },

  /* ---- plan changes ---- */
  openUpgrade: (reason = '', tier = 'pro') =>
    set({ upgradeModal: { reason, tier: tier === 'free' ? 'pro' : tier } }),
  closeUpgrade: () => set({ upgradeModal: null }),

  /** Switch plan without opening the modal (used after checkout and for test downgrades). */
  changeTier: async (tier) => {
    await setUserTier(tier);
    const patch = { userTier: tier };
    if (!hasFeature(tier, 'entitySwitcher') && get().selectedEntity !== 'business') {
      await updateSettings({ selectedEntity: 'business' });
      patch.selectedEntity = 'business';
    }
    set(patch);
  },
  completeUpgrade: async (tier) => {
    await get().changeTier(tier);
  },

  /* ---- gatekeepers: return true when allowed, otherwise open the Upgrade modal and return false ---- */
  requireFeature: (feature, label) => {
    const { userTier, openUpgrade } = get();
    if (hasFeature(userTier, feature)) return true;
    const tier = lowestTierWith(feature);
    openUpgrade(lockedMessage(label, tier), tier);
    return false;
  },
  requireClientSlot: async () => {
    const { userTier, openUpgrade } = get();
    const limit = TIER_LIMITS[userTier].maxClients;
    const count = await db.clients.count();
    if (count < limit) return true;
    const next = TIER_ORDER.find((t) => TIER_LIMITS[t].maxClients > count) || 'pro';
    openUpgrade(`Your ${TIER_NAMES[userTier]} plan includes up to ${limit} clients. ${TIER_NAMES[next]} lets you add more.`, next);
    return false;
  },
  /**
   * kind: 'parse' (statement parser) or 'query' (scenario search and briefings).
   * Blocks when the plan has no AI access or this month's allowance is used up.
   */
  requireAi: async (kind, label) => {
    const { userTier, openUpgrade } = get();
    const limits = TIER_LIMITS[userTier];
    const allowance = kind === 'parse' ? limits.aiParsesPerMonth : limits.aiQueriesPerMonth;
    if (allowance <= 0) {
      openUpgrade(lockedMessage(label, 'pro'), 'pro');
      return false;
    }
    if (Number.isFinite(allowance)) {
      const usage = await getAiUsage();
      const used = kind === 'parse' ? usage.parses : usage.queries;
      if (used >= allowance) {
        openUpgrade(
          `You have used all ${allowance} AI ${kind === 'parse' ? 'statement parsings' : 'queries'} included this month. ${TIER_NAMES.agency} has no monthly limit.`,
          'agency'
        );
        return false;
      }
    }
    return true;
  },

  /* ---- entity switcher (Agency & CFO) ---- */
  setEntity: async (entity) => {
    const { userTier, openUpgrade } = get();
    if (entity !== 'business' && !hasFeature(userTier, 'entitySwitcher')) {
      openUpgrade(lockedMessage('The multi-entity switcher', 'agency'), 'agency');
      return;
    }
    await updateSettings({ selectedEntity: entity });
    set({ selectedEntity: entity });
  },

  /* ---- data ---- */
  clearSampleData: async () => {
    await clearAllData();
  },
}));
