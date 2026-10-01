// src/components/Markdown.jsx
// Minimal, safe Markdown renderer (headings, bold, inline code, lists, tables, rules).
// It builds React elements directly and never injects HTML, so AI output cannot run scripts.

import React from 'react';
import { MUTED, DIVIDER } from '../ui';

function inline(text, keyBase) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${keyBase}-${i}`} className="rounded bg-black/5 px-1 py-0.5 text-[0.9em] dark:bg-white/10">{part.slice(1, -1)}</code>;
    }
    return <React.Fragment key={`${keyBase}-${i}`}>{part}</React.Fragment>;
  });
}

const isTableLine = (l) => l.trim().startsWith('|');
const isSeparator = (l) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes('-');
const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

export default function Markdown({ text }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;

    if (!line.trim()) { i++; continue; }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(
        <h3 key={key} className={`${level <= 2 ? 'mt-6 text-lg' : 'mt-4 text-base'} font-semibold first:mt-0`}>{inline(heading[2], key)}</h3>
      );
      i++;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push(<hr key={key} className={`my-4 border-t ${DIVIDER}`} />);
      i++;
      continue;
    }

    if (isTableLine(line)) {
      const rows = [];
      while (i < lines.length && isTableLine(lines[i])) { rows.push(lines[i]); i++; }
      const body = rows.filter((r) => !isSeparator(r)).map(cells);
      const [head, ...rest] = body;
      if (!head) continue;
      blocks.push(
        <div key={key} className="my-3 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead className={MUTED}><tr>{head.map((c, j) => <th key={j} className="py-1.5 pr-3 font-medium">{inline(c, `${key}h${j}`)}</th>)}</tr></thead>
            <tbody>{rest.map((r, ri) => <tr key={ri} className={`border-t ${DIVIDER}`}>{r.map((c, j) => <td key={j} className="py-1.5 pr-3 align-top">{inline(c, `${key}r${ri}c${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const matcher = ordered ? numbered : bullet;
      const items = [];
      while (i < lines.length && matcher.test(lines[i])) { items.push(lines[i].replace(matcher, '')); i++; }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={key} className={`my-3 space-y-1.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, j) => <li key={j}>{inline(it, `${key}i${j}`)}</li>)}
        </List>
      );
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*[-*]\s|\s*\d+[.)]\s)/.test(lines[i]) && !isTableLine(lines[i]) && !/^\s*(-{3,}|\*{3,})\s*$/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    blocks.push(<p key={key} className="my-3 leading-relaxed">{inline(para.join(' '), key)}</p>);
  }

  return <div className="text-sm">{blocks}</div>;
}
