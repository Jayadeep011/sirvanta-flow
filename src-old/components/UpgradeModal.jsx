// src/components/UpgradeModal.jsx
// Plan picker followed by a SIMULATED checkout. No payment is taken and card details
// live only in this component's state until it closes. Replace `processPayment` with a
// real Stripe Checkout call when you are ready to bill customers.

import React, { useEffect, useRef, useState } from 'react';
import { X, Check, Lock } from 'lucide-react';
import { useStore } from '../store';
import { PLANS, TIER_NAMES } from '../plans';
import { CARD, MUTED, GOLD_TEXT, BTN_GOLD, BTN_OUTLINE, INPUT } from '../ui';

const PAID_PLANS = PLANS.filter((p) => p.id !== 'free');

const luhnValid = (digits) => {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

const formatCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

function validate(f) {
  const errors = {};
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) errors.email = 'Enter a valid email address.';
  if (f.name.trim().length < 2) errors.name = 'Enter the name on the card.';
  const digits = f.number.replace(/\s/g, '');
  if (digits.length < 13 || !luhnValid(digits)) errors.number = 'Enter a valid card number.';
  const m = f.expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m || new Date(2000 + Number(m[2]), Number(m[1]), 1) <= new Date()) errors.expiry = 'Enter a future date as MM/YY.';
  if (!/^\d{3,4}$/.test(f.cvc)) errors.cvc = 'Enter the 3 or 4 digit code.';
  return errors;
}

function Field({ id, label, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={id} className={INPUT} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...props} />
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
}

function UpgradeFlow({ modal }) {
  const closeUpgrade = useStore((s) => s.closeUpgrade);
  const completeUpgrade = useStore((s) => s.completeUpgrade);
  const enterApp = useStore((s) => s.enterApp);
  const view = useStore((s) => s.view);

  const [step, setStep] = useState('plans'); // 'plans' | 'checkout' | 'processing' | 'done'
  const [tierId, setTierId] = useState(modal.tier);
  const [form, setForm] = useState({ email: '', name: '', number: '', expiry: '', cvc: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const timer = useRef(null);
  const closeBtn = useRef(null);

  const plan = PLANS.find((p) => p.id === tierId);
  const busy = step === 'processing';

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e) => e.key === 'Escape' && !busy && closeUpgrade();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, closeUpgrade]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const set = (key) => (e) => {
    const raw = e.target.value;
    const value = key === 'number' ? formatCard(raw) : key === 'expiry' ? formatExpiry(raw) : key === 'cvc' ? raw.replace(/\D/g, '').slice(0, 4) : raw;
    setForm((p) => ({ ...p, [key]: value }));
  };

  const fillTestCard = () => {
    setForm({ email: 'founder@example.com', name: 'Test Founder', number: '4242 4242 4242 4242', expiry: '12/34', cvc: '123' });
    setErrors({});
  };

  // Simulated payment: waits briefly, then succeeds.
  const processPayment = () => new Promise((resolve) => { timer.current = setTimeout(resolve, 1400); });

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitError('');
    setStep('processing');
    try {
      await processPayment();
      await completeUpgrade(tierId);
      setForm({ email: '', name: '', number: '', expiry: '', cvc: '' });
      setStep('done');
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Try again.');
      setStep('checkout');
    }
  };

  const finish = () => {
    closeUpgrade();
    if (view === 'landing') enterApp();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onClick={() => !busy && closeUpgrade()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className={`${CARD} my-8 w-full max-w-3xl p-6 sm:p-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="upgrade-title" className="text-2xl font-bold tracking-tight">
              {step === 'done' ? `You're on ${plan.name}` : step === 'plans' ? 'Upgrade to keep going' : `Checkout: ${plan.name}`}
            </h2>
            {step === 'plans' && modal.reason && <p className={`mt-1 text-sm ${MUTED}`}>{modal.reason}</p>}
          </div>
          <button ref={closeBtn} onClick={closeUpgrade} disabled={busy} aria-label="Close" className={`rounded-md p-1 ${MUTED} hover:bg-[#E8DEC7] disabled:opacity-40 dark:hover:bg-[#18181D]`}>
            <X size={18} />
          </button>
        </div>

        {step === 'plans' && (
          <>
            <div role="radiogroup" aria-label="Plan" className="mt-6 grid gap-4 md:grid-cols-3">
              {PAID_PLANS.map((p) => {
                const selected = p.id === tierId;
                return (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTierId(p.id)}
                    className={`relative rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] ${
                      selected ? 'border-[#C5A059] ring-1 ring-[#C5A059] dark:border-[#D4AF37] dark:ring-[#D4AF37]' : 'border-[#DDD2BA] hover:border-[#C5A059] dark:border-[#27272A]'
                    }`}
                  >
                    {p.popular && <span className="absolute -top-2.5 right-3 rounded-full bg-[#C5A059] px-2 py-0.5 text-[11px] font-bold text-[#1B2233] dark:bg-[#D4AF37]">Most popular</span>}
                    <div className="font-semibold">{p.name}</div>
                    <div className="mt-1 flex items-baseline gap-1"><span className="text-2xl font-extrabold">${p.price}</span><span className={`text-sm ${MUTED}`}>/mo</span></div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {p.features.filter(([, on]) => on).slice(0, 5).map(([label]) => (
                        <li key={label} className="flex items-start gap-2"><Check size={14} className="mt-1 shrink-0 text-[#16A34A]" aria-hidden="true" />{label}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={closeUpgrade} className={BTN_OUTLINE}>Not now</button>
              <button onClick={() => setStep('checkout')} className={BTN_GOLD}>Continue with {plan.name}, ${plan.price}/mo</button>
            </div>
          </>
        )}

        {(step === 'checkout' || step === 'processing') && (
          <form onSubmit={submit} noValidate className="mt-6 grid gap-6 md:grid-cols-[1fr_16rem]">
            <div className="space-y-4">
              <Field id="co-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} disabled={busy} />
              <Field id="co-name" label="Name on card" autoComplete="cc-name" value={form.name} onChange={set('name')} error={errors.name} disabled={busy} />
              <Field id="co-number" label="Card number" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={form.number} onChange={set('number')} error={errors.number} disabled={busy} />
              <div className="grid grid-cols-2 gap-4">
                <Field id="co-exp" label="Expiry" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={form.expiry} onChange={set('expiry')} error={errors.expiry} disabled={busy} />
                <Field id="co-cvc" label="CVC" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={form.cvc} onChange={set('cvc')} error={errors.cvc} disabled={busy} />
              </div>
              {submitError && <p role="alert" className="text-sm text-[#DC2626]">{submitError}</p>}
            </div>

            <aside className="h-fit rounded-xl bg-[#E9DEC4] p-4 text-sm dark:bg-[#1B1810]">
              <div className="flex items-center justify-between font-semibold"><span>{plan.name}</span><span>${plan.price}/mo</span></div>
              <p className={`mt-1 ${MUTED}`}>Billed monthly</p>
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed"><Lock size={14} className={`mt-0.5 shrink-0 ${GOLD_TEXT}`} aria-hidden="true" />Simulated checkout for testing. No card is charged and card details are not saved.</p>
              <button type="button" onClick={fillTestCard} disabled={busy} className={`mt-3 text-xs font-semibold underline ${GOLD_TEXT}`}>Fill test card</button>
              <button type="submit" disabled={busy} className={`${BTN_GOLD} mt-4 w-full`}>{busy ? 'Processing…' : `Pay $${plan.price}`}</button>
              <button type="button" onClick={() => setStep('plans')} disabled={busy} className={`mt-2 w-full text-xs font-medium ${MUTED} underline`}>Change plan</button>
            </aside>
          </form>
        )}

        {step === 'done' && (
          <div className="mt-6">
            <p className={`text-sm leading-relaxed ${MUTED}`}>
              Your plan is now {TIER_NAMES[tierId]}. This was a simulated checkout, so nothing was charged. Your data is saved in this browser.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {plan.features.filter(([, on]) => on).map(([label]) => (
                <li key={label} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[#16A34A]" aria-hidden="true" />{label}</li>
              ))}
            </ul>
            <button onClick={finish} className={`${BTN_GOLD} mt-6`}>{view === 'landing' ? 'Open my dashboard' : 'Continue'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpgradeModal() {
  const modal = useStore((s) => s.upgradeModal);
  if (!modal) return null;
  // Mounting a fresh flow on every open resets the steps and form.
  return <UpgradeFlow modal={modal} />;
}
