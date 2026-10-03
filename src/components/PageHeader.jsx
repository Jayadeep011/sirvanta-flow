// src/components/PageHeader.jsx
import React from 'react';
import { MUTED } from '../ui';

export default function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className={`mt-2 max-w-2xl text-sm sm:text-base ${MUTED}`}>{description}</p>}
      </div>
      {children}
    </div>
  );
}
