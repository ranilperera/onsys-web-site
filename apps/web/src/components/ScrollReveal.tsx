'use client';

import { useEffect } from 'react';

/**
 * Fades sections and cards up as they scroll into view.
 *
 * Content is fully visible without JavaScript: the hidden starting state only
 * applies once this has run and tagged the elements, and it is skipped for
 * anyone who has asked their system for reduced motion.
 */
const TARGETS = [
  '.section-head',
  '.mcard',
  '.price-card',
  '.step',
  '.tech-card',
  '.logo-tile',
  '.related-service',
  '.emergency-grid',
  '.faq-item',
].join(',');

export function ScrollReveal({ root = 'main' }: { root?: string }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const scope = document.querySelector(root) ?? document.body;
    const els = Array.from(scope.querySelectorAll<HTMLElement>(TARGETS));

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add('rv-in');
          io.unobserve(el);
          // Hand the element back to its own styles once it has arrived, so
          // card hover lifts and transitions work as normal afterwards.
          const delay = parseInt(el.style.getPropertyValue('--rv-delay'), 10) || 0;
          window.setTimeout(() => {
            el.classList.remove('rv', 'rv-in');
            el.style.removeProperty('--rv-delay');
          }, 650 + delay);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    for (const el of els) {
      // Stagger siblings in a row so a grid ripples in rather than popping.
      const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
      el.style.setProperty('--rv-delay', `${(siblings.indexOf(el) % 4) * 70}ms`);
      el.classList.add('rv');
      io.observe(el);
    }

    return () => {
      io.disconnect();
      for (const el of els) el.classList.remove('rv', 'rv-in');
    };
  }, [root]);

  return null;
}
