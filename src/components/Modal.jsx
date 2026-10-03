// src/components/Modal.jsx
// Accessible dialog shell: Escape and backdrop close it, focus starts on the close button.

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { CARD_BLUE, MUTED } from '../ui';

export default function Modal({ title, onClose, children, maxWidth = 'max-w-xl', card = CARD_BLUE }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-start overflow-y-auto bg-black/50 p-4 sm:place-items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${card} my-8 w-full ${maxWidth} p-6 sm:p-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className={`rounded-md p-1 ${MUTED} hover:bg-[#F1F5F9] dark:hover:bg-white/5`}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
