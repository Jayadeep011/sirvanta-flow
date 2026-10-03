// src/ui.js
// Shared Tailwind class strings (kept as complete literals so Tailwind can detect them).
// Look: precise slate (light) and zinc glass (dark), with a gold brand accent.

export const FONT = "'Plus Jakarta Sans', Inter, system-ui, sans-serif";

export const CANVAS = 'bg-slate-50 dark:bg-zinc-950';
export const INK = 'text-slate-900 dark:text-zinc-100';
export const MUTED = 'text-slate-500 dark:text-zinc-400';
export const GOLD_TEXT = 'text-[#7A5A17] dark:text-[#E7C873]';
export const CARD = 'bg-white border border-slate-200 rounded-xl shadow-sm dark:bg-zinc-900/60 dark:backdrop-blur-md dark:border-white/10 dark:shadow-none';
export const GLASS = 'bg-white/70 backdrop-blur-xl border border-slate-200/80 dark:bg-white/5 dark:border-white/10';
export const DIVIDER = 'border-slate-200 dark:border-white/10';
export const CONTAINER = 'mx-auto w-full max-w-6xl px-5';

const BTN_BASE = 'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60';
export const BTN_GOLD = `${BTN_BASE} bg-[#C5A059] text-slate-900 shadow-[0_0_24px_-6px_rgba(212,175,55,0.65)] hover:bg-[#B8934A] dark:bg-[#D4AF37] dark:hover:bg-[#C29F2E]`;
export const BTN_OUTLINE = `${BTN_BASE} border border-slate-300 text-slate-900 hover:bg-slate-100 dark:border-white/15 dark:text-zinc-100 dark:hover:bg-white/5`;
export const BTN_GHOST = `${BTN_BASE} border border-white/30 text-white hover:bg-white/10`;

export const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500';

/* ---- colour accents (trust blue, teal, gold, indigo) ---- */
export const CARD_BLUE = `${CARD} border-t-4 border-t-[#2E5FBF] dark:border-t-[#5B8DEF]`;
export const CARD_TEAL = `${CARD} border-t-4 border-t-[#0F8B8D] dark:border-t-[#2DD4BF]`;
export const CARD_GOLD = `${CARD} border-t-4 border-t-[#C5A059] dark:border-t-[#D4AF37]`;
export const CARD_INDIGO = `${CARD} border-t-4 border-t-[#5B4FC4] dark:border-t-[#8B83F0]`;

export const TINT_BLUE = 'bg-[#E1EBF8] dark:bg-[#111C2E]';
export const TINT_TEAL = 'bg-[#DDF0EC] dark:bg-[#0F2321]';
export const TINT_GOLD = 'bg-[#F6EFD9] dark:bg-[#1B1810]';
export const TINT_INDIGO = 'bg-[#E6E4F7] dark:bg-[#1A1830]';
export const TINT_RED = 'bg-[#FBE4E1] dark:bg-[#2A1512]';
