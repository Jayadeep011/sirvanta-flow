// src/components/AdvisorTab.jsx
// Service 04: Agentic AI and document intelligence ("Sirvanta Advisor").
//   - Statement parser: drop a CSV/text file or paste statement text, rows are saved to the local database (Pro and above)
//   - Scenario search: ask a what-if question, answered from a snapshot of your numbers (Pro and above)
//   - Executive briefing: one-click Markdown report (Agency & CFO)
// Requests go through the Netlify function /.netlify/functions/sirvanta-advisor.

import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Download, FileUp, Sparkles, Undo2 } from 'lucide-react';
import { db, getSettings, addTransactions, recordAiUsage, TIER_LIMITS } from '../db';
import { useStore } from '../store';
import { tierAtLeast } from '../plans';
import { usd } from '../finance';
import { callAdvisor, parseStatement, dropDuplicates, buildContextSnapshot } from '../advisor';
import LockedCard from './LockedCard';
import Markdown from './Markdown';
import {
  CARD_BLUE, CARD_INDIGO, CARD_GOLD, TINT_BLUE, TINT_INDIGO, TINT_GOLD, TINT_TEAL,
  MUTED, GOLD_TEXT, DIVIDER, BTN_GOLD, BTN_OUTLINE, INPUT,
} from '../ui';

const MAX_FILE_BYTES = 1_500_000;
const EXAMPLES = [
  'Can I spend $3,000 on new server infrastructure next month if my biggest client pays 20 days late?',
  'How much should I move to my personal account this month?',
  'Which client should I fire first, and what would it cost me?',
];

const Footnote = ({ children }) => <p className={`mt-4 border-t pt-3 text-xs leading-relaxed ${DIVIDER} ${MUTED}`}>{children}</p>;

const ErrorNote = ({ children }) => (
  <p role="alert" className="mt-3 rounded-lg bg-[#FBE4E1] p-3 text-sm text-[#7A1F17] dark:bg-[#2A1512] dark:text-[#F5B5AE]">{children}</p>
);

/* ---------- monthly allowance strip ---------- */
function UsageStrip({ userTier }) {
  const settings = useLiveQuery(() => getSettings(), []);
  const limits = TIER_LIMITS[userTier];
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const usage = settings?.aiUsage?.month === key ? settings.aiUsage : { parses: 0, queries: 0 };
  const fmt = (used, cap) => (cap <= 0 ? 'not included' : Number.isFinite(cap) ? `${used} of ${cap} used` : `${used} used, no limit`);

  return (
    <dl className="mt-6 grid gap-3 sm:grid-cols-2">
      <div className={`rounded-lg p-3 ${TINT_BLUE}`}><dt className={`text-xs ${MUTED}`}>Statement parsings this month</dt><dd className="mt-0.5 font-bold tabular-nums">{fmt(usage.parses, limits.aiParsesPerMonth)}</dd></div>
      <div className={`rounded-lg p-3 ${TINT_INDIGO}`}><dt className={`text-xs ${MUTED}`}>AI questions and briefings this month</dt><dd className="mt-0.5 font-bold tabular-nums">{fmt(usage.queries, limits.aiQueriesPerMonth)}</dd></div>
    </dl>
  );
}

/* ---------- statement parser ---------- */
function StatementParserCard({ selectedEntity }) {
  const requireAi = useStore((s) => s.requireAi);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [entity, setEntity] = useState(selectedEntity === 'personal' ? 'personal' : 'business');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const readFile = async (file) => {
    setError('');
    if (!file) return;
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      setError('PDF files cannot be read directly yet. Open the PDF, select all, copy, and paste the text into the box below.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is larger than 1.5 MB. Split the statement into smaller files.');
      return;
    }
    try {
      setText(await file.text());
      setFileName(file.name);
    } catch {
      setError('That file could not be read as text.');
    }
  };

  const run = async () => {
    setError('');
    setResult(null);
    if (!text.trim()) return setError('Add a statement first: drop a file or paste the text.');
    if (!(await requireAi('parse', 'AI statement parsing'))) return;

    setBusy(true);
    setProgress({ i: 1, n: 1 });
    try {
      const parsed = await parseStatement(text, { entity, onProgress: (i, n) => setProgress({ i, n }) });
      const { fresh, duplicates } = await dropDuplicates(parsed.rows);
      const saved = fresh.length ? await addTransactions(fresh) : { saved: 0, skipped: 0, ids: [] };

      if (parsed.failedAt === null || parsed.failedAt > 1) await recordAiUsage('parse');
      setResult({
        rows: fresh,
        saved: saved.saved,
        ids: saved.ids,
        duplicates,
        partial: parsed.failedAt !== null ? `Part ${parsed.failedAt} of ${parsed.total} failed: ${parsed.failure} Rows from the earlier parts were kept.` : '',
      });
      if (parsed.failedAt === 1) setError(parsed.failure);
      else if (!parsed.rows.length && parsed.failedAt === null) setError('No transactions were found in that text. Check that it contains dated transaction lines.');
    } catch (err) {
      setError(err.message || 'The statement could not be parsed.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const undo = async () => {
    if (!result?.ids?.length) return;
    await db.transactions.bulkDelete(result.ids);
    setResult((r) => ({ ...r, saved: 0, ids: [], rows: [], undone: true }));
  };

  const lines = text ? text.split('\n').filter((l) => l.trim()).length : 0;

  return (
    <section className={`${CARD_BLUE} p-6`} aria-labelledby="sp-title">
      <h2 id="sp-title" className="text-lg font-semibold">AI statement parser</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>Turn a bank or card statement into categorized transactions, with likely Schedule C write-offs flagged.</p>

      <label
        htmlFor="sp-file"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files?.[0]); }}
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors focus-within:ring-2 focus-within:ring-[#C5A059] ${
          dragging ? 'border-[#2E5FBF] bg-[#E1EBF8] dark:border-[#5B8DEF] dark:bg-[#111C2E]' : 'border-[#CBBE9F] hover:border-[#2E5FBF] dark:border-[#3F3F46]'
        }`}
      >
        <FileUp size={26} className="text-[#2E5FBF] dark:text-[#5B8DEF]" aria-hidden="true" />
        <span className="mt-2 text-sm font-semibold">{fileName || 'Drop a CSV or text statement here'}</span>
        <span className={`mt-1 text-xs ${MUTED}`}>{fileName ? `${lines} lines loaded. Drop another file to replace it.` : 'or click to choose a file (.csv, .txt)'}</span>
        <input id="sp-file" type="file" accept=".csv,.tsv,.txt,text/plain,text/csv,.pdf" className="sr-only" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
      </label>

      <div className="mt-4">
        <label htmlFor="sp-text" className="mb-1 block text-sm font-medium">Or paste statement text</label>
        <textarea id="sp-text" rows={5} className={`${INPUT} font-mono text-xs`} value={text} onChange={(e) => { setText(e.target.value); setFileName(''); }} placeholder="Paste text copied from a PDF statement, or CSV rows: date, description, amount" />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="sp-entity" className="mb-1 block text-sm font-medium">Save transactions to</label>
          <select id="sp-entity" className={INPUT} value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="business">Business</option>
            <option value="personal">Personal</option>
          </select>
        </div>
        <button onClick={run} disabled={busy} className={`${BTN_GOLD} gap-2`}><Sparkles size={16} aria-hidden="true" />{busy ? `Parsing part ${progress?.i} of ${progress?.n}…` : 'Run AI Statement Parser'}</button>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {result && (
        <div className={`mt-5 rounded-xl p-4 ${TINT_TEAL}`} aria-live="polite">
          {result.undone ? (
            <p className="text-sm">Import undone. Those transactions were removed.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {result.saved} {result.saved === 1 ? 'transaction' : 'transactions'} saved
                  {result.duplicates > 0 && <span className={`font-normal ${MUTED}`}> · {result.duplicates} duplicates skipped</span>}
                </p>
                {result.saved > 0 && <button onClick={undo} className={`inline-flex items-center gap-1.5 text-sm font-semibold underline ${GOLD_TEXT}`}><Undo2 size={14} aria-hidden="true" />Undo import</button>}
              </div>
              {result.partial && <p className="mt-2 text-sm text-[#B45309] dark:text-[#FBBF24]">{result.partial}</p>}
              {result.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-left text-sm">
                    <caption className="sr-only">First transactions imported</caption>
                    <thead className={MUTED}><tr><th className="py-1.5 pr-3 font-medium">Date</th><th className="pr-3 font-medium">Description</th><th className="pr-3 font-medium">Category</th><th className="text-right font-medium">Amount</th></tr></thead>
                    <tbody>
                      {result.rows.slice(0, 8).map((r, i) => (
                        <tr key={i} className={`border-t ${DIVIDER}`}>
                          <td className="py-1.5 pr-3 whitespace-nowrap">{r.date}</td>
                          <td className="pr-3">{r.description}{r.isDeductible && <span className="ml-2 rounded bg-[#EFE3C6] px-1.5 py-0.5 text-[10px] font-bold text-[#7A5A17] dark:bg-[#1B1810] dark:text-[#D4AF37]">DEDUCTIBLE</span>}</td>
                          <td className={`pr-3 ${MUTED}`}>{r.scheduleCCategory || r.category}</td>
                          <td className={`text-right tabular-nums ${r.amount < 0 ? '' : 'text-[#16A34A]'}`}>{r.amount < 0 ? '−' : '+'}{usd(Math.abs(r.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.rows.length > 8 && <p className={`mt-2 text-xs ${MUTED}`}>Showing 8 of {result.rows.length}.</p>}
                </div>
              )}
            </>
          )}
        </div>
      )}
      <Footnote>The statement text is sent through our server to Anthropic to be parsed. Review the imported rows, especially the deductible flags, before relying on them. Rows already in your books are skipped.</Footnote>
    </section>
  );
}

/* ---------- scenario search ---------- */
function ScenarioCard({ entity }) {
  const requireAi = useStore((s) => s.requireAi);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState([]);

  const ask = async (q) => {
    const prompt = (q ?? question).trim();
    setError('');
    if (prompt.length < 8) return setError('Ask a full question, for example: can I afford a $3,000 laptop next month?');
    if (prompt.length > 500) return setError('Keep the question under 500 characters.');
    if (!(await requireAi('query', 'Financial scenario search'))) return;

    setBusy(true);
    try {
      const snapshot = await buildContextSnapshot(entity);
      const text = await callAdvisor({ mode: 'advise', prompt, contextData: snapshot });
      await recordAiUsage('query');
      setAnswers((list) => [{ id: Date.now(), question: prompt, text, snapshot }, ...list].slice(0, 5));
      setQuestion('');
    } catch (err) {
      setError(err.message || 'The advisor could not answer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${CARD_INDIGO} p-6`} aria-labelledby="sc-title">
      <h2 id="sc-title" className="text-lg font-semibold">Financial scenario search</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>Ask a what-if question. The answer uses your safe-to-spend figure, income history, and projected cash flow.</p>

      <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="sc-q" className="sr-only">Your question</label>
        <input id="sc-q" className={`${INPUT} flex-1`} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} placeholder="Can I spend $3,000 on servers next month if Apex pays 20 days late?" />
        <button type="submit" disabled={busy} className={`${BTN_GOLD} gap-2`}><Sparkles size={16} aria-hidden="true" />{busy ? 'Thinking…' : 'Ask Advisor'}</button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" disabled={busy} onClick={() => { setQuestion(ex); ask(ex); }} className={`rounded-full px-3 py-1.5 text-left text-xs ${TINT_INDIGO} hover:brightness-95`}>{ex}</button>
        ))}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="mt-5 space-y-4" aria-live="polite">
        {answers.map((a, idx) => (
          <article key={a.id} className={`rounded-xl border p-5 ${DIVIDER} ${idx === 0 ? 'bg-white/60 dark:bg-white/5' : 'opacity-80'}`}>
            <p className={`text-xs font-semibold ${GOLD_TEXT}`}>You asked</p>
            <p className="mt-1 text-sm font-semibold">{a.question}</p>
            <div className="mt-3 border-t pt-3"><Markdown text={a.text} /></div>
            <div className={`mt-3 flex flex-wrap gap-2 text-xs ${MUTED}`}>
              <span className={`rounded-full px-2.5 py-1 ${TINT_BLUE}`}>Safe to spend {usd(a.snapshot.safeToSpend.safeToSpend)}</span>
              <span className={`rounded-full px-2.5 py-1 ${TINT_BLUE}`}>Avg income {usd(a.snapshot.income.averageMonthly)}/mo</span>
            </div>
            <details className={`mt-3 text-xs ${MUTED}`}>
              <summary className="cursor-pointer font-semibold">See exactly what was shared</summary>
              <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-black/5 p-3 text-[11px] leading-relaxed dark:bg-white/5">{JSON.stringify(a.snapshot, null, 2)}</pre>
            </details>
          </article>
        ))}
      </div>
      <Footnote>Advice is general information based on the figures above, not tax, legal, or investment advice. AI can make mistakes; check the math before acting on it.</Footnote>
    </section>
  );
}

/* ---------- executive briefing ---------- */
function BriefingCard({ entity }) {
  const requireAi = useStore((s) => s.requireAi);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null); // { text, date }
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const generate = async () => {
    setError('');
    if (!(await requireAi('query', '1-click executive briefings'))) return;
    setBusy(true);
    try {
      const snapshot = await buildContextSnapshot('consolidated');
      const text = await callAdvisor({
        mode: 'briefing',
        prompt: 'Write this month\'s executive financial briefing: net worth change, tax readiness, client scope creep alerts, and the top 3 recommended financial moves.',
        contextData: snapshot,
      });
      await recordAiUsage('query');
      setReport({ text, date: snapshot.asOf });
    } catch (err) {
      setError(err.message || 'The briefing could not be generated.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copying is blocked by your browser. Use Download instead.');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([`# Sirvanta executive briefing, ${report.date}\n\n${report.text}\n`], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sirvanta-briefing-${report.date}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={`${CARD_GOLD} p-6`} aria-labelledby="eb-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="eb-title" className="text-lg font-semibold">Executive financial briefing</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>Net worth change, tax readiness, client alerts, and your top three moves, in one report.</p>
        </div>
        <button onClick={generate} disabled={busy} className={`${BTN_GOLD} gap-2`}><Sparkles size={16} aria-hidden="true" />{busy ? 'Writing briefing…' : report ? 'Regenerate briefing' : 'Generate briefing'}</button>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}

      {report && (
        <article className={`mt-5 rounded-xl p-5 ${TINT_GOLD}`} aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-xs font-semibold ${GOLD_TEXT}`}>Briefing for {report.date}</p>
            <div className="flex gap-2">
              <button onClick={copy} className={`${BTN_OUTLINE} gap-1.5 !px-3 !py-1.5 !text-xs`}><Copy size={13} aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button>
              <button onClick={download} className={`${BTN_OUTLINE} gap-1.5 !px-3 !py-1.5 !text-xs`}><Download size={13} aria-hidden="true" />Download .md</button>
            </div>
          </div>
          <div className="mt-3"><Markdown text={report.text} /></div>
        </article>
      )}
      <Footnote>The briefing covers all of your entities together. Figures come from your recorded transactions, so they can differ from live bank balances.</Footnote>
    </section>
  );
}

/* ---------- tab ---------- */
export default function AdvisorTab() {
  const userTier = useStore((s) => s.userTier);
  const selectedEntity = useStore((s) => s.selectedEntity);
  const pro = tierAtLeast(userTier, 'pro');

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sirvanta Advisor</h1>
      <p className={`mt-2 max-w-2xl ${MUTED}`}>Import statements in seconds, ask what-if questions, and get a monthly briefing built from your own numbers.</p>

      <UsageStrip userTier={userTier} />

      <div className="mt-6 space-y-6">
        <LockedCard locked={!pro} tier="pro" label="AI statement parser">
          <StatementParserCard selectedEntity={selectedEntity} />
        </LockedCard>
        <LockedCard locked={!pro} tier="pro" label="Financial scenario search">
          <ScenarioCard entity={selectedEntity} />
        </LockedCard>
        <LockedCard locked={!tierAtLeast(userTier, 'agency')} tier="agency" label="1-click executive briefing">
          <BriefingCard entity={selectedEntity} />
        </LockedCard>
      </div>
    </div>
  );
}
