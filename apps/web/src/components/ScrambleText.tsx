'use client';

import { useEffect, useRef, useState } from 'react';

const GLYPHS = '01<>/\\{}[]=+*#$%&_ABCDEFagent.neurons';

/** Decodes text with a brief glyph-scramble — the "resolving…" feel. */
export default function ScrambleText({
  text,
  className = '',
  duration = 900,
  trigger = 'mount',
}: {
  text: string;
  className?: string;
  duration?: number;
  trigger?: 'mount' | 'hover';
}) {
  const [out, setOut] = useState(trigger === 'mount' ? '' : text);
  const raf = useRef(0);

  const run = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOut(text);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(t * text.length);
      let s = '';
      for (let i = 0; i < text.length; i++) {
        if (i < revealed || text[i] === ' ' || text[i] === '.') s += text[i];
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (trigger === 'mount') run();
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <span
      className={className}
      onMouseEnter={trigger === 'hover' ? run : undefined}
    >
      {out || ' '}
    </span>
  );
}
