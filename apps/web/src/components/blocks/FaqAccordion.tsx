'use client';

import { useState } from 'react';

/**
 * Accessible accordion. The answers stay in the DOM (hidden via max-height)
 * rather than being conditionally rendered, so crawlers and AI assistants can
 * read every answer — which is the whole point of publishing FAQs for AEO.
 */
export function FaqAccordion({ items }: { items: Array<{ question: string; answer: string }> }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <div className="faq">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div className={`faq-item${isOpen ? ' open' : ''}`} key={item.question}>
            <h3 style={{ margin: 0 }}>
              <button
                className="faq-q"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${i}`}
                id={`faq-question-${i}`}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <span>{item.question}</span>
                <span className="plus" aria-hidden="true">
                  +
                </span>
              </button>
            </h3>
            <div className="faq-a" id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`}>
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
