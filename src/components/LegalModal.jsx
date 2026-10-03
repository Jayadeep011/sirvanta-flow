// src/components/LegalModal.jsx
// Plain-language Terms and Privacy summaries. Have a lawyer review these before launch.

import React from 'react';
import { Check } from 'lucide-react';
import Modal from './Modal';
import { MUTED, GOLD_TEXT, BTN_GOLD } from '../ui';

const LEGAL = {
  terms: {
    title: 'Terms of Service',
    points: [
      'Sirvanta Flow provides calculators and AI-generated analysis for planning. It is not tax, legal, accounting, or investment advice.',
      'You are responsible for the figures you enter and for your own tax filings and payments.',
      'AI output can contain errors. Confirm important numbers with a licensed professional before acting on them.',
      'Paid plans are billed monthly or yearly and can be cancelled at any time.',
      'We may update these terms. Continuing to use the service after an update means you accept the change.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    points: [
      "Your transactions, clients, invoices, and settings are stored in your browser's local database on your device.",
      'When you use AI features, the text you submit and a summary of the figures needed to answer are sent through our server function to an AI provider, which processes them under its own terms.',
      'Clearing your browser data deletes your local records. Export a backup from Settings to keep a copy.',
      'Questions about your data can be sent to the contact address listed in your account.',
    ],
  },
};

export default function LegalModal({ kind, onClose }) {
  const content = LEGAL[kind];
  return (
    <Modal title={content.title} onClose={onClose}>
      <ul className={`mt-4 space-y-3 text-sm leading-relaxed ${MUTED}`}>
        {content.points.map((p) => (
          <li key={p} className="flex gap-2"><Check size={16} className={`mt-0.5 shrink-0 ${GOLD_TEXT}`} aria-hidden="true" />{p}</li>
        ))}
      </ul>
      <button onClick={onClose} className={`${BTN_GOLD} mt-6 w-full`}>Close</button>
    </Modal>
  );
}
