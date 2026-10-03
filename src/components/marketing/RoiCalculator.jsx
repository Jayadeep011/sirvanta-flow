// src/components/marketing/RoiCalculator.jsx
// Public estimator: what late-tax costs and unbilled work might cost per year. Every assumption is shown.

import React, { useState } from 'react';
import { usd } from '../../finance';
import { CARD, MUTED, DIVIDER, TINT_GOLD, TINT_TEAL } from '../../ui';

// Assumptions, listed on screen so the result can be challenged.
const TAX_RATE = 0.25; // share of revenue owed as tax
const UNDERPAY_RATE = 0.08; // yearly interest and penalty rate on late estimated tax
const MONTHS_LATE = 3; // average time a shortfall stays unpaid
const BORROW_RATE = 0.18; // yearly cost of covering a tax shortfall with credit
const MONTHS_BORROWED = 2;
const RECAPTURE = 0.5; // share of unbilled hours you start billing

function Slider({ id, label, value, onChange, min, max, step, format }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <label htmlFor={id} className="font-medium">{label}</label>
        <span className="font-semibold tabular-nums">{format(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 h-1.5 w-full cursor-pointer accent-[#C5A059]" />
    </div>
  );
}

export default function RoiCalculator() {
  const [revenue, setRevenue] = useState(150000);
  const [unfunded, setUnfunded] = useState(20);
  const [hours, setHours] = useState(12);
  const [rate, setRate] = useState(120);

  const taxBill = revenue * TAX_RATE;
  const underpaid = taxBill * (unfunded / 100);
  const penalties = underpaid * UNDERPAY_RATE * (MONTHS_LATE / 12);
  const borrowing = underpaid * BORROW_RATE * (MONTHS_BORROWED / 12);
  const recovered = hours * 12 * rate * RECAPTURE;
  const total = penalties + borrowing + recovered;

  const rows = [
    ['Tax interest and penalties avoided', penalties],
    ['Borrowing cost avoided', borrowing],
    ['Unbilled work recovered', recovered],
  ];

  return (
    <div className={`${CARD} grid gap-8 p-6 lg:grid-cols-2 lg:p-8`}>
      <div className="space-y-6">
        <Slider id="roi-rev" label="Yearly revenue" value={revenue} onChange={setRevenue} min={30000} max={500000} step={5000} format={usd} />
        <Slider id="roi-unf" label="Share of your tax bill usually unfunded at deadline" value={unfunded} onChange={setUnfunded} min={0} max={50} step={1} format={(n) => `${n}%`} />
        <Slider id="roi-hrs" label="Unbilled hours per month" value={hours} onChange={setHours} min={0} max={60} step={1} format={(n) => `${n} hrs`} />
        <Slider id="roi-rate" label="Your hourly rate" value={rate} onChange={setRate} min={40} max={300} step={5} format={usd} />
        <p className={`text-xs leading-relaxed ${MUTED}`}>
          Assumptions: tax is {TAX_RATE * 100}% of revenue; late payments cost {UNDERPAY_RATE * 100}% a year for about {MONTHS_LATE} months; shortfalls are covered with credit at {BORROW_RATE * 100}% for {MONTHS_BORROWED} months; you start billing {RECAPTURE * 100}% of unbilled hours. None of this is a promise. It illustrates how the pieces add up.
        </p>
      </div>

      <div>
        <div className={`rounded-xl p-5 ${TINT_TEAL}`} aria-live="polite">
          <p className={`text-sm ${MUTED}`}>Estimated yearly impact</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-[#0B6E70] dark:text-[#2DD4BF]">{usd(total)}</p>
          <p className={`mt-1 text-sm ${MUTED}`}>about {usd(total / 12)} a month</p>
        </div>
        <ul className="mt-4">
          {rows.map(([label, value]) => (
            <li key={label} className={`flex justify-between border-t py-3 text-sm first:border-t-0 ${DIVIDER}`}><span>{label}</span><span className="font-semibold tabular-nums">{usd(value)}</span></li>
          ))}
        </ul>
        <p className={`mt-3 rounded-lg p-3 text-xs leading-relaxed ${TINT_GOLD}`}>An estimate for illustration, not a guarantee or tax advice. Your own numbers will differ.</p>
      </div>
    </div>
  );
}
