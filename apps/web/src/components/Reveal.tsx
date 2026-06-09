'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Lightweight IntersectionObserver scroll-reveal wrapper. */
export default function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('in');
      return;
    }
    const reveal = () => {
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add('in');
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            reveal();
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    // Safety net: never let content stay invisible if the observer never fires
    // (e.g. JS-driven viewport capture, atypical scroll containers).
    const fallback = setTimeout(reveal, 2600);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, [delay]);

  const Comp = Tag as 'div';
  return (
    <Comp ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${className}`} style={style}>
      {children}
    </Comp>
  );
}
