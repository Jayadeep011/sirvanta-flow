// src/store.js
// Global app state (Zustand). Persistent data lives in Dexie (db.js); this store holds
// preferences (theme, currency, language), the current plan, shared Safe-to-Spend inputs,
// and the access-control "gatekeeper" actions. Navigation itself is handled by React Router.

import { create } from 'zustand';
import {
  db, getSettings, setUserTier, updateSettings, seedDemoData, clearAllData,
  hasFeature, getAiUsage, TIER_LIMITS,
} from './db';
import { TIER_ORDER, TIER_NAMES, lockedMessage } from './plans';
import { COUNTRIES } from './regions';
import { setCurrency } from './finance';

const THEME_KEY = 'sirvanta-theme';
const SIDEBAR_KEY = 'sirvanta-sidebar';

const readLocal = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The preference still applies for this session if storage is unavailable.
  }
};

const readTheme = () => {
  const saved = readLocal(THEME_KEY);
  if (saved) return saved === 'dark';
  return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
};

/** Lowest plan that includes a feature flag from TIER_LIMITS. */
const lowestTierWith = (feature) => TIER_ORDER.find((t) => hasFeature(t, feature)) || 'pro';

export const DEFAULT_PROFILE = { name: '', email: '' };
export const DEFAULT_CASH_INPUTS = { cash: 48000, tax: 11500, expenses: 3000, buffer: 15000 };

export const useStore = create((set, get) => ({
  darkMode: readTheme(),
  sidebarCollapsed: readLocal(SIDEBAR_KEY) === '1',
  mobileNavOpen: false,
  paletteOpen: false,

  userTier: 'free', // 'free' | 'starter' | 'pro' | 'agency'
  selectedEntity: 'business', // 'business' | 'personal' | 'consolidated'
  currency: 'USD',
  country: 'US',
  language: 'en',
  profile: DEFAULT_PROFILE,
  fiscalYearEnd: { month: 11, day: 31 }, // month is 0-based (11 = December)
  ready: false,
  upgradeModal: null, // null | { reason, tier, billing }

  // Safe-to-Spend inputs shared by the Dashboard, Safe-to-Spend Engine and simulator. null = not loaded yet.
  cashInputs: null,
  targetDraw: 4000,

  /* ---- startup ---- */
  init: async () => {
    try {
      const s = await getSettings();
      setCurrency(s.currency || 'USD');
      set({
        userTier: s.userTier,
        selectedEntity: s.selectedEntity,
        currency: s.currency || 'USD',
        country: s.country || 'US',
        language: s.language || 'en',
        profile: { ...DEFAULT_PROFILE, ...(s.profile || {}) },
        fiscalYearEnd: s.fiscalYearEnd || { month: 11, day: 31 },
        ready: true,
      });
    } catch (err) {
      // IndexedDB can be blocked (some private-browsing modes). Fall back to in-memory defaults.
      console.error('Sirvanta: could not open local database.', err);
      set({ ready: true });
    }
  },

  /** Called when the workspace opens. Free sandbox users get demo data the first time. */
  prepareWorkspace: async () => {
    if (get().userTier !== 'free') return;
    try {
      if ((await db.transactions.count()) === 0) await seedDemoData();
    } catch (err) {
      console.error('Sirvanta: could not load demo data.', err);
    }
  },

  /* ---- interface preferences ---- */
  toggleTheme: () => {
    const next = !get().darkMode;
    writeLocal(THEME_KEY, next ? 'dark' : 'light');
    set({ darkMode: next });
  },
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    writeLocal(SIDEBAR_KEY, next ? '1' : '0');
    set({ sidebarCollapsed: next });
  },
  setMobileNav: (open) => set({ mobileNavOpen: open }),
  setPalette: (open) => set({ paletteOpen: open }),

  /* ---- regional settings (saved with the rest of your local data) ---- */
  setCurrency: async (code) => {
    setCurrency(code);
    set({ currency: code });
    await updateSettings({ currency: code }).catch(() => {});
  },
  setLanguage: async (code) => {
    set({ language: code });
    await updateSettings({ language: code }).catch(() => {});
  },
  /** Applies a country's currency and starting tax-rate preset. */
  setCountry: async (id) => {
    const preset = COUNTRIES.find((c) => c.id === id);
    if (!preset) return;
    setCurrency(preset.currency);
    set({ country: id, currency: preset.currency, cashInputs: null });
    await updateSettings({
      country: id, currency: preset.currency,
      federalTaxRate: preset.federal, stateTaxRate: preset.state, selfEmploymentTax: preset.se,
    }).catch(() => {});
  },
  setFiscalYearEnd: async (value) => {
    set({ fiscalYearEnd: value });
    await updateSettings({ fiscalYearEnd: value }).catch(() => {});
  },
  updateProfile: async (patch) => {
    const profile = { ...get().profile, ...patch };
    set({ profile });
    await updateSettings({ profile }).catch(() => {});
  },

  /* ---- shared Safe-to-Spend inputs ---- */
  setCashInputs: (valueOrUpdater) =>
    set((s) => {
      const base = s.cashInputs || DEFAULT_CASH_INPUTS;
      return { cashInputs: typeof valueOrUpdater === 'function' ? valueOrUpdater(base) : valueOrUpdater };
    }),
  setTargetDraw: (value) => set({ targetDraw: value }),

  /* ---- plan changes ---- */
  openUpgrade: (reason = '', tier = 'pro', billing = 'monthly') =>
    set({ upgradeModal: { reason, tier: tier === 'free' ? 'pro' : tier, billing } }),
  closeUpgrade: () => set({ upgradeModal: null }),

  /** Switch plan without opening the modal (used after checkout and for test downgrades). */
  changeTier: async (tier) => {
    await setUserTier(tier);
    const patch = { userTier: tier };
    if (!hasFeature(tier, 'entitySwitcher') && get().selectedEntity !== 'business') {
      await updateSettings({ selectedEntity: 'business' });
      patch.selectedEntity = 'business';
      patch.cashInputs = null;
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

  /* ---- workspace switcher (Agency & CFO) ---- */
  setEntity: async (entity) => {
    const { userTier, openUpgrade } = get();
    if (entity !== 'business' && !hasFeature(userTier, 'entitySwitcher')) {
      openUpgrade(lockedMessage('Multiple workspaces', 'agency'), 'agency');
      return;
    }
    await updateSettings({ selectedEntity: entity });
    set({ selectedEntity: entity, cashInputs: null });
  },

  /* ---- data ---- */
  clearSampleData: async () => {
    await clearAllData();
    set({ cashInputs: null });
  },
  /** Re-reads settings after an import or wipe. */
  reloadAfterDataChange: async () => {
    set({ cashInputs: null });
    await get().init();
  },
}));
