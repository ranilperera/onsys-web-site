import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumb, type Crumb } from './Breadcrumb';

export interface HeroCta {
  label: string;
  href: string;
}

interface PageHeroProps {
  /** Background photograph. Without one the hero falls back to a navy gradient. */
  image?: string | null;
  crumbs?: Crumb[];
  /** Short qualifying line, shown as the pill above the title. */
  eyebrow?: ReactNode;
  /** Free-form row above the title, for content that is not a pill (article byline). */
  meta?: ReactNode;
  title?: ReactNode;
  lede?: ReactNode;
  /** First is the primary button, the rest are outline buttons. */
  ctas?: HeroCta[];
  /** Extra content between the lede and the buttons. */
  children?: ReactNode;
  /** 'long' for full-sentence titles, 'slim' for a breadcrumb-only strip. */
  size?: 'default' | 'long' | 'slim';
  /** The photo is already dark, so the scrim covers the copy side only. */
  darkPhoto?: boolean;
  /** Use the 740px article column instead of the full page width. */
  articleWidth?: boolean;
  style?: CSSProperties;
  /** Key figures shown in a card beside the copy (service pages). */
  facts?: { label: string; value: string }[];
  /** Small print under the facts, e.g. "Prices exclude GST". */
  factsNote?: string;
}

/**
 * The header band every inner page opens with. The home page uses the same
 * styles at a larger size through the hero block (BlockRenderer / HeroRotator).
 */
export function PageHero({
  image,
  crumbs,
  eyebrow,
  meta,
  title,
  lede,
  ctas,
  children,
  size = 'default',
  darkPhoto = false,
  articleWidth = false,
  style,
  facts,
  factsNote,
}: PageHeroProps) {
  const hasFacts = !!facts && facts.length > 0;
  const classes = ['hero'];
  if (size !== 'default') classes.push(`hero--${size}`);
  if (darkPhoto && image) classes.push('hero--dark-photo');
  if (hasFacts) classes.push('hero--facts');

  return (
    <section className={classes.join(' ')} style={style}>
      {image && (
        <>
          {/* priority: this is the LCP element on every inner page. */}
          <Image className="hero-bg" src={image} alt="" fill priority sizes="100vw" quality={80} />
          <div className="hero-scrim" aria-hidden="true" />
        </>
      )}
      <div
        className={articleWidth ? 'wrap article-wrap' : hasFacts ? 'wrap hero-facts-grid' : 'wrap'}
      >
        {crumbs && crumbs.length > 0 && <Breadcrumb items={crumbs} />}
        <div className="hero-main">
          {eyebrow && (
            <span className="eyebrow-pill">
              <span className="dot" aria-hidden="true" />
              {eyebrow}
            </span>
          )}
          {meta}
          {title && <h1>{title}</h1>}
          {lede && <p className="lede">{lede}</p>}
          {children}
          {ctas && ctas.length > 0 && (
            <div className="hero-cta">
              {ctas.map((cta, i) => {
                const cls = `btn ${i === 0 ? 'btn-primary' : 'btn-outline'}`;
                // Internal routes get client-side navigation; anchors and
                // external links stay plain.
                return cta.href.startsWith('/') ? (
                  <Link key={cta.href + i} className={cls} href={cta.href}>
                    {cta.label}
                  </Link>
                ) : (
                  <a key={cta.href + i} className={cls} href={cta.href}>
                    {cta.label}
                  </a>
                );
              })}
            </div>
          )}
        </div>
        {hasFacts && (
          <aside className="hero-facts" aria-label="At a glance">
            <p className="hero-facts-title">At a glance</p>
            <dl>
              {facts!.map((fact, i) => (
                <div key={`${fact.label}-${i}`}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
            {factsNote && <p className="hero-facts-note">{factsNote}</p>}
          </aside>
        )}
      </div>
    </section>
  );
}
