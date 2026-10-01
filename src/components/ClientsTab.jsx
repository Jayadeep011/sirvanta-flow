// src/components/ClientsTab.jsx
// Service 03: Client ROI and profitability intelligence.
//   - Client manager with add / edit modal (all plans, limited by plan; Free is read-only demo data)
//   - Effective Hourly Rate leaderboard (Pro and above)
//   - Bespoke invoice builder with print / save-as-PDF (Agency & CFO)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pause, Pencil, Play, Plus, Printer, Trash2, UserPlus } from 'lucide-react';
import {
  db, getSettings, addClient, updateClient, deleteClient, addInvoice, updateInvoiceStatus,
  nextInvoiceNumber, effectiveTaxRate, computeEHR, toISODate, TIER_LIMITS,
} from '../db';
import { useStore } from '../store';
import { tierAtLeast, lockedMessage } from '../plans';
import { usd } from '../finance';
import {
  ehrTier, rankClients, blendedEhr, totalHours, scopeCreepShare, ehrIfCreepBilled,
  calcInvoice, lineAmount, addDaysIso, displayStatus, TERMS, EHR_HIGH, EHR_TARGET,
} from '../clients';
import MoneyField from './MoneyField';
import LockedCard from './LockedCard';
import Modal from './Modal';
import {
  CARD_BLUE, CARD_TEAL, CARD_INDIGO, TINT_BLUE, TINT_TEAL, TINT_GOLD, TINT_INDIGO,
  MUTED, GOLD_TEXT, DIVIDER, BTN_GOLD, BTN_OUTLINE, INPUT,
} from '../ui';

const usd2 = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const fmtShort = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const BUSINESS_KEY = 'sirvanta-business-name';

const BADGES = {
  high: { label: 'High margin', cls: 'bg-[#DCF3E4] text-[#146C34] dark:bg-[#0F2A1A] dark:text-[#4ADE80]', bar: '#16A34A' },
  target: { label: 'Target margin', cls: 'bg-[#EFE3C6] text-[#7A5A17] dark:bg-[#1B1810] dark:text-[#D4AF37]', bar: '#C5A059' },
  toxic: { label: 'Toxic low margin', cls: 'bg-[#FBE4E1] text-[#B42318] dark:bg-[#2A1512] dark:text-[#F87171]', bar: '#DC2626' },
};

const STATUS_CHIPS = {
  draft: 'bg-[#E8E6DF] text-[#4A4638] dark:bg-[#27272A] dark:text-[#D4D4D8]',
  sent: 'bg-[#E1EBF8] text-[#2E5FBF] dark:bg-[#111C2E] dark:text-[#5B8DEF]',
  paid: 'bg-[#DCF3E4] text-[#146C34] dark:bg-[#0F2A1A] dark:text-[#4ADE80]',
  overdue: 'bg-[#FBE4E1] text-[#B42318] dark:bg-[#2A1512] dark:text-[#F87171]',
};

function NumField({ id, label, value, onChange, suffix, hint }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
          className={`${INPUT} pr-14 tabular-nums`}
        />
        {suffix && <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs ${MUTED}`}>{suffix}</span>}
      </div>
      {hint && <p className={`mt-1 text-xs ${MUTED}`}>{hint}</p>}
    </div>
  );
}

/* ---------- add / edit client ---------- */
function ClientModal({ client, onClose, onSaved }) {
  const openUpgrade = useStore((s) => s.openUpgrade);
  const editing = Boolean(client);
  const [f, setF] = useState({
    name: client?.name ?? '',
    monthlyRetainer: client?.monthlyRetainer ?? 0,
    hourlyRateTarget: client?.hourlyRateTarget ?? 0,
    trackedHours: client?.trackedHours ?? 0,
    scopeCreepHours: client?.scopeCreepHours ?? 0,
    directCosts: client?.directCosts ?? 0,
    avgPaymentDelayDays: client?.avgPaymentDelayDays ?? 0,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setF((p) => ({ ...p, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setError('Enter the client name.');
    if (!(f.monthlyRetainer > 0)) return setError('Enter the monthly retainer or project pay.');
    setError('');
    setBusy(true);
    try {
      if (editing) await updateClient(client.id, { ...f, name: f.name.trim() });
      else await addClient(f);
      onSaved(`${f.name.trim()} was ${editing ? 'updated' : 'added'}.`);
      onClose();
    } catch (err) {
      if (err.code === 'TIER_LIMIT') {
        onClose();
        openUpgrade(err.message, 'pro');
      } else {
        setError(err.message || 'Could not save the client.');
        setBusy(false);
      }
    }
  };

  const preview = computeEHR(f);

  return (
    <Modal title={editing ? 'Edit client' : 'Add new client'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <div>
          <label htmlFor="cl-name" className="mb-1 block text-sm font-medium">Client name</label>
          <input id="cl-name" autoFocus className={INPUT} value={f.name} onChange={(e) => set('name')(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField id="cl-ret" label="Monthly retainer / project pay" value={f.monthlyRetainer} onChange={set('monthlyRetainer')} step={100} />
          <MoneyField id="cl-target" label="Target hourly rate (optional)" value={f.hourlyRateTarget} onChange={set('hourlyRateTarget')} step={5} />
          <NumField id="cl-hours" label="Target billed hours" value={f.trackedHours} onChange={set('trackedHours')} suffix="hours" />
          <NumField id="cl-creep" label="Unbilled scope creep hours" value={f.scopeCreepHours} onChange={set('scopeCreepHours')} suffix="hours" />
          <MoneyField id="cl-costs" label="Direct project expenses" value={f.directCosts} onChange={set('directCosts')} step={50} />
          <NumField id="cl-delay" label="Average payment delay" value={f.avgPaymentDelayDays} onChange={set('avgPaymentDelayDays')} suffix="days" />
        </div>
        <p className={`rounded-lg p-3 text-sm ${TINT_BLUE}`} aria-live="polite">
          Effective hourly rate: <strong className="tabular-nums">{usd(preview)}/hr</strong>
          <span className={MUTED}> = ({usd(f.monthlyRetainer)} − {usd(f.directCosts)}) ÷ {f.trackedHours + f.scopeCreepHours} hours</span>
        </p>
        {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={BTN_OUTLINE}>Cancel</button>
          <button type="submit" disabled={busy} className={BTN_GOLD}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add client'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- client manager ---------- */
function ClientManagerCard({ clients, userTier, onAdd, onEdit, notice }) {
  const openUpgrade = useStore((s) => s.openUpgrade);
  const limit = TIER_LIMITS[userTier].maxClients;
  const canSave = TIER_LIMITS[userTier].canSaveData;

  const guard = (fn) => () => {
    if (!canSave) return openUpgrade(lockedMessage('Editing clients', 'starter'), 'starter');
    return fn();
  };
  const toggle = (c) => updateClient(c.id, { status: c.status === 'paused' ? 'active' : 'paused' });
  const remove = (c) => {
    if (window.confirm(`Delete ${c.name}? This cannot be undone.`)) deleteClient(c.id);
  };

  return (
    <section className={`${CARD_BLUE} p-6`} aria-labelledby="cm-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="cm-title" className="text-lg font-semibold">Client manager</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}{Number.isFinite(limit) ? ` of ${limit} on your plan` : ''}
            {!canSave && ' · demo data is read-only'}
          </p>
        </div>
        <button onClick={onAdd} className={`${BTN_GOLD} gap-2 !py-2`}><UserPlus size={16} aria-hidden="true" />Add client</button>
      </div>
      <div aria-live="polite">{notice && <p className="mt-3 text-sm text-[#16A34A]">{notice}</p>}</div>

      {clients.length === 0 ? (
        <p className={`mt-6 rounded-lg p-4 text-sm ${TINT_BLUE}`}>No clients yet. Add your first client to see what they really pay you per hour.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <caption className="sr-only">Clients</caption>
            <thead className={MUTED}>
              <tr>
                <th className="py-2 pr-3 font-medium">Client</th>
                <th className="pr-3 text-right font-medium">Monthly pay</th>
                <th className="pr-3 text-right font-medium">Hours</th>
                <th className="pr-3 text-right font-medium">Pays in</th>
                <th className="pr-3 font-medium">Status</th>
                <th className="text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className={`border-t ${DIVIDER} ${c.status === 'paused' ? 'opacity-60' : ''}`}>
                  <td className="py-3 pr-3 font-semibold">{c.name}</td>
                  <td className="pr-3 text-right tabular-nums">{usd(c.monthlyRetainer)}</td>
                  <td className="pr-3 text-right tabular-nums">{c.trackedHours}{c.scopeCreepHours > 0 && <span className="text-[#D97706]"> +{c.scopeCreepHours}</span>}</td>
                  <td className={`pr-3 text-right tabular-nums ${c.avgPaymentDelayDays > 30 ? 'font-semibold text-[#D97706]' : ''}`}>{c.avgPaymentDelayDays} days</td>
                  <td className="pr-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.status === 'paused' ? STATUS_CHIPS.draft : TINT_TEAL + ' text-[#0B6E70] dark:text-[#2DD4BF]'}`}>{c.status}</span>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button onClick={guard(() => onEdit(c))} aria-label={`Edit ${c.name}`} className={`rounded p-1.5 ${MUTED} hover:bg-[#E8DEC7] dark:hover:bg-[#18181D]`}><Pencil size={15} /></button>
                    <button onClick={guard(() => toggle(c))} aria-label={`${c.status === 'paused' ? 'Resume' : 'Pause'} ${c.name}`} className={`rounded p-1.5 ${MUTED} hover:bg-[#E8DEC7] dark:hover:bg-[#18181D]`}>{c.status === 'paused' ? <Play size={15} /> : <Pause size={15} />}</button>
                    <button onClick={guard(() => remove(c))} aria-label={`Delete ${c.name}`} className={`rounded p-1.5 ${MUTED} hover:bg-[#E8DEC7] dark:hover:bg-[#18181D]`}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={`mt-4 border-t pt-3 text-xs ${DIVIDER} ${MUTED}`}>Hours show billed hours, with unbilled scope-creep hours in amber. Amber payment times mean the client pays more than 30 days late on average.</p>
    </section>
  );
}

/* ---------- effective hourly rate matrix ---------- */
function EhrCard({ clients }) {
  const { active, paused } = useMemo(() => rankClients(clients), [clients]);
  const top = Math.max(EHR_HIGH * 1.2, ...active.map((c) => c.ehr));
  const toxic = active.filter((c) => ehrTier(c.ehr) === 'toxic');
  const best = active[0];

  return (
    <section className={`${CARD_TEAL} p-6`} aria-labelledby="ehr-title">
      <h2 id="ehr-title" className="text-lg font-semibold">Effective hourly rate matrix</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>What each client really pays per hour after direct costs and unbilled scope creep.</p>

      {active.length === 0 ? (
        <p className={`mt-6 rounded-lg p-4 text-sm ${TINT_TEAL}`}>Add an active client to build the leaderboard.</p>
      ) : (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className={`rounded-lg p-3 ${TINT_TEAL}`}><dt className={`text-xs ${MUTED}`}>Blended hourly rate</dt><dd className="mt-0.5 text-xl font-bold tabular-nums">{usd(blendedEhr(active))}/hr</dd></div>
            <div className={`rounded-lg p-3 ${TINT_GOLD}`}><dt className={`text-xs ${MUTED}`}>Best client</dt><dd className="mt-0.5 truncate text-xl font-bold">{best.name}</dd></div>
            <div className={`rounded-lg p-3 ${toxic.length ? 'bg-[#FBE4E1] dark:bg-[#2A1512]' : TINT_TEAL}`}><dt className={`text-xs ${MUTED}`}>Toxic low-margin clients</dt><dd className={`mt-0.5 text-xl font-bold tabular-nums ${toxic.length ? 'text-[#DC2626]' : ''}`}>{toxic.length}</dd></div>
          </dl>

          <ol className="mt-5 space-y-3">
            {active.map((c, i) => {
              const b = BADGES[ehrTier(c.ehr)];
              return (
                <li key={c.id} className={`rounded-xl border p-4 ${DIVIDER}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${TINT_TEAL}`}>{i + 1}</span>
                      <span className="font-semibold">{c.name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>{b.label}</span>
                    </div>
                    <span className="text-xl font-bold tabular-nums">{usd(c.ehr)}<span className={`text-sm font-medium ${MUTED}`}>/hr</span></span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5DAC2] dark:bg-[#27272A]" aria-hidden="true">
                    <div className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none" style={{ width: `${Math.max(2, Math.min(100, (c.ehr / top) * 100))}%`, background: b.bar }} />
                  </div>
                  <p className={`mt-2 text-xs ${MUTED}`}>
                    {usd(c.monthlyRetainer)} pay − {usd(c.directCosts)} costs over {totalHours(c)} hours
                    {c.scopeCreepHours > 0 && ` (${Math.round(scopeCreepShare(c) * 100)}% unbilled scope creep)`}
                    {c.hourlyRateTarget > 0 && ` · target ${usd(c.hourlyRateTarget)}/hr`}
                    {c.avgPaymentDelayDays > 30 && ` · pays ${c.avgPaymentDelayDays} days late`}
                  </p>
                </li>
              );
            })}
          </ol>

          {toxic.length > 0 && (
            <div className="mt-5 space-y-2">
              {toxic.map((c) => {
                const fix = ehrIfCreepBilled(c);
                return (
                  <p key={c.id} className="rounded-lg bg-[#FBE4E1] p-3 text-sm text-[#7A1F17] dark:bg-[#2A1512] dark:text-[#F5B5AE]">
                    <strong>{c.name}</strong> earns {usd(c.ehr)}/hr, below your ${EHR_TARGET} floor.
                    {c.scopeCreepHours > 0
                      ? ` Billing the ${c.scopeCreepHours} unbilled hours at ${usd(fix.rate)}/hr would add ${usd(fix.extra)} and lift the rate to ${usd(fix.ehr)}/hr.`
                      : ' Consider raising the retainer or trimming the hours.'}
                  </p>
                );
              })}
            </div>
          )}

          {paused.length > 0 && (
            <p className={`mt-4 text-xs ${MUTED}`}>Paused and not ranked: {paused.map((c) => `${c.name} (${usd(c.ehr)}/hr)`).join(', ')}.</p>
          )}
        </>
      )}
      <p className={`mt-4 border-t pt-3 text-xs ${DIVIDER} ${MUTED}`}>EHR = (project revenue − direct expenses) ÷ (billed hours + unbilled scope creep hours). Above ${EHR_HIGH} an hour is high margin, ${EHR_TARGET} to ${EHR_HIGH} is on target, below ${EHR_TARGET} is toxic.</p>
    </section>
  );
}

/* ---------- invoice sheet (screen preview and print copy) ---------- */
function InvoiceSheet({ business, number, client, issueDate, dueDate, terms, items, subtotal, notes }) {
  const rows = items.filter((i) => i.description.trim() || lineAmount(i) > 0);
  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-8 text-[#1B2233]" style={{ fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif" }}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#12233F] text-xl font-extrabold text-[#E7C873]">{(business.trim()[0] || 'S').toUpperCase()}</span>
          <span className="text-lg font-bold tracking-tight">{business.trim() || 'Your business'}</span>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold tracking-tight">Invoice</div>
          <div className="mt-1 text-sm text-[#655D4C]">{number || '—'}</div>
        </div>
      </div>
      <div className="mt-6 h-[3px] bg-[#C5A059]" />

      <div className="mt-6 grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1"><div className="text-xs text-[#655D4C]">Billed to</div><div className="mt-1 font-semibold">{client || '—'}</div></div>
        <div><div className="text-xs text-[#655D4C]">Issued</div><div className="mt-1 font-semibold">{fmtShort(issueDate)}</div></div>
        <div><div className="text-xs text-[#655D4C]">Due</div><div className="mt-1 font-semibold">{fmtShort(dueDate)}</div></div>
        <div><div className="text-xs text-[#655D4C]">Terms</div><div className="mt-1 font-semibold">Net {terms}</div></div>
      </div>

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#DDD2BA] text-xs text-[#655D4C]">
            <th className="py-2 font-medium">Description</th><th className="w-16 text-right font-medium">Qty</th><th className="w-28 text-right font-medium">Rate</th><th className="w-32 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-[#655D4C]">Add a line item to see it here.</td></tr>}
          {rows.map((i) => (
            <tr key={i.id} className="border-b border-[#EFE9DA]">
              <td className="py-3 pr-3">{i.description || 'Item'}</td>
              <td className="text-right tabular-nums">{i.qty}</td>
              <td className="text-right tabular-nums">{usd2(Number(i.rate) || 0)}</td>
              <td className="text-right font-medium tabular-nums">{usd2(lineAmount(i))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs">
          <div className="flex justify-between py-1 text-sm"><span className="text-[#655D4C]">Subtotal</span><span className="tabular-nums">{usd2(subtotal)}</span></div>
          <div className="mt-1 flex items-center justify-between rounded-lg bg-[#12233F] px-4 py-3 text-white">
            <span className="text-sm">Total due</span><span className="text-xl font-bold tabular-nums">{usd2(subtotal)}</span>
          </div>
        </div>
      </div>

      {notes.trim() && <p className="mt-8 whitespace-pre-line text-sm text-[#655D4C]">{notes}</p>}
      <div className="mt-10 border-t border-[#DDD2BA] pt-4 text-xs text-[#655D4C]">Payment is due within {terms} days of the issue date. Thank you for your business.</div>
    </div>
  );
}

/* ---------- invoice builder ---------- */
function InvoiceModal({ clients, taxRate, onClose, onSaved }) {
  const [number, setNumber] = useState('');
  const [clientName, setClientName] = useState(clients[0]?.name ?? '');
  const [issueDate, setIssueDate] = useState(toISODate());
  const [terms, setTerms] = useState(30);
  const [items, setItems] = useState([{ id: 1, description: '', qty: 1, rate: 0 }]);
  const [notes, setNotes] = useState('');
  const [business, setBusiness] = useState(() => {
    try { return localStorage.getItem(BUSINESS_KEY) || ''; } catch { return ''; }
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nextId = useRef(2);

  useEffect(() => { nextInvoiceNumber().then(setNumber).catch(() => {}); }, []);

  const dueDate = addDaysIso(issueDate, terms);
  const { subtotal, reserve, keep } = calcInvoice(items, taxRate);
  const client = clients.find((c) => c.name === clientName);
  const updateItem = (id, patch) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const saveBusiness = () => { try { localStorage.setItem(BUSINESS_KEY, business.trim()); } catch { /* optional */ } };

  const save = async (print) => {
    if (!number.trim()) return setError('Enter an invoice number.');
    if (!clientName) return setError('Choose a client.');
    if (!(subtotal > 0)) return setError('Add at least one line item with a quantity and rate.');
    setError('');
    setBusy(true);
    try {
      if ((await db.invoices.where('invoiceNumber').equals(number.trim()).count()) > 0) {
        setBusy(false);
        return setError(`Invoice ${number.trim()} already exists. Use a different number.`);
      }
      await addInvoice({ invoiceNumber: number.trim(), clientName, amount: subtotal, taxWithheld: reserve, issueDate, dueDate, status: print ? 'sent' : 'draft' });
      saveBusiness();
      onSaved(`Invoice ${number.trim()} saved as ${print ? 'sent' : 'a draft'}.`);
      if (print) {
        // Close the builder once the print dialog is dismissed.
        const finish = () => {
          window.removeEventListener('afterprint', finish);
          onClose();
        };
        window.addEventListener('afterprint', finish);
        setTimeout(() => window.print(), 150);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Could not save the invoice.');
      setBusy(false);
    }
  };

  const sheetProps = { business, number, client: clientName, issueDate, dueDate, terms, items, subtotal, notes };

  return (
    <>
      <Modal title="Invoice builder" onClose={onClose} maxWidth="max-w-6xl" card={CARD_INDIGO}>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <div>
              <label htmlFor="inv-biz" className="mb-1 block text-sm font-medium">Your business name</label>
              <input id="inv-biz" className={INPUT} value={business} onChange={(e) => setBusiness(e.target.value)} onBlur={saveBusiness} placeholder="Shown at the top of the invoice" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="inv-num" className="mb-1 block text-sm font-medium">Invoice #</label>
                <input id="inv-num" className={INPUT} value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
              <div>
                <label htmlFor="inv-client" className="mb-1 block text-sm font-medium">Client</label>
                <select id="inv-client" className={INPUT} value={clientName} onChange={(e) => setClientName(e.target.value)}>
                  {clients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="inv-date" className="mb-1 block text-sm font-medium">Issue date</label>
                <input id="inv-date" type="date" className={INPUT} value={issueDate} onChange={(e) => setIssueDate(e.target.value || toISODate())} />
              </div>
              <div>
                <label htmlFor="inv-terms" className="mb-1 block text-sm font-medium">Due</label>
                <select id="inv-terms" className={INPUT} value={terms} onChange={(e) => setTerms(Number(e.target.value))}>
                  {TERMS.map((t) => <option key={t} value={t}>Net {t} ({fmtShort(addDaysIso(issueDate, t))})</option>)}
                </select>
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Line items</legend>
              <div className="space-y-3">
                {items.map((i, idx) => (
                  <div key={i.id} className="grid grid-cols-[1fr_4rem_6.5rem_auto] items-end gap-2">
                    <div>
                      <label htmlFor={`li-d-${i.id}`} className={idx === 0 ? 'mb-1 block text-xs font-medium' : 'sr-only'}>Description</label>
                      <input id={`li-d-${i.id}`} className={INPUT} value={i.description} onChange={(e) => updateItem(i.id, { description: e.target.value })} placeholder="Strategy retainer, October" />
                    </div>
                    <div>
                      <label htmlFor={`li-q-${i.id}`} className={idx === 0 ? 'mb-1 block text-xs font-medium' : 'sr-only'}>Qty</label>
                      <input id={`li-q-${i.id}`} type="number" min="0" step="any" className={`${INPUT} tabular-nums`} value={i.qty} onChange={(e) => updateItem(i.id, { qty: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
                    </div>
                    <div>
                      <label htmlFor={`li-r-${i.id}`} className={idx === 0 ? 'mb-1 block text-xs font-medium' : 'sr-only'}>Rate</label>
                      <input id={`li-r-${i.id}`} type="number" min="0" step="any" className={`${INPUT} tabular-nums`} value={i.rate} onChange={(e) => updateItem(i.id, { rate: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
                    </div>
                    <button type="button" onClick={() => setItems((l) => (l.length > 1 ? l.filter((x) => x.id !== i.id) : l))} disabled={items.length === 1} aria-label="Remove line item" className={`mb-1 rounded p-2 ${MUTED} hover:bg-[#E8DEC7] disabled:opacity-30 dark:hover:bg-[#18181D]`}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setItems((l) => [...l, { id: nextId.current++, description: '', qty: 1, rate: 0 }])} className={`${BTN_OUTLINE} gap-1.5 !px-3 !py-1.5 !text-xs`}><Plus size={14} aria-hidden="true" />Add line</button>
                {client && client.monthlyRetainer > 0 && (
                  <button type="button" onClick={() => setItems((l) => [...l, { id: nextId.current++, description: 'Monthly retainer', qty: 1, rate: client.monthlyRetainer }])} className={`${BTN_OUTLINE} !px-3 !py-1.5 !text-xs`}>Add retainer ({usd(client.monthlyRetainer)})</button>
                )}
              </div>
            </fieldset>

            <div>
              <label htmlFor="inv-notes" className="mb-1 block text-sm font-medium">Notes (optional)</label>
              <textarea id="inv-notes" rows={2} className={INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment instructions or a thank-you note" />
            </div>

            <div className={`rounded-xl p-4 ${TINT_INDIGO}`} aria-live="polite">
              <h3 className="text-sm font-semibold">Your summary (not printed)</h3>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className={MUTED}>Invoice total</dt><dd className="font-semibold tabular-nums">{usd2(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className={MUTED}>Tax reserve to set aside ({(taxRate * 100).toFixed(1)}%)</dt><dd className="font-semibold tabular-nums text-[#D97706]">−{usd2(reserve)}</dd></div>
                <div className={`flex justify-between border-t pt-1.5 ${DIVIDER}`}><dt className="font-semibold">You keep after the reserve</dt><dd className="font-bold tabular-nums text-[#16A34A]">{usd2(keep)}</dd></div>
              </dl>
            </div>

            {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" disabled={busy} onClick={() => save(false)} className={`${BTN_OUTLINE} flex-1`}>Save draft</button>
              <button type="button" disabled={busy} onClick={() => save(true)} className={`${BTN_GOLD} flex-1 gap-2`}><Printer size={16} aria-hidden="true" />Print / Save PDF Invoice</button>
            </div>
            <p className={`text-xs ${MUTED}`}>In the print window, choose “Save as PDF” as the destination. Only the invoice total is stored; line items are used for the printout.</p>
          </div>

          <div className="min-w-0">
            <div className="overflow-hidden rounded-xl border border-[#DDD2BA] shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-[#27272A]" aria-label="Invoice preview">
              <InvoiceSheet {...sheetProps} />
            </div>
          </div>
        </div>
      </Modal>
      {createPortal(<div className="print-only"><InvoiceSheet {...sheetProps} /></div>, document.body)}
    </>
  );
}

/* ---------- invoices list ---------- */
function InvoicesCard({ invoices, hasClients, onNew, notice }) {
  const today = toISODate();
  const totals = invoices.reduce((a, inv) => {
    const s = displayStatus(inv, today);
    if (s === 'paid') a.paid += inv.amount;
    else if (s !== 'draft') a.open += inv.amount;
    if (s === 'overdue') a.overdue += inv.amount;
    return a;
  }, { paid: 0, open: 0, overdue: 0 });

  return (
    <section className={`${CARD_INDIGO} p-6`} aria-labelledby="inv-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="inv-title" className="text-lg font-semibold">Invoices</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>Build a branded invoice with the tax reserve worked out before you send it.</p>
        </div>
        <button onClick={onNew} disabled={!hasClients} className={`${BTN_GOLD} gap-2 !py-2`}><Plus size={16} aria-hidden="true" />New invoice</button>
      </div>
      {!hasClients && <p className={`mt-3 text-sm ${MUTED}`}>Add a client first, then you can invoice them.</p>}
      <div aria-live="polite">{notice && <p className="mt-3 text-sm text-[#16A34A]">{notice}</p>}</div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className={`rounded-lg p-3 ${TINT_INDIGO}`}><dt className={`text-xs ${MUTED}`}>Awaiting payment</dt><dd className="mt-0.5 text-lg font-bold tabular-nums">{usd(totals.open)}</dd></div>
        <div className="rounded-lg bg-[#FBE4E1] p-3 dark:bg-[#2A1512]"><dt className={`text-xs ${MUTED}`}>Overdue</dt><dd className="mt-0.5 text-lg font-bold tabular-nums text-[#DC2626]">{usd(totals.overdue)}</dd></div>
        <div className={`rounded-lg p-3 ${TINT_TEAL}`}><dt className={`text-xs ${MUTED}`}>Paid</dt><dd className="mt-0.5 text-lg font-bold tabular-nums">{usd(totals.paid)}</dd></div>
      </dl>

      {invoices.length === 0 ? (
        <p className={`mt-5 rounded-lg p-4 text-sm ${TINT_INDIGO}`}>No invoices yet.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Invoices</caption>
            <thead className={MUTED}>
              <tr><th className="py-2 pr-3 font-medium">Invoice</th><th className="pr-3 font-medium">Client</th><th className="pr-3 text-right font-medium">Amount</th><th className="pr-3 font-medium">Due</th><th className="pr-3 font-medium">Status</th><th className="text-right font-medium"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const s = displayStatus(inv, today);
                return (
                  <tr key={inv.id} className={`border-t ${DIVIDER}`}>
                    <td className="py-3 pr-3 font-semibold">{inv.invoiceNumber}</td>
                    <td className="pr-3">{inv.clientName}</td>
                    <td className="pr-3 text-right tabular-nums">{usd2(inv.amount)}</td>
                    <td className="pr-3">{fmtShort(inv.dueDate)}</td>
                    <td className="pr-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIPS[s]}`}>{s}</span></td>
                    <td className="text-right">
                      {s !== 'paid' && <button onClick={() => updateInvoiceStatus(inv.id, 'paid')} className={`text-xs font-semibold underline ${GOLD_TEXT}`}>Mark paid</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------- tab ---------- */
export default function ClientsTab() {
  const userTier = useStore((s) => s.userTier);
  const requireClientSlot = useStore((s) => s.requireClientSlot);
  const openUpgrade = useStore((s) => s.openUpgrade);

  const clients = useLiveQuery(() => db.clients.toArray(), [], []);
  const invoices = useLiveQuery(() => db.invoices.orderBy('id').reverse().toArray(), [], []);
  const settings = useLiveQuery(() => getSettings(), []);
  const taxRate = settings ? effectiveTaxRate(settings) : 0.443;

  const [clientModal, setClientModal] = useState(null); // null | { client?: object }
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [invoiceNotice, setInvoiceNotice] = useState('');

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const addClientFlow = async () => {
    if (!TIER_LIMITS[userTier].canSaveData) {
      openUpgrade(lockedMessage('Saving your own clients', 'starter'), 'starter');
      return;
    }
    if (await requireClientSlot()) setClientModal({});
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Client ROI and profitability</h1>
      <p className={`mt-2 max-w-2xl ${MUTED}`}>See which clients pay you well, which ones quietly cost you money, and send invoices that already account for tax.</p>

      <div className="mt-8 space-y-6">
        <ClientManagerCard clients={clients} userTier={userTier} onAdd={addClientFlow} onEdit={(c) => setClientModal({ client: c })} notice={notice} />

        <LockedCard locked={!tierAtLeast(userTier, 'pro')} tier="pro" label="Effective hourly rate matrix">
          <EhrCard clients={clients} />
        </LockedCard>

        <LockedCard locked={!tierAtLeast(userTier, 'agency')} tier="agency" label="Custom PDF invoice builder">
          <InvoicesCard invoices={invoices} hasClients={clients.length > 0} onNew={() => setInvoiceOpen(true)} notice={invoiceNotice} />
        </LockedCard>
      </div>

      {clientModal && <ClientModal client={clientModal.client} onClose={() => setClientModal(null)} onSaved={setNotice} />}
      {invoiceOpen && <InvoiceModal clients={clients} taxRate={taxRate} onClose={() => setInvoiceOpen(false)} onSaved={setInvoiceNotice} />}
    </div>
  );
}
