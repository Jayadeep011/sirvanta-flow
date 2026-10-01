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
