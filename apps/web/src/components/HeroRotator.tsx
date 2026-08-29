'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface HeroSlide {
  eyebrow?: string;
  heading: string;
  highlight?: string;
  body?: string;
  platforms?: string;
  backgroundImage?: string;
  ctas: Array<{ label: string; href: string }>;
}

function Cta({ label, href, variant }: { label: string; href: string; variant: string }) {
  const className = `btn ${variant}`;
  if (/^(tel:|mailto:)/.test(href)) {
    return (
      <a className={className} href={href}>
        {label}
      </a>
    );
  }
  return href.startsWith('http') ? (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  ) : (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}

/**
 * Rotating homepage hero.
 *
 * Every slide is server-rendered into the markup and switched with CSS, not
 * mounted on demand — so the first paint and anything without JavaScript still
 * show slide one, and a crawler reads all of the copy rather than whichever
 * variant a timer happened to land on.
 *
 * Rotation stops when the visitor is plausibly reading or interacting: on
 * hover, on keyboard focus inside the hero, while the tab is hidden, and
 * permanently once someone uses the dots. `prefers-reduced-motion` disables it
 * outright, as does an interval of 0.
 */
export function HeroRotator({
  slides,
  intervalSeconds,
}: {
  slides: HeroSlide[];
  intervalSeconds: number;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // Set once a visitor picks a slide; auto-rotation never resumes after that.
  const [manual, setManual] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  const count = slides.length;
  const go = useCallback((index: number) => setActive(((index % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || intervalSeconds <= 0 || paused || manual) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setInterval(() => setActive((i) => (i + 1) % count), intervalSeconds * 1000);
    return () => window.clearInterval(id);
  }, [count, intervalSeconds, paused, manual]);

  // A timer that keeps running in a background tab wastes work and means the
  // visitor returns to a slide that changed while they were not looking.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      setManual(true);
      go(active + 1);
    }
    if (event.key === 'ArrowLeft') {
      setManual(true);
      go(active - 1);
    }
  };

  return (
    <section
      ref={rootRef}
      className="hero hero-dark hero-single hero-rotator"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
      aria-roledescription="carousel"
      aria-label="Onsys Technologies"
    >
      {slides.map((slide, i) => (
        <div key={slide.heading} className={`hero-slide${i === active ? ' is-active' : ''}`}>
          {slide.backgroundImage && (
            <>
              <Image
                className="hero-bg"
                src={slide.backgroundImage}
                alt=""
                fill
                // Only the first slide is the LCP candidate; eager-loading the
                // rest would compete with it for bandwidth on first paint.
                priority={i === 0}
                loading={i === 0 ? undefined : 'lazy'}
                sizes="100vw"
                quality={80}
              />
              <div className="hero-scrim" aria-hidden="true" />
            </>
          )}
        </div>
      ))}

      <div className="wrap hero-grid single">
        {slides.map((slide, i) => (
          <div
            key={slide.heading}
            className={`hero-copy${i === active ? ' is-active' : ''}`}
            // Hidden slides are removed from the accessibility tree and from
            // tab order, so a screen reader and the Tab key only ever meet the
            // slide that is actually on screen.
            aria-hidden={i === active ? undefined : true}
            inert={i !== active}
          >
            {slide.eyebrow && (
              <span className="eyebrow-pill">
                <span className="dot" aria-hidden="true" />
                {slide.eyebrow}
              </span>
            )}
            {/* Exactly one h1 per document. Every slide is in the markup, so
                making them all h1 would give the homepage three competing
                headings; the rotation is presentational, and the first slide is
                the page's actual heading. Later slides use the same visual
                treatment through .hero-heading. */}
            {i === 0 ? (
              <h1>
                {slide.heading} {slide.highlight && <span>{slide.highlight}</span>}
              </h1>
            ) : (
              <p className="hero-heading">
                {slide.heading} {slide.highlight && <span>{slide.highlight}</span>}
              </p>
            )}
            {slide.body && <p>{slide.body}</p>}
            {slide.platforms && <p className="hero-platforms">{slide.platforms}</p>}
            {slide.ctas.length > 0 && (
              <div className="hero-cta">
                {slide.ctas.map((cta, n) => (
                  <Cta key={cta.href + n} {...cta} variant={n === 0 ? 'btn-primary' : 'btn-outline'} />
                ))}
              </div>
            )}
          </div>
        ))}

        {count > 1 && (
          <div className="hero-dots" role="tablist" aria-label="Choose a message">
            {slides.map((slide, i) => (
              <button
                key={slide.heading}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={slide.heading}
                className={`hero-dot${i === active ? ' is-active' : ''}`}
                onClick={() => {
                  setManual(true);
                  go(i);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
