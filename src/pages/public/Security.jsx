// src/pages/public/Security.jsx
// Privacy manifest: where data lives, what leaves the device, and the honest limits.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive, KeyRound, ShieldAlert, Send } from 'lucide-react';
import { useT } from '../../i18n';
import Reveal from '../../components/marketing/Reveal';
import { CARD, MUTED, GOLD_TEXT, BTN_GOLD, CONTAINER, DIVIDER, TINT_BLUE, TINT_GOLD } from '../../ui';

const PRINCIPLES = [
  [HardDrive, 'Your records stay on your device', "Transactions, clients, invoices and settings are saved in your browser's local database (IndexedDB). We do not run a database of customer finances."],
  [Send, 'AI sees only what you send', 'When you parse a statement or ask a question, that text and a summary of the figures needed to answer go through our server function to an AI provider. You can see the exact figures under every answer.'],
  [KeyRound, 'API keys never reach the browser', 'The AI provider key lives in a server environment variable and is used only inside the serverless function.'],
];

const DATA_MAP = [
  ['Transactions, clients, invoices', 'Your browser (IndexedDB)', 'Only if you include them in an AI request'],
  ['Settings, profile, plan', 'Your browser (IndexedDB)', 'No'],
  ['Theme and sidebar choices', 'Your browser (localStorage)', 'No'],
  ['Statement text you paste or drop', 'Not stored by our server function', 'Yes, to the AI provider, when you run the parser'],
  ['AI questions and the figures snapshot', 'Not stored by our server function', 'Yes, to the AI provider, when you ask'],
  ['API keys', 'Server environment variable', 'Never sent to your browser'],
];

const LIMITS = [
  'Clearing your browser data deletes your records. Export a backup from Settings to keep a copy.',
  'Your data is only as safe as your device. Use a screen lock and keep your browser updated.',
  'AI requests are processed by a third-party provider under that provider\'s own terms, including how it retains or uses inputs. Review those terms before sending real financial data, and prefer a paid or no-training API configuration for production use.',
  'The site loads its fonts from Google Fonts, which is a request to a third party when a page opens.',
  'Browser storage is not encrypted by Sirvanta Flow beyond what your browser and operating system provide.',
];

export default function Security() {
  const navigate = useNavigate();
  const t = useT();
  return (
    <>
      <section className="hero-glow">
        <div className={`${CONTAINER} pb-12 pt-16`}>
          <Reveal>
            <p className={`text-sm font-semibold ${GOLD_TEXT}`}>Security &amp; privacy manifest</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Local-first, with clear limits on what leaves your device.</h1>
            <p className={`mt-5 max-w-2xl text-lg leading-relaxed ${MUTED}`}>Financial records are sensitive. Here is exactly where yours live, what we send out, and what we cannot promise.</p>
          </Reveal>
        </div>
      </section>

      <section className={`${CONTAINER} pb-12`}>
        <div className="grid gap-5 md:grid-cols-3">
          {PRINCIPLES.map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 0.05}>
              <div className={`${CARD} h-full p-6`}>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#E1EBF8] text-[#2E5FBF] dark:bg-[#111C2E] dark:text-[#5B8DEF]"><Icon size={20} aria-hidden="true" /></span>
                <h2 className="mt-4 font-semibold">{title}</h2>
                <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER} pb-12`}>
        <h2 className="text-2xl font-bold tracking-tight">Where each kind of data goes</h2>
        <div className={`${CARD} mt-6 overflow-x-auto`}>
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Data storage and transmission</caption>
            <thead className={MUTED}><tr className={`border-b ${DIVIDER}`}><th scope="col" className="px-4 py-3 font-medium">Data</th><th scope="col" className="px-4 py-3 font-medium">Stored</th><th scope="col" className="px-4 py-3 font-medium">Leaves your device?</th></tr></thead>
            <tbody>
              {DATA_MAP.map(([a, b, c]) => <tr key={a} className={`border-b last:border-b-0 ${DIVIDER}`}><th scope="row" className="px-4 py-3 font-medium">{a}</th><td className="px-4 py-3">{b}</td><td className="px-4 py-3">{c}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${CONTAINER} pb-12`}>
        <div className={`${TINT_GOLD} rounded-xl p-6`}>
          <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert size={20} aria-hidden="true" />What we do not claim</h2>
          <ul className="mt-4 list-disc space-y-2.5 pl-5 text-sm leading-relaxed">{LIMITS.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </section>

      <section className={`${CONTAINER} pb-24`}>
        <div className={`${CARD} flex flex-col items-start justify-between gap-5 p-8 md:flex-row md:items-center`}>
          <div><h2 className="text-2xl font-bold tracking-tight">Check it yourself.</h2><p className={`mt-1 ${MUTED}`}>Open the workspace and use “See exactly what was shared” under any AI answer.</p></div>
          <button onClick={() => navigate('/app/dashboard')} className={BTN_GOLD}>{t('pub.launch')}</button>
        </div>
        <p className={`mt-6 rounded-lg p-4 text-sm ${TINT_BLUE}`}>This page describes how the product works today. It is not a legal document. See the Privacy Policy in the footer for the plain-language summary.</p>
      </section>
    </>
  );
}
