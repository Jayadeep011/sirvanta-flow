// src/pages/app/TaxVault.jsx
// Tax Vault: reserve calculator, quarterly vault, Schedule C scanner and yield radar (all in TaxTab).

import React from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../../store';
import { COUNTRIES } from '../../regions';
import TaxTab from '../../components/TaxTab';
import { MUTED, TINT_BLUE } from '../../ui';

export default function TaxVaultPage() {
  const country = useStore((s) => s.country);
  const name = (COUNTRIES.find((c) => c.id === country) || COUNTRIES[0]).name;

  return (
    <div>
      {country !== 'US' && (
        <p className={`mb-6 flex gap-2 rounded-lg p-3 text-sm ${TINT_BLUE}`}>
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Region set to {name}. Currency and starting rates follow your region, but the payment calendar, Schedule C and the 1040-ES worksheet below are United States rules. <span className={MUTED}>Check your own tax authority&apos;s deadlines.</span></span>
        </p>
      )}
      <TaxTab />
    </div>
  );
}
