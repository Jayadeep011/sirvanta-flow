// src/regions.js
// Country tax presets, currencies, and languages for the top-bar selectors.
// Presets are rough starting points for the rate fields, not tax advice. Deadlines, forms and the
// self-employment logic in the Tax Vault still follow United States (IRS) rules.

export const COUNTRIES = [
  { id: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', federal: 24, state: 5, se: true },
  { id: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', federal: 30, state: 0, se: false },
  { id: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', federal: 40, state: 0, se: false },
  { id: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', federal: 15, state: 0, se: false },
  { id: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', federal: 26, state: 9, se: false },
  { id: 'EU', name: 'European Union', flag: '🇪🇺', currency: 'EUR', federal: 35, state: 0, se: false },
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD $' },
  { code: 'INR', symbol: '₹', label: 'INR ₹' },
  { code: 'EUR', symbol: '€', label: 'EUR €' },
  { code: 'GBP', symbol: '£', label: 'GBP £' },
  { code: 'SGD', symbol: '$', label: 'SGD $' },
  { code: 'CAD', symbol: '$', label: 'CAD $' },
];

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'fr', label: 'FR', name: 'Français' },
];

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
