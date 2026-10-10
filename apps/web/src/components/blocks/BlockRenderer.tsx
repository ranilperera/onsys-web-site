import Link from 'next/link';
import type { ReactNode } from 'react';
import Image from 'next/image';
import type { Block } from '@onsys/shared';
import { siteConfig } from '@/lib/config';
import { FaqAccordion } from './FaqAccordion';
import { EmergencyCheckout } from './EmergencyCheckout';
import { HealthCheckBooking } from './HealthCheckBooking';
import { PlanEnquiry } from './PlanEnquiry';
import { ContactForm } from '../ContactForm';
import { HeroRotator } from '../HeroRotator';

/**
 * Maps CMS block JSON onto the markup/classes from the approved mockups.
 * Everything here is a server component except the two interactive blocks.
 */

/**
 * Renders the two bits of markup these plain-text CMS fields understand:
 * **bold** and [label](href). Everything else is left exactly as typed.
 *
 * The fields are plain text, so markdown otherwise reaches the page as
 * literal asterisks and brackets. This covers the two cases the copy actually
 * uses instead of pulling in a markdown renderer, and it emits React nodes, so
 * nothing here is ever parsed as HTML. An unclosed ** or [ is left as typed.
 */
function emphasise(text: string) {
  const token = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = token.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={m.index}>{m[1]}</strong>);
    } else {
      // Same-page jumps keep the plain anchor: next/link would prefetch a
      // route that does not exist and swallow the hash scroll.
      const href = m[3];
      out.push(
        href.startsWith('#') ? (
          <a key={m.index} href={href}>
            {m[2]}
          </a>
        ) : (
          <Link key={m.index} href={href}>
            {m[2]}
          </Link>
        ),
      );
    }
    last = m.index + m[0].length;
  }

  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function SectionHead({
  eyebrow,
  heading,
  body,
  centered,
}: {
  eyebrow?: string;
  heading?: string;
  body?: string;
  centered?: boolean;
}) {
  if (!eyebrow && !heading && !body) return null;

  // A blank line in the CMS field starts a new paragraph.
  const paragraphs =
    body
      ?.split(/\n\s*\n/)
      .map((para) => para.trim())
      .filter(Boolean) ?? [];

  /*
   * Section heads are capped at a 640px measure, which is the right line
   * length for the one-sentence intro almost every section carries. A head
   * that runs to several paragraphs is a different thing: at 640px it became
   * a tall column down the left with the rest of the row empty. So a
   * multi-paragraph head takes the full container width and sets its
   * paragraphs side by side, which fills the row and keeps each column near
   * the same measure it had before. Single-paragraph heads are untouched.
   */
  const wide = paragraphs.length > 1;

  return (
    <div className={`section-head${wide ? ' wide' : ''}${centered ? ' center' : ''}`}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      {heading && <h2>{heading}</h2>}
      {paragraphs.length > 0 && (
        <div className="section-head-body">
          {paragraphs.map((para) => (
            <p key={para.slice(0, 40)}>{emphasise(para)}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Cta({ label, href, variant }: { label: string; href: string; variant: string }) {
  const className = `btn ${variant}`;
  // tel: and mailto: hand off to the OS, so they need a plain anchor like an
  // external link — but without target="_blank", which would leave a dead tab.
  const isProtocolLink = /^(tel:|mailto:)/.test(href);
  const isExternal = href.startsWith('http');

  if (isProtocolLink) {
    return (
      <a className={className} href={href}>
        {label}
      </a>
    );
  }

  return isExternal ? (
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
 * Pick a glyph describing what kind of technology an entry is.
 *
 * Derived from the label rather than stored per chip: `platformChips` carries
 * 281 entries across the site, so hand-tagging every one would go stale the
 * moment someone adds a row. A chip can still set `icon` to override this.
 *
 * Order matters — the first match wins, so the specific cases (a migration
 * *to* a cloud, a replication feature *of* a database) are tested before the
 * general ones they would otherwise be swallowed by.
 */
const GLYPH_RULES: Array<[RegExp, string]> = [
  [/replicat|always ?on|data guard|\brac\b|cluster|mirror|log shipping|failover|standby|geo-replic|backup|rman|veeam|commvault|recovery|\bdr\b|continuity|dbvisit/i, 't-replicate'],
  [/→|->|\bmigrat|cross-platform|lift-and-shift|re-platform|\bto\s+(azure|aws|oracle cloud|edb|amazon|managed|postgres)/i, 't-migrate'],
  [/upgrade|service pack|hotfix|\bpatch|\bpsu\b|\bcpu\/|\bcus\b/i, 't-patch'],
  [/query|\bindex/i, 't-query'],
  [/tuning|performance|optimis|optimiz/i, 't-gauge'],
  [/firewall|fortinet|palo alto|check point|sophos|cisco|juniper|netgear|\bf5\b|\bvpc\b|vnet|transit gateway|load balancer|\bwaf\b|switching|routing|wifi|nginx|haproxy|network/i, 't-network'],
  [/secur|encrypt|\btde\b|vulnerab|threat|siem|\bsoc\b|incident|identity|\biam\b|\bsso\b|entra|active directory|ldap|keycloak|complian|iso\/|nist|\bpci\b|essential eight|privacy|apra|\brisk\b|governance|audit|breach|cis controls|\bitil\b|problem management/i, 't-lock'],
  [/table design|schema|data model|architecture|landing zone|blueprint/i, 't-schema'],
  [/vmware|hyper-v|\bkvm\b|citrix|vsphere|esxi|virtualis|virtualiz/i, 't-layers'],
  [/netapp|dell|\bhpe\b|hitachi|\bibm\b|\bsan\b|\bnas\b|storage|fibre channel|iscsi|\bnfs\b|\bcifs\b|appliance|physical host/i, 't-server'],
  [/docker|kubernetes|jenkins|ansible|\bgit\b|ci\/cd|devops|container/i, 't-container'],
  [/monitor|prometheus|checkmk|\brmm\b|alerting|grafana|analytics|crash/i, 't-pulse'],
  [/power bi|ssrs|ssas|report|dashboard|\bbi\b|\bmds\b/i, 't-chart'],
  [/ssis|data factory|\betl\b|integration|wso2|event-driven|flat file|sftp|pipeline/i, 't-pipeline'],
  [/\bapi\b|apis|rest|soap|microservice|webhook/i, 't-api'],
  [/react native|flutter|swift|android|\bios\b|mobile|app store|play store|push notification/i, 't-mobile'],
  [/react|next\.js|angular|typescript|frontend|browser/i, 't-browser'],
  [/python|\bjava\b|node|\bphp\b|django|laravel|spring|\.net|software|development|weblogic|tomcat|modernis|moderniz/i, 't-code'],
  [/windows server|linux|rhel|centos|ubuntu|solaris|\baix\b|hp-ux|administration|group policy|microsoft 365|apache|group replication/i, 't-terminal'],
  [/cloud|azure|\baws\b|\boci\b|autonomous|app service|functions|sentinel|control tower|\brds\b/i, 't-cloud'],
  [/oracle|sql server|postgres|mysql|mariadb|mongo|\bedb\b|database|\bsql\b/i, 't-database'],
];

function techGlyph(label: string, explicit?: string): string {
  if (explicit) return explicit;
  for (const [pattern, id] of GLYPH_RULES) if (pattern.test(label)) return id;
  return 't-cluster';
}

/**
 * Tint a technology glyph with its own accent colour, over a faint wash of the
 * same hue. The wash is an 8-digit hex, so it is only applied when the stored
 * colour is a plain 6-digit hex — anything else falls back to a neutral chip
 * rather than emitting an invalid colour.
 */
function glyphStyle(color: string): React.CSSProperties {
  const isHex6 = /^#[0-9a-f]{6}$/i.test(color);
  return isHex6
    ? { color, backgroundColor: `${color}14`, borderColor: `${color}33` }
    : { color: 'var(--navy)' };
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <BlockSwitch key={`${block.type}-${i}`} block={block} index={i} />
      ))}
    </>
  );
}

function BlockSwitch({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    case 'hero': {
      // A hero carrying extra variants rotates; one without behaves exactly as
      // it always has, and stays a server component.
      if (block.slides.length > 0) {
        return (
          <HeroRotator
            intervalSeconds={siteConfig.heroRotateSeconds}
            slides={[
              {
                eyebrow: block.eyebrow,
                heading: block.heading,
                highlight: block.highlight,
                body: block.body,
                platforms: block.platforms,
                backgroundImage: block.backgroundImage,
                ctas: block.ctas,
              },
              ...block.slides,
            ]}
          />
        );
      }
      return (
        <section className={`hero${block.backgroundImage ? ' hero-dark' : ''}${block.videoUrl ? '' : ' hero-single'}`}>
          {block.backgroundImage && (
            <>
              {/* next/image gives responsive AVIF/WebP variants of the photo;
                  priority because this is the LCP element. */}
              <Image
                className="hero-bg"
                src={block.backgroundImage}
                alt=""
                fill
                priority
                sizes="100vw"
                quality={80}
              />
              <div className="hero-scrim" aria-hidden="true" />
            </>
          )}
          <div className={`wrap hero-grid${block.videoUrl ? '' : ' single'}`}>
            <div>
              {block.eyebrow && (
                <span className="eyebrow-pill">
                  <span className="dot" aria-hidden="true" />
                  {block.eyebrow}
                </span>
              )}
              <h1>
                {block.heading} {block.highlight && <span>{block.highlight}</span>}
              </h1>
              {block.body && <p>{block.body}</p>}
              {block.ctas.length > 0 && (
                <div className="hero-cta">
                  {block.ctas.map((cta, i) => (
                    <Cta
                      key={cta.href + i}
                      {...cta}
                      variant={i === 0 ? 'btn-primary' : 'btn-outline'}
                    />
                  ))}
                </div>
              )}
            </div>
            {block.videoUrl && (
              <div className="hero-video">
                <div className="video-frame">
                  <div className="ratio">
                    <iframe
                      src={block.videoUrl}
                      title="Onsys Technologies overview"
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'quicklinks':
      return (
        <section className="quicklinks">
          <div className="wrap">
            <div className="ql-grid">
              {block.items.map((item) => (
                <Link className="ql-item" href={item.href} key={item.label}>
                  <div className="ql-ic" style={{ background: item.color }}>
                    <svg width="24" height="24" aria-hidden="true">
                      <use href={item.icon} />
                    </svg>
                  </div>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cardGrid':
      return (
        <section className={block.altBackground ? 'alt-bg' : undefined} id={block.anchor}>
          <div className="wrap">
            <SectionHead
              eyebrow={block.eyebrow}
              heading={block.heading}
              body={block.body}
              centered={block.centered}
            />
            {/* Column count is a class, not an inline style — an inline
                grid-template-columns outranks the responsive media queries and
                would keep 4 columns on a phone. */}
            <div className={`card-grid${block.columns !== 3 ? ` cols-${block.columns}` : ''}`}>
              {block.cards.map((card) => (
                <article className="mcard" key={card.title}>
                  {card.icon && (
                    <div className="cover" style={{ background: card.coverColor ?? '#EAF1FB' }}>
                      <svg aria-hidden="true">
                        <use href={card.icon} />
                      </svg>
                    </div>
                  )}
                  {card.tag && <div className="tag">{card.tag}</div>}
                  <div className={`body${card.tag ? '' : ' notag'}`}>
                    <h3>{card.title}</h3>
                    {/* Same element and class the /case-studies index uses for
                        its attribution and platform lines, so a grid that
                        mirrors those cards is styled by one rule rather than
                        two that drift. */}
                    {card.meta && <p className="lead-source">{card.meta}</p>}
                    <p>{card.body}</p>
                    {card.chips && card.chips.length > 0 && (
                      <p className="lead-source">{card.chips.join(' · ')}</p>
                    )}
                    {card.link && (
                      <Link className="lnk" href={card.link.href}>
                        {card.link.label} ›
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      );

    case 'checkList':
      return (
        <section className={index % 2 === 1 ? 'alt-bg' : undefined} id={block.anchor}>
          <div className={`wrap${block.sidebar ? ' split' : ''}`}>
            <div>
              <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} />
              <ul className="check-list">
                {block.items.map((item) => (
                  <li key={item}>
                    <svg aria-hidden="true">
                      <use href="#s-check" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {block.sidebar && (
              <aside className="side-card">
                <h4>{block.sidebar.title}</h4>
                <ul>
                  {block.sidebar.rows.map((row) => (
                    <li key={row.label}>
                      <span>{row.label}</span>
                      <b>{row.value}</b>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </section>
      );

    case 'steps':
      return (
        <section id={block.anchor}>
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />
            <div className="steps">
              {block.steps.map((step) => (
                <div className="step" key={step.title}>
                  <h4>{step.title}</h4>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'pricing':
      return (
        <section className={block.altBackground ? 'alt-bg' : undefined} id={block.anchor ?? 'pricing'}>
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />
            <div className={block.columns === 3 ? 'price-grid-3' : 'price-grid'}>
              {block.plans.map((plan) => (
                <div className={`price-card${plan.featured ? ' featured' : ''}`} key={plan.name}>
                  {plan.badge && <span className="badge">{plan.badge}</span>}
                  <h3>{plan.name}</h3>
                  <div className="price">
                    <b>{plan.price}</b>
                    {plan.unit && <span className="unit">{plan.unit}</span>}
                  </div>
                  {plan.description && <p className="plan-desc">{plan.description}</p>}
                  {plan.featuresTitle && <h4 className="plan-feat-title">{plan.featuresTitle}</h4>}
                  <ul>
                    {plan.features.map((f) => {
                      const key = typeof f === 'string' ? f : f.label;
                      return (
                        <li key={key}>
                          <svg aria-hidden="true">
                            <use href="#s-check" />
                          </svg>
                          {typeof f === 'string' ? (
                            f
                          ) : (
                            <span>
                              <b>{f.label}</b> {f.text}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {/* The enquiry is the primary action where a plan asks for
                      one; the link stays underneath, because some people want
                      the detail before they want a conversation. */}
                  {plan.enquiry && <PlanEnquiry plan={plan.name} />}
                  <Cta
                    {...plan.cta}
                    variant={`${
                      plan.featured && !plan.enquiry ? 'btn-primary' : 'btn-outline'
                    } btn-block`}
                  />
                </div>
              ))}
            </div>
            {block.note && <div className="price-note">{block.note}</div>}
          </div>
        </section>
      );

    case 'productGrid':
      return (
        <section className={block.altBackground ? 'alt-bg' : undefined} id={block.anchor}>
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />
            <div className="product-grid">
              {block.products.map((product) => (
                <article className="product-card" key={product.name}>
                  {product.badge && <span className="badge">{product.badge}</span>}
                  {product.icon && (
                    <div className="cover" style={{ background: product.coverColor ?? '#EAF1FB' }}>
                      <svg aria-hidden="true">
                        <use href={product.icon} />
                      </svg>
                    </div>
                  )}
                  <div className="pc-body">
                    <h3>{product.name}</h3>
                    {product.tagline && <p className="pc-tagline">{product.tagline}</p>}
                    <p className="pc-desc">{product.body}</p>
                    {product.features.length > 0 && (
                      <ul>
                        {product.features.map((feature) => (
                          <li key={feature}>
                            <svg aria-hidden="true">
                              <use href="#s-check" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Actions sit in their own row so they line up across cards
                      whatever the feature count. */}
                  <div className="pc-actions">
                    <Cta {...product.cta} variant="btn-primary btn-block" />
                    {product.secondaryCta && (
                      <Cta {...product.secondaryCta} variant="btn-outline btn-block" />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      );

    case 'logoGrid':
      return (
        <section className={block.altBackground ? 'alt-bg' : undefined} id={block.anchor}>
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />
            <ul className="logo-grid">
              {block.logos.map((logo) => (
                <li className="logo-tile" key={logo.name}>
                  {logo.image ? (
                    // Plain <img>: the set mixes SVG and raster, and next/image
                    // refuses SVG without dangerouslyAllowSVG.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.image} alt={logo.alt ?? `${logo.name} badge`} loading="lazy" />
                  ) : (
                    <div className="logo-fallback" aria-hidden="true">
                      <svg>
                        <use href="#s-check" />
                      </svg>
                    </div>
                  )}
                  <span className="logo-name">{logo.name}</span>
                  {logo.issuer && <span className="logo-issuer">{logo.issuer}</span>}
                </li>
              ))}
            </ul>
            {block.note && <div className="price-note">{block.note}</div>}
          </div>
        </section>
      );

    case 'faq':
      return (
        <section>
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} />
            <FaqAccordion items={block.items} />
          </div>
        </section>
      );

    case 'stats':
      return (
        <section className="stats">
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} centered />
            <div className="stat-grid">
              {block.stats.map((s) => (
                <div className="stat-item" key={s.label}>
                  <b>{s.value}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'testimonial':
      return (
        <section className={`section${block.altBackground ? ' alt-bg' : ''}`} id={block.anchor}>
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />
            <div className="quote-grid">
              {block.quotes.map((q) => (
                /* A <blockquote> with a <cite>, not a styled div: the quote and
                   who said it are a semantic pair, and a screen reader should
                   announce them as one. */
                <blockquote className="quote-card" key={q.attribution + q.quote.slice(0, 24)}>
                  <p>{q.quote}</p>
                  <footer>
                    {q.logo && (
                      <Image src={q.logo} alt="" width={96} height={32} className="quote-logo" />
                    )}
                    <cite>{q.attribution}</cite>
                    {q.context && <span className="quote-context">{q.context}</span>}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      );

    case 'platformChips':
      return (
        <section className="alt-bg" id={block.anchor}>
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />
            <div className="tech-groups">
              {block.groups.map((group) => (
                <div className="tech-card" key={group.title}>
                  <h3 className="tech-card-title">{group.title}</h3>
                  <ul className="tech-list">
                    {group.chips.map((chip) => (
                      <li key={chip.label}>
                        <span className="tech-glyph" style={glyphStyle(chip.color)} aria-hidden="true">
                          <svg>
                            <use href={`#${techGlyph(chip.label, chip.icon)}`} />
                          </svg>
                        </span>
                        <span className="tech-label">{chip.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Previously a narrow aside beside a tall column of pills, which
                left most of the row empty. As a full-width band it balances the
                grid above and stays readable on one line per point. */}
            {block.sidebar && (
              <aside className="tech-note">
                <h4>{block.sidebar.title}</h4>
                <ul>
                  {block.sidebar.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </section>
      );

    case 'richText':
      return (
        <section>
          <div className="wrap article-wrap">
            {block.heading && <h2>{block.heading}</h2>}
            {/* Sanitised server-side by the admin API before storage. */}
            <div className="article-body" dangerouslySetInnerHTML={{ __html: block.html }} />
          </div>
        </section>
      );

    case 'ctaBand':
      return (
        <div className="cta-band">
          <div className="wrap">
            <h2>{block.heading}</h2>
            {block.body && <p>{block.body}</p>}
            <Cta {...block.cta} variant="btn-white" />
          </div>
        </div>
      );

    case 'contactForm':
      return (
        <section>
          <div className="wrap">
            <ContactForm heading={block.heading} body={block.body} />
          </div>
        </section>
      );

    case 'healthCheckBooking':
      return (
        <HealthCheckBooking
          eyebrow={block.eyebrow}
          heading={block.heading}
          body={block.body}
          note={block.note}
        />
      );

    case 'relatedService':
      return (
        <section className="section">
          <div className="wrap">
            <aside className="related-service">
              {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
              <h2>{block.heading}</h2>
              <p>{block.body}</p>
              <Cta label={block.cta.label} href={block.cta.href} variant="btn-primary" />
            </aside>
          </div>
        </section>
      );

    case 'emergencyCheckout':
      return (
        <EmergencyCheckout
          mode={block.mode}
          eyebrow={block.eyebrow}
          heading={block.heading}
          body={block.body}
          summary={block.summary}
          steps={block.steps}
        />
      );

    default:
      return null;
  }
}
