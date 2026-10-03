// src/pages/app/Settings.jsx
// Settings & Upgrade Center: profile, plan and billing, regional preferences, local data tools.

import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Download, Trash2, Upload } from 'lucide-react';
import { db, getSettings, exportAllData, importAllData, wipeEverything, TIER_LIMITS } from '../../db';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { PLANS, TIER_NAMES, TIER_ORDER, ANNUAL_DISCOUNT, annualPrice } from '../../plans';
import { COUNTRIES, CURRENCIES, LANGUAGES, MONTHS } from '../../regions';
import { currencySymbol } from '../../finance';
import { downloadFile } from '../../download';
import PageHeader from '../../components/PageHeader';
import { CARD, CARD_BLUE, CARD_TEAL, CARD_GOLD, TINT_BLUE, TINT_RED, MUTED, GOLD_TEXT, DIVIDER, BTN_GOLD, BTN_OUTLINE, INPUT } from '../../ui';

const MAX_BACKUP_BYTES = 10_000_000;

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className={`mt-1 text-xs ${MUTED}`}>{hint}</p>}
    </div>
  );
}

/* ---------- Tab 1: profile ---------- */
function ProfileTab() {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const [form, setForm] = useState({ name: profile.name, email: profile.email });
  const [saved, setSaved] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    await updateProfile({ name: form.name.trim(), email: form.email.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={save} className={`${CARD_BLUE} max-w-xl p-6`}>
      <h2 className="text-lg font-semibold">Profile &amp; Account</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>Shown in the sidebar and on your workspace. Stored on this device.</p>
      <div className="mt-5 flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#2E5FBF] to-[#5B4FC4] text-2xl font-bold text-white" aria-hidden="true">{(form.name || 'U')[0].toUpperCase()}</span>
        <p className={`text-sm ${MUTED}`}>Your avatar uses the first letter of your name.</p>
      </div>
      <div className="mt-5 space-y-4">
        <Field id="pf-name" label="Name"><input id="pf-name" className={INPUT} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoComplete="name" /></Field>
        <Field id="pf-email" label="Email" hint="Used for receipts when billing is connected."><input id="pf-email" type="email" className={INPUT} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} autoComplete="email" /></Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button type="submit" className={BTN_GOLD}>Save profile</button>
        <span aria-live="polite" className="text-sm text-[#16A34A]">{saved ? 'Saved' : ''}</span>
      </div>
    </form>
  );
}

/* ---------- Tab 2: plan and billing ---------- */
function Meter({ label, used, cap }) {
  const finite = Number.isFinite(cap);
  const pct = finite && cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="font-semibold tabular-nums">{cap <= 0 ? 'Not included' : finite ? `${used} of ${cap}` : `${used} (no limit)`}</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${pct > 85 ? 'bg-[#DC2626]' : 'bg-[#0F8B8D]'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PlanTab() {
  const userTier = useStore((s) => s.userTier);
  const openUpgrade = useStore((s) => s.openUpgrade);
  const changeTier = useStore((s) => s.changeTier);
  const [billing, setBilling] = useState('monthly');
  const settings = useLiveQuery(() => getSettings(), []);
  const clientCount = useLiveQuery(() => db.clients.count(), [], 0);
  const limits = TIER_LIMITS[userTier];
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const usage = settings && settings.aiUsage && settings.aiUsage.month === key ? settings.aiUsage : { parses: 0, queries: 0 };
  const current = TIER_ORDER.indexOf(userTier);
  const sym = currencySymbol();

  const switchPlan = async (plan) => {
    if (window.confirm(`Switch to ${plan.name}? This is a simulated plan change for testing.`)) {
      try {
        await changeTier(plan.id);
      } catch (err) {
        window.alert(err.message || 'Could not change plan.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <section className={`${CARD_GOLD} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Plan &amp; Billing</h2>
            <p className={`mt-1 text-sm ${MUTED}`}>You are on <strong>{TIER_NAMES[userTier]}</strong>. Billing is simulated until a payment provider is connected.</p>
          </div>
          {userTier !== 'agency' && <button className={BTN_GOLD} onClick={() => openUpgrade('', userTier === 'pro' ? 'agency' : 'pro', billing)}>Upgrade plan</button>}
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <Meter label="Clients" used={clientCount} cap={limits.maxClients} />
          <Meter label="Statement parsings this month" used={usage.parses} cap={limits.aiParsesPerMonth} />
          <Meter label="AI questions this month" used={usage.queries} cap={limits.aiQueriesPerMonth} />
        </div>
      </section>

      <div className="flex items-center gap-3" role="group" aria-label="Billing period">
        <button onClick={() => setBilling('monthly')} aria-pressed={billing === 'monthly'} className={`rounded-lg px-4 py-2 text-sm font-semibold ${billing === 'monthly' ? 'bg-slate-900 text-white dark:bg-white/15' : BTN_OUTLINE}`}>Monthly</button>
        <button onClick={() => setBilling('annual')} aria-pressed={billing === 'annual'} className={`rounded-lg px-4 py-2 text-sm font-semibold ${billing === 'annual' ? 'bg-slate-900 text-white dark:bg-white/15' : BTN_OUTLINE}`}>Yearly <span className="ml-1 rounded bg-[#16A34A] px-1.5 py-0.5 text-[10px] font-bold text-white">−{Math.round(ANNUAL_DISCOUNT * 100)}%</span></button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = p.id === userTier;
          const rank = TIER_ORDER.indexOf(p.id);
          return (
            <article key={p.id} className={`flex flex-col rounded-xl border p-5 ${isCurrent ? 'border-[#C5A059] ring-1 ring-[#C5A059] dark:border-[#D4AF37]' : DIVIDER} bg-white dark:bg-zinc-900/60`}>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-3 text-3xl font-extrabold tabular-nums">{sym}{billing === 'annual' ? annualPrice(p) : p.price}<span className={`text-sm font-medium ${MUTED}`}>{billing === 'annual' ? '/yr' : '/mo'}</span></p>
              {isCurrent ? (
                <button disabled className={`${BTN_OUTLINE} mt-4 w-full`}>Current plan</button>
              ) : rank > current ? (
                <button onClick={() => openUpgrade('', p.id, billing)} className={`${BTN_GOLD} mt-4 w-full`}>Upgrade to {p.name}</button>
              ) : (
                <button onClick={() => switchPlan(p)} className={`${BTN_OUTLINE} mt-4 w-full`}>Switch to {p.name}</button>
              )}
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map(([label, on]) => (
                  <li key={label} className={`flex gap-2 ${on ? '' : MUTED}`}>{on ? <Check size={15} className="mt-0.5 shrink-0 text-[#16A34A]" aria-hidden="true" /> : <span className="w-[15px] shrink-0 text-center" aria-hidden="true">–</span>}<span>{label}</span></li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Tab 3: regional ---------- */
function RegionalTab() {
  const country = useStore((s) => s.country);
  const currency = useStore((s) => s.currency);
  const language = useStore((s) => s.language);
  const fiscal = useStore((s) => s.fiscalYearEnd);
  const setCountry = useStore((s) => s.setCountry);
  const setCurrency = useStore((s) => s.setCurrency);
  const setLanguage = useStore((s) => s.setLanguage);
  const setFiscalYearEnd = useStore((s) => s.setFiscalYearEnd);

  const preset = COUNTRIES.find((c) => c.id === country) || COUNTRIES[0];

  const changeCountry = (id) => {
    const p = COUNTRIES.find((c) => c.id === id);
    if (window.confirm(`Apply the ${p.name} preset? Currency becomes ${p.currency} and your tax rates become ${p.federal}% income tax, ${p.state}% regional tax, self-employment tax ${p.se ? 'on' : 'off'}. Your current rates are replaced.`)) setCountry(id);
  };
  const daysInMonth = new Date(2025, fiscal.month + 1, 0).getDate();

  return (
    <form onSubmit={(e) => e.preventDefault()} className={`${CARD_TEAL} max-w-2xl p-6`}>
      <h2 className="text-lg font-semibold">Regional &amp; Currency</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>Defaults for formatting and starting tax rates.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field id="rg-country" label="Country / tax jurisdiction">
          <select id="rg-country" className={INPUT} value={country} onChange={(e) => changeCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}</select>
        </Field>
        <Field id="rg-currency" label="Default currency" hint="Changes the label and format only. Amounts are not converted.">
          <select id="rg-currency" className={INPUT} value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select>
        </Field>
        <Field id="rg-language" label="Language" hint="Translates the menus and header. Tool screens stay in English for now.">
          <select id="rg-language" className={INPUT} value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select>
        </Field>
        <div>
          <span className="mb-1 block text-sm font-medium" id="fy-label">Fiscal year-end</span>
          <div className="flex gap-2" role="group" aria-labelledby="fy-label">
            <select aria-label="Month" className={INPUT} value={fiscal.month} onChange={(e) => setFiscalYearEnd({ month: Number(e.target.value), day: Math.min(fiscal.day, new Date(2025, Number(e.target.value) + 1, 0).getDate()) })}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <input aria-label="Day" type="number" min="1" max={daysInMonth} className={`${INPUT} w-20 tabular-nums`} value={fiscal.day} onChange={(e) => setFiscalYearEnd({ ...fiscal, day: Math.min(daysInMonth, Math.max(1, Number(e.target.value) || 1)) })} />
          </div>
          <p className={`mt-1 text-xs ${MUTED}`}>Saved for reports. The Tax Vault still uses the US calendar year.</p>
        </div>
      </div>
      <p className={`mt-6 rounded-lg p-3 text-sm ${TINT_BLUE}`}>
        Current preset: <strong>{preset.name}</strong>, {preset.federal}% income tax, {preset.state}% regional, self-employment {preset.se ? 'on' : 'off'}. These are rough starting points, not advice. Adjust them in the Tax Vault.
      </p>
    </form>
  );
}

/* ---------- Tab 4: data ---------- */
function DataTab() {
  const reload = useStore((s) => s.reloadAfterDataChange);
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null); // { ok, text }
  const [confirmText, setConfirmText] = useState('');
  const counts = useLiveQuery(async () => ({ t: await db.transactions.count(), c: await db.clients.count(), i: await db.invoices.count() }), [], { t: 0, c: 0, i: 0 });

  const exportData = async () => {
    const data = await exportAllData();
    downloadFile(`sirvanta-backup-${data.exportedAt.slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
    setMessage({ ok: true, text: 'Backup saved to your downloads.' });
  };

  const importData = async (file) => {
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) return setMessage({ ok: false, text: 'That file is larger than 10 MB, so it is probably not a backup.' });
    try {
      const data = JSON.parse(await file.text());
      if (!window.confirm('Importing replaces the transactions, clients and invoices on this device with the ones in the backup. Continue?')) return;
      const result = await importAllData(data);
      await reload();
      setMessage({ ok: true, text: `Imported ${result.transactions} transactions, ${result.clients} clients and ${result.invoices} invoices.` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof SyntaxError ? 'That file is not valid JSON.' : err.message || 'The backup could not be imported.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const wipe = async () => {
    await wipeEverything();
    await reload();
    setConfirmText('');
    setMessage({ ok: true, text: 'All local data was deleted and your settings were reset.' });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <section className={`${CARD_BLUE} p-6`}>
        <h2 className="text-lg font-semibold">Data &amp; Local Sync</h2>
        <p className={`mt-1 text-sm ${MUTED}`}>Your records live in this browser: {counts.t} transactions, {counts.c} clients, {counts.i} invoices.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={exportData} className={`${BTN_GOLD} gap-2`}><Download size={16} aria-hidden="true" />Export backup (JSON)</button>
          <button onClick={() => fileRef.current?.click()} className={`${BTN_OUTLINE} gap-2`}><Upload size={16} aria-hidden="true" />Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a backup file" onChange={(e) => importData(e.target.files?.[0])} />
        </div>
        <div aria-live="polite">{message && <p className={`mt-4 rounded-lg p-3 text-sm ${message.ok ? 'bg-[#DCF3E4] text-[#146C34] dark:bg-[#0F2A1A] dark:text-[#4ADE80]' : `${TINT_RED} text-[#B42318] dark:text-[#F87171]`}`}>{message.text}</p>}</div>
        <p className={`mt-4 text-xs leading-relaxed ${MUTED}`}>Importing keeps your current plan. Backups include your settings and AI usage counts. They do not include API keys.</p>
      </section>

      <section className={`${CARD} border-[#DC2626]/40 p-6`}>
        <h2 className="text-lg font-semibold text-[#B42318] dark:text-[#F87171]">Wipe local data</h2>
        <p className={`mt-1 text-sm ${MUTED}`}>Deletes every record on this device and resets settings and plan to their defaults. Export a backup first if you might want anything back.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field id="wipe-confirm" label="Type DELETE to confirm"><input id="wipe-confirm" className={`${INPUT} w-44`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" /></Field>
          <button onClick={wipe} disabled={confirmText !== 'DELETE'} className="inline-flex items-center gap-2 rounded-lg bg-[#DC2626] px-5 py-3 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={16} aria-hidden="true" />Wipe everything</button>
        </div>
      </section>
    </div>
  );
}

const TABS = [
  { id: 'profile', key: 'set.profile', View: ProfileTab },
  { id: 'plan', key: 'set.plan', View: PlanTab },
  { id: 'regional', key: 'set.regional', View: RegionalTab },
  { id: 'data', key: 'set.data', View: DataTab },
];

export default function SettingsPage() {
  const t = useT();
  const [tab, setTab] = useState('plan');
  const Active = TABS.find((x) => x.id === tab).View;

  return (
    <div>
      <PageHeader title={t('nav.settings')} description="Your profile, plan, region and local data." />
      <div role="tablist" aria-label="Settings sections" className={`mb-6 flex gap-1 overflow-x-auto border-b ${DIVIDER}`}>
        {TABS.map((x) => (
          <button
            key={x.id}
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls="settings-panel"
            onClick={() => setTab(x.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${tab === x.id ? `border-[#C5A059] ${GOLD_TEXT}` : `border-transparent ${MUTED} hover:text-slate-900 dark:hover:text-zinc-100`}`}
          >
            {t(x.key)}
          </button>
        ))}
      </div>
      <div id="settings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}><Active /></div>
    </div>
  );
}
