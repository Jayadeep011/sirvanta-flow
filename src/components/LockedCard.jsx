// src/components/LockedCard.jsx
// Shows the real UI behind a soft overlay when the current plan does not include it.

import React from 'react';
import { Lock } from 'lucide-react';
import { useStore } from '../store';
import { TIER_NAMES, lockedMessage } from '../plans';
import { CARD, MUTED, GOLD_TEXT, BTN_GOLD } from '../ui';

export default function LockedCard({ locked, tier, label, children }) {
  const openUpgrade = useStore((s) => s.openUpgrade);
  return (
    <div className="relative">
      <div
        ref={(el) => {
          if (!el) return;
          if (locked) el.setAttribute('inert', '');
          else el.removeAttribute('inert');
        }}
        aria-hidden={locked || undefined}
        className={locked ? 'pointer-events-none select-none opacity-60 blur-[3px]' : ''}
      >
        {children}
      </div>
      {locked && (
        <div className="absolute inset-0 grid place-items-center rounded-xl bg-[#F8FAFC]/60 p-4 dark:bg-[#09090B]/60">
          <div className={`${CARD} max-w-xs p-5 text-center`}>
            <Lock size={20} className={`mx-auto ${GOLD_TEXT}`} aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold">{label}</p>
            <p className={`mt-1 text-sm ${MUTED}`}>Included with {TIER_NAMES[tier]} and above.</p>
            <button onClick={() => openUpgrade(lockedMessage(label, tier), tier)} className={`${BTN_GOLD} mt-4 w-full !py-2`}>
              Unlock with {TIER_NAMES[tier]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
