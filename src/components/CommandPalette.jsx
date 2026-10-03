// src/components/CommandPalette.jsx
// Cmd/Ctrl + K quick switcher: jump between pages or run common actions.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Download, Moon, Search, Sparkles, Languages } from 'lucide-react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { APP_NAV } from '../navigation';
import { LANGUAGES } from '../regions';
import { exportAllData } from '../db';
import { downloadFile } from '../download';
import { CARD, MUTED, DIVIDER } from '../ui';

export default function CommandPalette() {
  const t = useT();
  const navigate = useNavigate();
  const open = useStore((s) => s.paletteOpen);
  const setPalette = useStore((s) => s.setPalette);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const openUpgrade = useStore((s) => s.openUpgrade);
  const setLanguage = useStore((s) => s.setLanguage);
  const userTier = useStore((s) => s.userTier);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const commands = useMemo(() => {
    const go = (path) => () => navigate(path);
    const list = APP_NAV.map((i) => ({ id: i.id, label: t(i.labelKey), hint: 'Go to page', icon: i.icon, run: go(i.path), words: i.id }));
    list.push(
      { id: 'theme', label: 'Toggle light / dark mode', hint: 'Action', icon: Moon, run: toggleTheme, words: 'theme dark light appearance' },
      { id: 'export', label: 'Export a backup of my data', hint: 'Action', icon: Download, words: 'backup download json save', run: async () => {
        const data = await exportAllData();
        downloadFile(`sirvanta-backup-${data.exportedAt.slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
      } },
      { id: 'ask', label: 'Ask the AI Advisor a question', hint: 'Go to page', icon: Sparkles, run: go('/app/ai-advisor'), words: 'scenario what if question briefing' },
      { id: 'import', label: 'Import a bank statement', hint: 'Go to page', icon: Download, run: go('/app/statement-parser'), words: 'upload csv parse' }
    );
    if (userTier !== 'agency') list.push({ id: 'upgrade', label: 'Upgrade my plan', hint: 'Action', icon: Sparkles, run: () => openUpgrade('', userTier === 'pro' ? 'agency' : 'pro'), words: 'billing pricing pro agency' });
    LANGUAGES.forEach((l) => list.push({ id: `lang-${l.code}`, label: `Language: ${l.name}`, hint: 'Action', icon: Languages, run: () => setLanguage(l.code), words: 'language idioma sprache langue' }));
    return list;
  }, [t, navigate, toggleTheme, openUpgrade, setLanguage, userTier]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => `${c.label} ${c.words}`.toLowerCase().includes(q)) : commands.slice(0, 9);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const close = () => setPalette(false);
  const run = (cmd) => {
    close();
    if (cmd) cmd.run();
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[active]); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" className={`${CARD} w-full max-w-xl overflow-hidden`} onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className={`flex items-center gap-3 border-b px-4 ${DIVIDER}`}>
          <Search size={16} className={MUTED} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
            placeholder={t('ui.search')}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
          />
          <kbd className="rounded border border-slate-300 px-1.5 text-[10px] font-semibold dark:border-white/20">Esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className={`px-3 py-6 text-center text-sm ${MUTED}`}>No matches. Try “tax”, “client” or “backup”.</li>}
          {results.map((c, i) => {
            const Icon = c.icon;
            return (
              <li key={c.id} id={`cmd-${c.id}`} role="option" aria-selected={i === active}>
                <button
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(c)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${i === active ? 'bg-slate-100 dark:bg-white/10' : ''}`}
                >
                  <Icon size={16} className={MUTED} aria-hidden="true" />
                  <span className="flex-1 truncate font-medium">{c.label}</span>
                  <span className={`text-xs ${MUTED}`}>{c.hint}</span>
                  {i === active && <CornerDownLeft size={13} className={MUTED} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
