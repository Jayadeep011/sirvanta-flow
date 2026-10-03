// src/components/TaxTab.jsx
// Service 02: Tax reserve and expense engineering.
//   - Tax reserve calculator (all plans)
//   - Quarterly Estimated Tax Vault with IRS countdown and 1040-ES worksheet (Starter: manual revenue, Pro and above: live)
//   - Schedule C write-off scanner and expense logger (Pro and above)
//   - Sub-optimal yield radar (Agency & CFO)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarClock, Download, Radar, ScanSearch, Trash2, X } from 'lucide-react';
import {
  db, getSettings, updateSettings, addTransaction, deleteTransaction, TIER_LIMITS, SCHEDULE_C_CATEGORIES,
} from '../db';
import { useStore } from '../store';
import { tierAtLeast } from '../plans';
import { usd } from '../finance';
import {
  FEDERAL_BRACKETS, STATE_RATES, SE_RATE, calcReserve, combinedRate, deductibleAmount, deductionValue,
  nextDeadline, daysUntil, fmtDate, getYearFigures, scanForWriteOffs, calcYield, buildVoucherText,
} from '../tax';
import MoneyField from './MoneyField';
import LockedCard from './LockedCard';
import {
  CARD_BLUE, CARD_TEAL, CARD_GOLD, CARD_INDIGO, TINT_BLUE, TINT_TEAL, TINT_GOLD, TINT_INDIGO,
  MUTED, GOLD_TEXT, DIVIDER, BTN_GOLD, BTN_OUTLINE, INPUT,
} from '../ui';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function SelectField({ id, label, value, onChange, options, format }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className={INPUT}>
        {options.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </div>
  );
}

function PercentField({ id, label, value, onChange, onBlur, hint }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Math.min(100, Math.max(0, Number(e.target.value))))}
          onBlur={onBlur}
          className={`${INPUT} pr-8 tabular-nums`}
        />
        <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm ${MUTED}`}>%</span>
      </div>
      {hint && <p className={`mt-1 text-xs ${MUTED}`}>{hint}</p>}
    </div>
  );
}

const Footnote = ({ children }) => <p className={`mt-4 border-t pt-3 text-xs leading-relaxed ${DIVIDER} ${MUTED}`}>{children}</p>;

/* ---------- Tax reserve calculator (all plans) ---------- */
function RatesCard({ rates, changeRates }) {
  const [gross, setGross] = useState(10000);
  const r = calcReserve(gross, rates);
  const federalOptions = Array.from(new Set([...FEDERAL_BRACKETS, rates.federal])).sort((a, b) => a - b);
  const stateOptions = Array.from(new Set([...STATE_RATES, rates.state])).sort((a, b) => a - b);

  return (
    <section className={`${CARD_BLUE} p-6`} aria-labelledby="rates-title">
      <h2 id="rates-title" className="text-lg font-semibold">Tax reserve calculator</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>Set your rates once. Every reserve on this page uses them.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SelectField id="rate-fed" label="Federal marginal bracket" value={rates.federal} onChange={(v) => changeRates({ federal: v })} options={federalOptions} format={(v) => `${v}%`} />
        <SelectField id="rate-state" label="State tax rate" value={rates.state} onChange={(v) => changeRates({ state: v })} options={stateOptions} format={(v) => `${v}%`} />
      </div>

      <label htmlFor="rate-se" className={`mt-4 flex cursor-pointer items-center justify-between rounded-lg p-3 ${TINT_BLUE}`}>
        <span>
          <span className="block text-sm font-medium">Include self-employment tax ({SE_RATE}%)</span>
          <span className={`block text-xs ${MUTED}`}>Social Security and Medicare for the self-employed</span>
        </span>
        <input id="rate-se" type="checkbox" role="switch" checked={rates.se} onChange={(e) => changeRates({ se: e.target.checked })} className="h-5 w-5 accent-[#2E5FBF]" />
      </label>

      <div className="mt-5"><MoneyField id="calc-gross" label="Try a gross payment" value={gross} onChange={setGross} step={500} /></div>

      <dl className="mt-4 space-y-2 text-sm">
        {[
          ['Federal', r.federal],
          ['State', r.state],
          ['Self-employment', r.selfEmployment],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between"><dt className={MUTED}>{k}</dt><dd className="font-semibold tabular-nums">{usd(v)}</dd></div>
        ))}
        <div className={`flex justify-between border-t pt-2 text-base ${DIVIDER}`}>
          <dt className="font-semibold">Set aside ({(r.rate * 100).toFixed(1)}%)</dt>
          <dd className="font-bold tabular-nums text-[#D97706]">{usd(r.total)}</dd>
        </div>
        <div className="flex justify-between"><dt className={MUTED}>You keep</dt><dd className="font-semibold tabular-nums text-[#16A34A]">{usd(r.keep)}</dd></div>
      </dl>
      <Footnote>Simplified: each rate is applied to gross revenue. Your actual liability depends on net profit, deductions, and credits. Confirm with a CPA.</Footnote>
    </section>
  );
}

/* ---------- Quarterly estimated tax vault (Starter and above) ---------- */
function VaultCard({ rates, figures, live, calendar }) {
  const { taxYear, all, next, remaining, previous } = calendar;
  const [manualGross, setManualGross] = useState(60000);
  const [paid, setPaid] = useState(0);
  const [message, setMessage] = useState('');

  const gross = live ? (figures ? figures.gross : 0) : manualGross;
  const reserve = calcReserve(gross, rates);
  const stillOwed = Math.max(0, reserve.total - paid);
  const payment = remaining > 0 ? stillOwed / remaining : stillOwed;

  const days = daysUntil(next.date);
  const span = Math.max(1, daysUntil(next.date, previous));
  const elapsed = Math.min(100, Math.max(0, ((span - days) / span) * 100));
  const urgent = days <= 14;

  const download = () => {
    const text = buildVoucherText({ taxYear, next, rates, gross, locked: reserve.total, paid, stillOwed, payment });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `1040-ES-worksheet-${next.quarter}-${taxYear}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage(`Saved the ${next.quarter} ${taxYear} worksheet to your downloads.`);
  };

  return (
    <section className={`${CARD_TEAL} p-6`} aria-labelledby="vault-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="vault-title" className="text-lg font-semibold">Quarterly Estimated Tax Vault</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>Tax year {taxYear}. Money you should not spend.</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${live ? 'bg-[#DDF0EC] text-[#0B6E70] dark:bg-[#0F2321] dark:text-[#2DD4BF]' : `${TINT_GOLD} ${GOLD_TEXT}`}`}>
          {live ? 'Live from your transactions' : 'Manual revenue'}
        </span>
      </div>

      <div className="mt-5 rounded-xl bg-[#12233F] p-5 text-white">
        <div className="text-sm text-[#B8C4DA]">Locked for taxes this year</div>
        <div className="mt-1 text-4xl font-bold tabular-nums" aria-live="polite">{usd(reserve.total)}</div>
        <div className="mt-1 text-sm text-[#B8C4DA]">{usd(gross)} gross × {(reserve.rate * 100).toFixed(1)}%</div>
      </div>

      <div className={`mt-4 rounded-xl p-4 ${urgent ? 'bg-[#FBE4E1] dark:bg-[#2A1512]' : TINT_TEAL}`}>
        <div className="flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} aria-hidden="true" />Next payment: {next.quarter}, income {next.period}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-3xl font-bold tabular-nums ${urgent ? 'text-[#DC2626]' : ''}`}>{days}</span>
          <span className={MUTED}>{days === 1 ? 'day' : 'days'} until {fmtDate(next.date)}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(elapsed)} aria-valuemin={0} aria-valuemax={100} aria-label="Time elapsed since the last deadline">
          <div className={`h-full rounded-full ${urgent ? 'bg-[#DC2626]' : 'bg-[#0F8B8D]'}`} style={{ width: `${elapsed}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {live ? (
          <div className={`rounded-lg p-3 ${TINT_TEAL}`}>
            <div className={`text-xs ${MUTED}`}>Gross revenue this tax year</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">{usd(gross)}</div>
          </div>
        ) : (
          <MoneyField id="vault-gross" label="Gross revenue this tax year" value={manualGross} onChange={setManualGross} step={500} hint="Pro fills this in automatically from your transactions." />
        )}
        <MoneyField id="vault-paid" label="Estimated tax already paid" value={paid} onChange={setPaid} step={100} />
      </div>

      <div className="mt-4 rounded-lg border border-[#0F8B8D] p-4 dark:border-[#2DD4BF]">
        <div className={`text-sm ${MUTED}`}>Suggested {next.quarter} payment</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{usd(payment)}</div>
        <p className={`mt-1 text-xs ${MUTED}`}>{usd(stillOwed)} still to pay, split across the {remaining} {remaining === 1 ? 'payment' : 'payments'} left this cycle.</p>
      </div>

      {live && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <caption className="sr-only">Reserve by quarter</caption>
            <thead className={MUTED}>
              <tr><th className="py-2 pr-3 font-medium">Quarter</th><th className="pr-3 font-medium">Income period</th><th className="pr-3 text-right font-medium">Gross</th><th className="pr-3 text-right font-medium">Reserve</th><th className="text-right font-medium">Due</th></tr>
            </thead>
            <tbody>
              {all.map((q, i) => (
                <tr key={q.quarter} className={`border-t ${DIVIDER} ${q === next ? 'font-semibold' : ''}`}>
                  <td className="py-2 pr-3">{q.quarter}{q === next && <span className="ml-2 rounded bg-[#0F8B8D] px-1.5 py-0.5 text-[10px] font-bold text-white">NEXT</span>}</td>
                  <td className={`pr-3 ${MUTED}`}>{q.period}</td>
                  <td className="pr-3 text-right tabular-nums">{usd(figures ? figures.byQuarter[i] : 0)}</td>
                  <td className="pr-3 text-right tabular-nums">{usd(calcReserve(figures ? figures.byQuarter[i] : 0, rates).total)}</td>
                  <td className={`text-right ${q.date < new Date() ? MUTED : ''}`}>{fmtDate(q.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={download} className={`${BTN_GOLD} mt-5 w-full gap-2`}><Download size={16} aria-hidden="true" />Generate IRS Voucher / Form 1040-ES Calculation</button>
      <div aria-live="polite">{message && <p className="mt-2 text-sm text-[#16A34A]">{message}</p>}</div>
      <Footnote>The worksheet is a planning estimate, not an official IRS form. Deadlines that fall on a weekend move to the next Monday. Federal holidays are not modelled.</Footnote>
    </section>
  );
}

/* ---------- Schedule C scanner (Pro and above) ---------- */
function ScheduleCCard({ rates, taxYear, figures }) {
  const [form, setForm] = useState({ description: '', amount: 0, category: SCHEDULE_C_CATEGORIES[0], date: todayIso() });
  const [formError, setFormError] = useState('');
  const [logged, setLogged] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [scanning, setScanning] = useState(false);

  const rows = useMemo(() => {
    const list = SCHEDULE_C_CATEGORIES.map((c) => ({ category: c, spent: 0, deductible: 0, savings: 0 }));
    (figures ? figures.deductibles : []).forEach((t) => {
      const row = list.find((r) => r.category === t.scheduleCCategory);
      if (!row) return;
      row.spent += t.amount;
      row.deductible += deductibleAmount(t.amount, t.scheduleCCategory);
      row.savings += deductionValue(t.amount, t.scheduleCCategory, rates);
    });
    return list;
  }, [figures, rates]);
  const totals = rows.reduce((a, r) => ({ spent: a.spent + r.spent, deductible: a.deductible + r.deductible, savings: a.savings + r.savings }), { spent: 0, deductible: 0, savings: 0 });

  const submit = async (e) => {
    e.preventDefault();
    setLogged('');
    if (form.description.trim().length < 2) return setFormError('Describe the expense.');
    if (!(form.amount > 0)) return setFormError('Enter an amount greater than zero.');
    setFormError('');
    try {
      await addTransaction({
        date: form.date || todayIso(), description: form.description.trim(), amount: form.amount, type: 'expense',
        category: form.category, isDeductible: true, scheduleCCategory: form.category, entity: 'business',
      });
      setLogged(`${usd(deductionValue(form.amount, form.category, rates))} of estimated tax savings added.`);
      setForm((p) => ({ ...p, description: '', amount: 0 }));
    } catch (err) {
      setFormError(err.message || 'Could not save the expense.');
    }
  };

  const scan = async () => {
    setScanning(true);
    try {
      setSuggestions(await scanForWriteOffs(taxYear));
    } catch {
      setFormError('The scan could not read your transactions.');
    } finally {
      setScanning(false);
    }
  };

  const markDeductible = async (t) => {
    await db.transactions.update(t.id, { isDeductible: true, scheduleCCategory: t.suggested, category: t.category });
    setSuggestions((list) => list.filter((x) => x.id !== t.id));
  };

  const markAll = async () => {
    await Promise.all(suggestions.map((t) => db.transactions.update(t.id, { isDeductible: true, scheduleCCategory: t.suggested })));
    setSuggestions([]);
  };

  return (
    <section className={`${CARD_GOLD} p-6`} aria-labelledby="sc-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="sc-title" className="text-lg font-semibold">Schedule C write-off scanner</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>Log deductible expenses and see the tax each one saves.</p>
        </div>
        <button onClick={scan} disabled={scanning} className={`${BTN_OUTLINE} gap-2 !py-2`}><ScanSearch size={16} aria-hidden="true" />{scanning ? 'Scanning…' : 'Scan for missed write-offs'}</button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="sc-desc" className="mb-1 block text-sm font-medium">Description</label>
            <input id="sc-desc" className={INPUT} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Figma annual plan" />
          </div>
          <MoneyField id="sc-amount" label="Amount" value={form.amount} onChange={(v) => setForm((p) => ({ ...p, amount: v }))} step={10} />
          <div>
            <label htmlFor="sc-cat" className="mb-1 block text-sm font-medium">Category</label>
            <select id="sc-cat" className={INPUT} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              {SCHEDULE_C_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sc-date" className="mb-1 block text-sm font-medium">Date</label>
            <input id="sc-date" type="date" className={INPUT} value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          </div>
          {formError && <p role="alert" className="text-sm text-[#DC2626]">{formError}</p>}
          <button type="submit" className={`${BTN_GOLD} w-full`}>Log expense</button>
          <div aria-live="polite">{logged && <p className="text-sm text-[#16A34A]">{logged}</p>}</div>
        </form>

        <div className="min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <caption className="sr-only">Tax savings by Schedule C category</caption>
              <thead className={MUTED}>
                <tr><th className="py-2 pr-3 font-medium">Category</th><th className="pr-3 text-right font-medium">Spent</th><th className="pr-3 text-right font-medium">Deductible</th><th className="text-right font-medium">Tax saved</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.category} className={`border-t ${DIVIDER}`}>
                    <td className="py-2 pr-3">{r.category}{r.category === 'Client Meals' && <span className={`ml-1 text-xs ${MUTED}`}>(50%)</span>}</td>
                    <td className="pr-3 text-right tabular-nums">{usd(r.spent)}</td>
                    <td className="pr-3 text-right tabular-nums">{usd(r.deductible)}</td>
                    <td className="text-right font-semibold tabular-nums text-[#16A34A]">{usd(r.savings)}</td>
                  </tr>
                ))}
                <tr className={`border-t-2 font-bold ${DIVIDER}`}>
                  <td className="py-2 pr-3">Total</td>
                  <td className="pr-3 text-right tabular-nums">{usd(totals.spent)}</td>
                  <td className="pr-3 text-right tabular-nums">{usd(totals.deductible)}</td>
                  <td className="text-right tabular-nums text-[#16A34A]">{usd(totals.savings)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={`mt-3 rounded-lg p-3 text-sm ${TINT_GOLD}`}>
            Tax saved = deductible amount × ({rates.federal}% federal + {rates.state}% state{rates.se ? ` + ${SE_RATE}% self-employment` : ''}) = {(combinedRate(rates) * 100).toFixed(1)}% of each deductible dollar. Client meals count at 50%.
          </p>

          {figures && figures.deductibles.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">Recent deductible expenses</h3>
              <ul className="mt-2">
                {figures.deductibles.slice(0, 5).map((t) => (
                  <li key={t.id} className={`flex items-center justify-between gap-3 border-t py-2 text-sm ${DIVIDER}`}>
                    <span className="min-w-0 truncate">{t.description}<span className={`ml-2 text-xs ${MUTED}`}>{t.date} · {t.scheduleCCategory}</span></span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums">{usd(t.amount)}</span>
                      <button onClick={() => deleteTransaction(t.id)} aria-label={`Delete ${t.description}`} className={`rounded p-1 ${MUTED} hover:bg-[#F1F5F9] dark:hover:bg-white/5`}><Trash2 size={14} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {suggestions && (
        <div className={`mt-6 rounded-xl p-4 ${TINT_GOLD}`} aria-live="polite">
          {suggestions.length === 0 ? (
            <p className="text-sm">No unflagged expenses in {taxYear} look deductible. Everything that matches a Schedule C category is already counted.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{suggestions.length} possible write-off{suggestions.length === 1 ? '' : 's'} found</h3>
                <button onClick={markAll} className={`text-sm font-semibold underline ${GOLD_TEXT}`}>Mark all deductible</button>
              </div>
              <ul className="mt-2">
                {suggestions.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 py-2 text-sm dark:border-white/10">
                    <span>{t.description}<span className={`ml-2 text-xs ${MUTED}`}>{t.date} · looks like {t.suggested}</span></span>
                    <span className="flex items-center gap-3"><span className="tabular-nums">{usd(t.amount)}</span><button onClick={() => markDeductible(t)} className={`${BTN_OUTLINE} !px-3 !py-1.5 !text-xs`}>Mark deductible</button></span>
                  </li>
                ))}
              </ul>
              <p className={`mt-2 text-xs ${MUTED}`}>Matches are based on keywords in the description. Confirm each one is a business expense.</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Yield radar (Agency & CFO) ---------- */
function YieldModal({ balance, checkingApr, hysaApr, monthlyExpenses, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const keep = Math.min(balance, monthlyExpenses);
  const moved = Math.max(0, balance - keep);
  const extra = calcYield({ balance: moved, checkingApr, hysaApr }).annual;

  const strategies = [
    ['Keep one month of bills in checking', `Leave ${usd(keep)} where you can spend it. Move the other ${usd(moved)} to a high-yield savings account. At ${hysaApr}% versus ${checkingApr}% that adds about ${usd(extra)} a year.`],
    ['Park your tax reserve in savings', 'Set aside quarterly tax money in its own high-yield account. It earns interest until the payment date, and you are less tempted to spend it.'],
    ['Consider Treasury bills for larger balances', 'Short-term Treasury bills or a Treasury money market fund often pay near savings rates. Interest is exempt from state income tax, which matters in high-tax states. Match maturities to your payment dates.'],
    ['Watch deposit insurance limits', 'FDIC insurance covers $250,000 per depositor, per bank, per ownership category. Split larger balances across banks.'],
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="yield-title" className={`${CARD_INDIGO} my-8 w-full max-w-xl p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 id="yield-title" className="text-xl font-semibold">Yield optimization</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className={`rounded-md p-1 ${MUTED} hover:bg-[#F1F5F9] dark:hover:bg-white/5`}><X size={18} /></button>
        </div>
        <ul className="mt-4 space-y-4">
          {strategies.map(([title, body]) => (
            <li key={title} className={`rounded-lg p-4 ${TINT_INDIGO}`}>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className={`mt-1 text-sm leading-relaxed ${MUTED}`}>{body}</p>
            </li>
          ))}
        </ul>
        <p className={`mt-4 text-xs leading-relaxed ${MUTED}`}>Rates change often, so confirm current offers. Interest you earn is taxable income. This is general information, not investment advice.</p>
        <button onClick={onClose} className={`${BTN_GOLD} mt-5 w-full`}>Close</button>
      </div>
    </div>
  );
}

function YieldCard({ hysaFromSettings, monthlyExpenses, canSave }) {
  const [balance, setBalance] = useState(25000);
  const [checkingApr, setCheckingApr] = useState(0.01);
  const [hysaApr, setHysaApr] = useState(4.5);
  const [open, setOpen] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (hysaFromSettings != null && !seeded.current) {
      seeded.current = true;
      setHysaApr(hysaFromSettings);
    }
  }, [hysaFromSettings]);

  const y = calcYield({ balance, checkingApr, hysaApr });
  const persist = () => { if (canSave) updateSettings({ hysaRate: hysaApr }).catch(() => {}); };

  return (
    <section className={`${CARD_INDIGO} p-6`} aria-labelledby="yr-title">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${TINT_INDIGO} text-[#5B4FC4] dark:text-[#8B83F0]`}><Radar size={20} aria-hidden="true" /></span>
        <div>
          <h2 id="yr-title" className="text-lg font-semibold">Sub-optimal yield radar</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>How much interest your checking balance gives up every year.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <MoneyField id="yr-balance" label="Checking balance" value={balance} onChange={setBalance} step={500} />
        <PercentField id="yr-check" label="Checking APR" value={checkingApr} onChange={setCheckingApr} />
        <PercentField id="yr-hysa" label="Target HYSA APR" value={hysaApr} onChange={setHysaApr} onBlur={persist} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-[#FBE4E1] p-4 dark:bg-[#2A1512]">
          <div className={`text-xs ${MUTED}`}>Lost earnings per year</div>
          <div className="mt-0.5 text-3xl font-bold tabular-nums text-[#DC2626]" aria-live="polite">{usd(y.annual)}</div>
        </div>
        <div className={`rounded-lg p-4 ${TINT_INDIGO}`}>
          <div className={`text-xs ${MUTED}`}>Lost earnings per month</div>
          <div className="mt-0.5 text-3xl font-bold tabular-nums">{usd(y.monthly)}</div>
        </div>
      </div>

      <button onClick={() => setOpen(true)} className={`${BTN_GOLD} mt-5`}>Yield Optimization</button>
      <Footnote>Lost earnings = balance × (HYSA APR − checking APR). Rates are yearly and change over time.</Footnote>
      {open && <YieldModal balance={balance} checkingApr={checkingApr} hysaApr={hysaApr} monthlyExpenses={monthlyExpenses} onClose={() => setOpen(false)} />}
    </section>
  );
}

/* ---------- tab ---------- */
export default function TaxTab() {
  const userTier = useStore((s) => s.userTier);
  const settings = useLiveQuery(() => getSettings(), []);
  const canSave = TIER_LIMITS[userTier].canSaveData;

  const [rates, setRates] = useState({ federal: 24, state: 5, se: true });
  const seeded = useRef(false);
  useEffect(() => {
    if (settings && !seeded.current) {
      seeded.current = true;
      setRates({ federal: settings.federalTaxRate, state: settings.stateTaxRate, se: settings.selfEmploymentTax });
    }
  }, [settings]);

  const changeRates = (patch) => {
    const next = { ...rates, ...patch };
    setRates(next);
    if (canSave) updateSettings({ federalTaxRate: next.federal, stateTaxRate: next.state, selfEmploymentTax: next.se }).catch(() => {});
  };

  const calendar = useMemo(() => nextDeadline(new Date()), []);
  const figures = useLiveQuery(() => getYearFigures(calendar.taxYear), [calendar.taxYear]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tax reserve and expense engineering</h1>
      <p className={`mt-2 max-w-2xl ${MUTED}`}>Know what is already spoken for, when the next payment is due, and which expenses lower the bill.</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <RatesCard rates={rates} changeRates={changeRates} />
        <LockedCard locked={!tierAtLeast(userTier, 'starter')} tier="starter" label="Quarterly Estimated Tax Vault">
          <VaultCard rates={rates} figures={figures} live={tierAtLeast(userTier, 'pro')} calendar={calendar} />
        </LockedCard>
      </div>

      <div className="mt-6">
        <LockedCard locked={!tierAtLeast(userTier, 'pro')} tier="pro" label="Schedule C write-off scanner">
          <ScheduleCCard rates={rates} taxYear={calendar.taxYear} figures={figures} />
        </LockedCard>
      </div>

      <div className="mt-6">
        <LockedCard locked={!tierAtLeast(userTier, 'agency')} tier="agency" label="Sub-optimal yield radar">
          <YieldCard hysaFromSettings={settings ? settings.hysaRate : null} monthlyExpenses={settings ? settings.monthlyBurn : 3000} canSave={canSave} />
        </LockedCard>
      </div>
    </div>
  );
}
