// src/pages/app/Docs.jsx
// User Manual & Docs: searchable guide with a section index.

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DOCS } from '../../content/docs';
import PageHeader from '../../components/PageHeader';
import { CARD, MUTED, GOLD_TEXT, INPUT, TINT_GOLD, TINT_BLUE } from '../../ui';

const searchable = (d) => [d.title, d.intro, d.formula || '', ...d.steps, ...d.tips].join(' ').toLowerCase();

export default function DocsPage() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const results = useMemo(() => (q ? DOCS.filter((d) => searchable(d).includes(q)) : DOCS), [q]);

  return (
    <div>
      <PageHeader title="User Manual & Docs" description="How each tool works, step by step. Search for a word or pick a section." />

      <div className="relative max-w-md">
        <Search size={16} className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${MUTED}`} aria-hidden="true" />
        <label htmlFor="docs-search" className="sr-only">Search the manual</label>
        <input id="docs-search" className={`${INPUT} pl-9`} placeholder="Search: tax, buffer, import…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Manual sections" className="lg:sticky lg:top-24">
          <ul className="space-y-1">
            {DOCS.map((d) => (
              <li key={d.id}>
                <a href={`#${d.id}`} className={`block rounded-md px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-white/5 ${results.includes(d) ? '' : 'opacity-40'}`}>{d.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          {results.length === 0 && <p className={`${CARD} p-6 text-sm ${MUTED}`}>Nothing matches “{query}”. Try a shorter word such as “tax” or “client”.</p>}
          {results.map((d) => (
            <article key={d.id} id={d.id} className={`${CARD} scroll-mt-24 p-6`}>
              <h2 className="text-xl font-semibold">{d.title}</h2>
              <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{d.intro}</p>
              {d.formula && <p className={`mt-4 overflow-x-auto whitespace-nowrap rounded-lg px-4 py-3 font-mono text-[13px] ${TINT_BLUE}`}>{d.formula}</p>}
              <ol className="mt-4 space-y-3">
                {d.steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-sm leading-relaxed">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${TINT_GOLD} ${GOLD_TEXT}`}>{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              {d.tips.map((t) => <p key={t} className={`mt-4 rounded-lg p-3 text-sm ${TINT_GOLD}`}><strong>Tip.</strong> {t}</p>)}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
