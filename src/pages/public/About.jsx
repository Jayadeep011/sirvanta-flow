// src/pages/public/About.jsx
// Company story, mission and philosophy. Edit the wording to match your own story before launch.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Scale, ShieldCheck } from 'lucide-react';
import { useT } from '../../i18n';
import Reveal from '../../components/marketing/Reveal';
import { CARD, MUTED, GOLD_TEXT, BTN_GOLD, BTN_OUTLINE, CONTAINER } from '../../ui';

const VALUES = [
  [Eye, 'Show the math', 'Every number in the product has a formula you can read and an example you can check. If we cannot explain a figure, it does not ship.'],
  [ShieldCheck, 'Keep it yours', 'Financial records belong to the person who earned them. We design for data that stays on your device, and we are plain about the exceptions.'],
  [Scale, 'Be honest about limits', 'Our tools are planning aids, not advice. We label estimates as estimates and tell you when a professional should check the answer.'],
];

export default function About() {
  const navigate = useNavigate();
  const t = useT();
  return (
    <>
      <section className="hero-glow">
        <div className={`${CONTAINER} pb-12 pt-16`}>
          <Reveal>
            <p className={`text-sm font-semibold ${GOLD_TEXT}`}>About Sirvanta</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Built for people whose income does not arrive on a schedule.</h1>
          </Reveal>
        </div>
      </section>

      <section className={`${CONTAINER} grid gap-10 pb-14 lg:grid-cols-[1.2fr_1fr]`}>
        <Reveal>
          <div className="space-y-5 text-lg leading-relaxed">
            <p>Freelancers, consultants and agency owners earn well and still feel uneasy about money. A great month and a thin month look the same in a bank app, and the tax bill arrives either way.</p>
            <p className={MUTED}>Sirvanta Flow began as an answer to a simple question: what is actually safe to spend today? Answering it honestly means setting tax aside the moment money arrives, smoothing uneven income into a steady draw, and knowing which clients earn their keep.</p>
            <p className={MUTED}>Sirvanta Global builds software around that question. We keep the math visible, the data local, and the interface calm, so that a finance tool feels less like homework and more like a clear head.</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className={`${CARD} p-6`}>
            <h2 className="text-lg font-semibold">Our mission</h2>
            <p className={`mt-3 leading-relaxed ${MUTED}`}>Give every independent professional the financial clarity of a company with a full-time CFO, without the cost, the spreadsheets, or the surprise bills.</p>
          </div>
        </Reveal>
      </section>

      <section className={`${CONTAINER} pb-14`}>
        <h2 className="text-2xl font-bold tracking-tight">What we believe</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {VALUES.map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 0.05}>
              <div className={`${CARD} h-full p-6`}>
                <Icon size={22} className={GOLD_TEXT} aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER} pb-24`}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={() => navigate('/app/dashboard')} className={BTN_GOLD}>{t('pub.launch')}</button>
          <button onClick={() => navigate('/features')} className={BTN_OUTLINE}>{t('pub.features')}</button>
        </div>
      </section>
    </>
  );
}
