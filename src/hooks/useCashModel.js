// src/hooks/useCashModel.js
// Shared numbers behind the Dashboard, Safe-to-Spend Engine and Virtual Salary pages:
// the Safe-to-Spend inputs (kept in the store so they survive page changes), the six-month
// income history, and the Virtual Salary engine result.

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings, getMonthlyIncomeHistory, effectiveTaxRate } from '../db';
import { useStore, DEFAULT_CASH_INPUTS } from '../store';
import { tierAtLeast } from '../plans';
import { monthLabel, calcSafeDraw, getDefaultCashInputs } from '../finance';

export default function useCashModel() {
  const userTier = useStore((s) => s.userTier);
  const entity = useStore((s) => s.selectedEntity);
  const cashInputs = useStore((s) => s.cashInputs);
  const setCashInputs = useStore((s) => s.setCashInputs);
  const target = useStore((s) => s.targetDraw);
  const setTarget = useStore((s) => s.setTargetDraw);

  const settings = useLiveQuery(() => getSettings(), []);
  const history = useLiveQuery(() => getMonthlyIncomeHistory(6, entity), [entity]);
  const [override, setOverride] = useState(null);

  // First visit (or after switching workspace): start from the recorded books, or sample values.
  useEffect(() => {
    if (cashInputs || !settings) return undefined;
    let cancelled = false;
    getDefaultCashInputs(entity, settings)
      .then((values) => { if (!cancelled) setCashInputs(values); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [cashInputs, settings, entity, setCashInputs]);

  useEffect(() => setOverride(null), [entity]);

  const recorded = history ? history.map((h) => h.income) : [0, 0, 0, 0, 0, 0];
  const entries = override ?? recorded;
  const labels = history ? history.map((h) => monthLabel(h.month)) : ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];

  const full = tierAtLeast(userTier, 'pro');
  const engine = calcSafeDraw(entries, target, full);

  const editEntry = (i, value) => {
    const next = [...entries];
    next[i] = value;
    setOverride(next);
  };

  return {
    userTier, entity, settings, history,
    inputs: cashInputs || DEFAULT_CASH_INPUTS,
    setInputs: setCashInputs,
    target, setTarget,
    entries, labels, overridden: override !== null, editEntry, resetOverride: () => setOverride(null),
    engine, full,
    hasStarter: tierAtLeast(userTier, 'starter'),
    taxRate: settings ? effectiveTaxRate(settings) : 0.443,
  };
}
