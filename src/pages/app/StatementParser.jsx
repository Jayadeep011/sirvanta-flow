// src/pages/app/StatementParser.jsx
// Statement Parser: import bank statements as categorized transactions.

import React from 'react';
import { useStore } from '../../store';
import { tierAtLeast } from '../../plans';
import PageHeader from '../../components/PageHeader';
import LockedCard from '../../components/LockedCard';
import { UsageStrip, StatementParserCard } from '../../components/AdvisorTab';

export default function StatementParserPage() {
  const userTier = useStore((s) => s.userTier);
  const entity = useStore((s) => s.selectedEntity);
  return (
    <div>
      <PageHeader title="Statement Parser" description="Drop in a CSV or paste statement text. Transactions are categorized, write-offs are flagged, and everything is saved on this device." />
      <UsageStrip userTier={userTier} />
      <div className="mt-6">
        <LockedCard locked={!tierAtLeast(userTier, 'pro')} tier="pro" label="AI statement parser">
          <StatementParserCard selectedEntity={entity} />
        </LockedCard>
      </div>
    </div>
  );
}
