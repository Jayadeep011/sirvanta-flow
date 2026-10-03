// src/components/marketing/Reveal.jsx
// Fades content up as it scrolls into view. Respects "reduce motion".

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay }}
    >
      {children}
    </motion.div>
  );
}
