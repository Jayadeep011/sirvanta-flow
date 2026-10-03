// src/plans.js
// Single source of truth for plan names, prices and feature lists.
// Used by the landing page, the Pricing tab and the Upgrade modal.

export const TIER_ORDER = ['free', 'starter', 'pro', 'agency'];

export const TIER_NAMES = {
  free: 'Free Sandbox',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency & CFO',
};

/** True when `tier` is the same as or higher than `min`. */
export const tierAtLeast = (tier, min) => TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);

/** Sentence shown in the Upgrade modal when a locked feature is clicked. */
export const lockedMessage = (label, minTier) => `${label} is included with ${TIER_NAMES[minTier]} and above.`;

export const PLANS = [
  {
    id: 'free', name: 'Free Sandbox', price: 0, blurb: 'Explore the math with demo data.', cta: 'Launch free sandbox',
    features: [
      ['Read-only demo data', true], ['Basic Safe-to-Spend dial', true], ['Manual tax calculator', true],
      ['Up to 2 clients', true], ['AI statement parsing', false], ['AI advisor', false],
    ],
  },
  {
    id: 'starter', name: 'Starter', price: 19, blurb: 'The basics, saved on your device.', cta: 'Choose Starter',
    features: [
      ['Basic Virtual Salary Engine', true], ['Manual tax vault', true], ['Up to 5 clients', true],
      ['Standard CSV export', true], ['Schedule C scanner', false], ['AI statement parsing and advisor', false],
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 49, popular: true, blurb: 'Everything a solo operator needs.', cta: 'Upgrade to Pro',
    features: [
      ['Full Virtual Salary Engine', true], ['Safe-to-Spend dial', true], ['Real-time quarterly tax vault', true],
      ['Schedule C scanner', true], ['Unlimited clients', true], ['Effective hourly rate matrix', true],
      ['10 AI statement parsings a month', true], ['15 AI queries a month', true],
    ],
  },
  {
    id: 'agency', name: 'Agency & CFO', price: 149, blurb: 'For owners running several entities.', cta: 'Choose Agency & CFO',
    features: [
      ['Everything in Pro', true], ['Multi-entity switcher', true], ['Yield radar', true],
      ['Unlimited AI parsing and queries', true], ['1-click executive briefings', true], ['Custom PDF invoice builder', true],
    ],
  },
];

/* ---------- annual billing ---------- */
export const ANNUAL_DISCOUNT = 0.2;

/** Yearly price with the 20% discount, rounded to whole dollars. */
export const annualPrice = (plan) => Math.round(plan.price * 12 * (1 - ANNUAL_DISCOUNT));

/** The monthly-equivalent price when billed yearly, to two decimals. */
export const annualPerMonth = (plan) => Math.round((plan.price * (1 - ANNUAL_DISCOUNT)) * 100) / 100;

/* ---------- feature matrix: [label, free, starter, pro, agency]; true / false / short text ---------- */
export const FEATURE_MATRIX = [
  ['Safe-to-Spend dial', true, true, true, true],
  ['Virtual Salary Engine', false, 'Basic', 'Volatility-adjusted', 'Volatility-adjusted'],
  ['12-month liquidity simulator', false, false, true, true],
  ['Tax reserve calculator', true, true, true, true],
  ['Quarterly tax vault', false, 'Manual revenue', 'Live from transactions', 'Live from transactions'],
  ['Schedule C write-off scanner', false, false, true, true],
  ['Yield radar', false, false, false, true],
  ['Clients', '2 (demo)', '5', 'Unlimited', 'Unlimited'],
  ['Effective hourly rate matrix', false, false, true, true],
  ['PDF invoice builder', false, false, false, true],
  ['Saved data and CSV export', false, true, true, true],
  ['AI statement parsing', false, false, '10 per month', 'Unlimited'],
  ['AI scenario questions', false, false, '15 per month', 'Unlimited'],
  ['Executive briefings', false, false, false, true],
  ['Multi-entity workspaces', false, false, false, true],
];

export const PRICING_FAQ = [
  ['Is the sandbox really free?', 'Yes. The Free Sandbox needs no account and no card. It uses read-only demo data so you can explore every screen your plan includes.'],
  ['Where is my data stored?', 'In your own browser, in a local database (IndexedDB). Transactions, clients, invoices and settings are not uploaded to a Sirvanta server.'],
  ['What happens if I clear my browser data?', 'Your local records are deleted with it. Use Settings, then Data & Local Sync, to export a backup file and import it later.'],
  ['Do the AI features send my data anywhere?', 'Only when you use them. The statement text or question you submit, plus a summary of the figures needed to answer, goes through our server function to an AI provider. Nothing is sent otherwise.'],
  ['Can I cancel or change plans?', 'Yes. Paid plans are billed monthly or yearly and you can switch or cancel at any time from Settings.'],
  ['Is this tax or financial advice?', 'No. Sirvanta Flow provides calculators and AI-generated analysis for planning. Confirm important figures with a licensed professional.'],
  ['Which countries are supported?', 'The tax engine follows United States rules (IRS payment calendar, Schedule C, 1040-ES worksheet). Other countries get local currency formatting and starting rate presets, but deadlines and forms stay US-based for now.'],
];
