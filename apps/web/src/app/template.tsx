'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Per-route template — Next.js re-mounts this on every navigation, so it gives
 * each tab a smooth fade + lift enter transition. Respects reduced-motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
