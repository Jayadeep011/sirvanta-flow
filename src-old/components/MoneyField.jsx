// src/components/MoneyField.jsx
// Labelled dollar input used across the Cash Flow and Tax tabs.

import React from 'react';
import { MUTED, INPUT } from '../ui';

export default function MoneyField({ id, label, value, onChange, onBlur, hint, disabled, step = 100 }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm ${MUTED}`}>$</span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
          onBlur={onBlur}
          className={`${INPUT} pl-7 tabular-nums`}
        />
      </div>
      {hint && <p className={`mt-1 text-xs ${MUTED}`}>{hint}</p>}
    </div>
  );
}
