// src/pages/app/AiAdvisor.jsx
// AI Advisor: what-if scenario search and the one-click executive briefing.

import React from 'react';
import { useStore } from '../../store';
import { tierAtLeast } from '../../plans';
import PageHeader from '../../components/PageHeader';
import LockedCard from '../../components/LockedCard';
import { UsageStrip, ScenarioCard, BriefingCard } from '../../components/AdvisorTab';

export default function AiAdvisorPage() {
  const userTier = useStore((s) => s.userTier);
  const entity = useStore((s) => s.selectedEntity);
  return (
    <div>
      <PageHeader title="AI Advisor" description="Ask what-if questions about your money and get a monthly briefing built from your own numbers." />
      <UsageStrip userTier={userTier} />
      <div className="mt-6 space-y-6">
        <LockedCard locked={!tierAtLeast(userTier, 'pro')} tier="pro" label="Financial scenario search">
          <ScenarioCard entity={entity} />
        </LockedCard>
        <LockedCard locked={!tierAtLeast(userTier, 'agency')} tier="agency" label="1-click executive briefing">
          <BriefingCard entity={entity} />
        </LockedCard>
      </div>
    </div>
  );
}
