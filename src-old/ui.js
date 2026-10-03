// src/ui.js
// Shared Tailwind class strings (kept as complete literals so Tailwind can detect them).

export const FONT = "'Plus Jakarta Sans', Inter, system-ui, sans-serif";

export const CANVAS = 'bg-[#F3ECDD] dark:bg-[#0A0A0C]';
export const INK = 'text-[#1B2233] dark:text-[#F4F4F5]';
export const MUTED = 'text-[#655D4C] dark:text-[#A1A1AA]';
export const GOLD_TEXT = 'text-[#7A5A17] dark:text-[#D4AF37]';
export const CARD = 'bg-[#FAF6EC] dark:bg-[#121216] border border-[#DDD2BA] dark:border-[#27272A] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]';
export const DIVIDER = 'border-[#DDD2BA] dark:border-[#27272A]';

const BTN_BASE = 'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3ECDD] dark:focus-visible:ring-offset-[#0A0A0C] disabled:cursor-not-allowed disabled:opacity-60';
export const BTN_GOLD = `${BTN_BASE} bg-[#C5A059] text-[#1B2233] hover:bg-[#B8934A] dark:bg-[#D4AF37] dark:hover:bg-[#C29F2E]`;
export const BTN_OUTLINE = `${BTN_BASE} border border-[#CBBE9F] text-[#1B2233] hover:bg-[#E8DEC7] dark:border-[#3F3F46] dark:text-[#F4F4F5] dark:hover:bg-[#18181D]`;

export const INPUT = 'w-full rounded-lg border border-[#CBBE9F] bg-[#FAF6EC] px-3 py-2.5 text-sm text-[#1B2233] placeholder:text-[#9A8F78] focus:outline-none focus:ring-2 focus:ring-[#C5A059] dark:border-[#3F3F46] dark:bg-[#0A0A0C] dark:text-[#F4F4F5]';

/* ---- colour accents (trust blue, teal, gold, indigo) ---- */
export const CARD_BLUE = `${CARD} border-t-4 border-t-[#2E5FBF] dark:border-t-[#5B8DEF]`;
export const CARD_TEAL = `${CARD} border-t-4 border-t-[#0F8B8D] dark:border-t-[#2DD4BF]`;
export const CARD_GOLD = `${CARD} border-t-4 border-t-[#C5A059] dark:border-t-[#D4AF37]`;
export const CARD_INDIGO = `${CARD} border-t-4 border-t-[#5B4FC4] dark:border-t-[#8B83F0]`;

export const TINT_BLUE = 'bg-[#E1EBF8] dark:bg-[#111C2E]';
export const TINT_TEAL = 'bg-[#DDF0EC] dark:bg-[#0F2321]';
export const TINT_GOLD = 'bg-[#EFE3C6] dark:bg-[#1B1810]';
export const TINT_INDIGO = 'bg-[#E6E4F7] dark:bg-[#1A1830]';

export const NAVY = 'bg-[#12233F]';
