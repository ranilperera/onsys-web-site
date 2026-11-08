import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import type { Block } from '@onsys/shared';
import { siteConfig } from '@/lib/config';
import { FaqAccordion } from './FaqAccordion';
import { EmergencyCheckout } from './EmergencyCheckout';
import { HealthCheckBooking } from './HealthCheckBooking';
import { PlanEnquiry } from './PlanEnquiry';
import { OnCallSubscribe } from './OnCallSubscribe';
import { ContactForm } from '../ContactForm';
import { HeroRotator } from '../HeroRotator';
import { TechGroups, type TechGroupView } from './TechGroups';
import { HealthChecks } from './HealthChecks';

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
 * Service page for a platform entry, read from its label like the glyph is,
 * so new entries pick up a link without anyone tagging them. First match wins;
 * an entry with no match simply isn't a link. A chip's own `href` overrides it.
 */
const LINK_RULES: Array<[RegExp, string]> = [
  [
    /replicat|always ?on|data guard|rac|cluster|log shipping|failover|backup|rman|recovery|dr/i,
    '/database-upgrades-migrations-dr',
  ],
  [/migrat/i, '/cloud-migrations'],
  [/encrypt|tde|data protection/i, '/data-and-application-security'],
  [/firewall|network/i, '/network-and-firewalls'],
  [/vmware|hyper-v|virtualis|virtualiz|storage|san/i, '/virtualization-and-storage'],
  [/complian|governance|essential eight|iso\//i, '/grc-and-compliance'],
  [/secur|threat|siem|soc/i, '/managed-security-services'],
  [/ssis|ssrs|ssas|etl|integration|reporting/i, '/integration-services'],
  [/azure sql|managed instance/i, '/managed-database-services'],
  [/cloud|azure|aws|amazon web|oci/i, '/cloud-consultancy'],
  [/windows server|linux|solaris|aix|hp-ux/i, '/system-administration'],
  [/sql server/i, '/sql-server-dba-services'],
  [/postgres|edb/i, '/postgresql-consulting-services'],
  [/mysql|mariadb/i, '/mysql-consulting-services'],
  [/oracle|mongo|database/i, '/managed-database-services'],
];

function techHref(label: string, explicit?: string): string | undefined {
  if (explicit !== undefined) return explicit || undefined;
  for (const [pattern, href] of LINK_RULES) if (pattern.test(label)) return href;
  return undefined;
}

/** Icon for a whole group, read from its title. */
function groupGlyph(title: string): string {
  if (/availab|resilien|continuity|recovery/i.test(title)) return 't-replicate';
  if (/cloud|infrastructure/i.test(title)) return 't-cloud';
  if (/secur|complian/i.test(title)) return 't-lock';
  if (/database|platform/i.test(title)) return 't-database';
  return techGlyph(title);
}

/**
 * Icon for a relatedService callout, read from its eyebrow and heading. Two
 * cases the technology rules would get wrong come first: access and
 * sovereignty copy mentions "database" but is about who holds the keys, and
 * proof/case-study callouts are about evidence, not a technology.
 */
function calloutGlyph(text: string): string {
  if (/sovereign|access|credential|who touches|privacy/i.test(text)) return 't-lock';
  if (/proof|case stud|what we (actually )?built|engagement/i.test(text)) return 't-chart';
  return techGlyph(text);
}

export function BlockRenderer({
  blocks,
  startIndex = 0,
}: {
  blocks: Block[];
  startIndex?: number;
}) {
  // startIndex lets a page render its blocks in two runs (with its own
  // section in between) without upsetting the alternating backgrounds.
  return (
    <>
      {blocks.map((block, i) => (
        <BlockSwitch key={`${block.type}-${startIndex + i}`} block={block} index={startIndex + i} />
      ))}
    </>
  );
}

type LogoGridBlock = Extract<Block, { type: 'logoGrid' }>;
type CardGridBlock = Extract<Block, { type: 'cardGrid' }>;

/** "$1,500/mo" → ["$1,500", "per month"]; anything else is shown as given. */
function splitPrice(tag?: string): [string, string | null] {
  if (!tag) return ['', null];
  const m = tag.match(/^(.+?)\s*\/\s*(mo|month|hr|hour|yr|year)$/i);
  if (!m) return [tag, null];
  const unit = m[2].toLowerCase();
  const word = unit.startsWith('mo') ? 'month' : unit.startsWith('h') ? 'hour' : 'year';
  return [m[1], `per ${word}`];
}

/** Price cards: the figure leads, inclusions are ticked, the link is a button. */
function PlanGrid({ block }: { block: CardGridBlock }) {
  return (
    <section className={block.altBackground ? 'alt-bg' : undefined} id={block.anchor}>
      <div className="wrap">
        <SectionHead
          eyebrow={block.eyebrow}
          heading={block.heading}
          body={block.body}
          centered={block.centered}
        />
        <div className="plan-grid" style={{ '--plan-count': block.cards.length } as CSSProperties}>
          {block.cards.map((card) => {
            const [price, unit] = splitPrice(card.tag);
            return (
              <article className="plan-card" key={card.title}>
                <h3>{card.title}</h3>
                {price && (
                  <p className="plan-price">
                    <b>{price}</b>
                    {unit && <span>{unit}</span>}
                  </p>
                )}
                {card.body && <p className="plan-sum">{card.body}</p>}
                {card.points && card.points.length > 0 && (
                  <ul className="plan-points">
                    {card.points.map((point) => (
                      <li key={point}>
                        <svg aria-hidden="true">
                          <use href="#s-check" />
                        </svg>
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
                {card.link && (
                  <Link className="btn btn-outline plan-btn" href={card.link.href}>
                    {card.link.label}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
        <p className="plan-note">All prices exclude GST. Monthly, rolling — no lock-in contract.</p>
      </div>
    </section>
  );
}

/**
 * Choices a visitor picks between, e.g. "on a plan / on-call / no agreement".
 * The card whose link stays on this page is the main action and is drawn as
 * one; the others lead elsewhere and get a quieter button.
 */
function RouteGrid({ block }: { block: CardGridBlock }) {
  return (
    <section className={`routes${block.altBackground ? ' alt-bg' : ''}`} id={block.anchor}>
      <div className="wrap">
        <SectionHead
          eyebrow={block.eyebrow}
          heading={block.heading}
          body={block.body}
          centered={block.centered}
        />
        <div className="route-grid" style={{ '--route-count': block.cards.length } as CSSProperties}>
          {block.cards.map((card, i) => {
            const here = card.link?.href.startsWith('#');
            return (
              <article className={`route-card${here ? ' route-card--go' : ''}`} key={card.title}>
                <div className="route-top">
                  <span className="route-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  {card.tag && <span className="route-tag">{card.tag}</span>}
                </div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                {card.link && (
                  <Link
                    className={`btn ${here ? 'btn-primary' : 'btn-outline'} route-btn`}
                    href={card.link.href}
                  >
                    {card.link.label}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
        {block.note && (
          <p className="route-note">
            <svg aria-hidden="true">
              <use href="#i-phone" />
            </svg>
            <span>
              {block.note}{' '}
              <a href={`tel:${siteConfig.phoneE164}`}>Call {siteConfig.phone}</a>
            </span>
          </p>
        )}
      </div>
    </section>
  );
}

/** Two places or teams side by side, and the rule that applies to both. */
function SplitGrid({ block }: { block: CardGridBlock }) {
  return (
    <section className={`offices${block.altBackground ? ' alt-bg' : ''}`} id={block.anchor}>
      <div className="wrap">
        <SectionHead
          eyebrow={block.eyebrow}
          heading={block.heading}
          body={block.body}
          centered={block.centered}
        />
        <div className="split-grid">
          {block.cards.map((card) => (
            <article className="split-card" key={card.title}>
              {card.tag && (
                <p className="split-place">
                  <svg aria-hidden="true">
                    <use href="#i-pin" />
                  </svg>
                  {card.tag}
                </p>
              )}
              <h3>{card.title}</h3>
              <p className="split-body">{card.body}</p>
              {card.points && card.points.length > 0 && (
                <ul className="split-points">
                  {card.points.map((point) => (
                    <li key={point}>
                      <svg aria-hidden="true">
                        <use href="#s-check" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              )}
              {card.link && (
                <Link className="split-link" href={card.link.href}>
                  {card.link.label} ›
                </Link>
              )}
            </article>
          ))}
        </div>
        {block.note && (
          <p className="split-rule">
            <svg aria-hidden="true">
              <use href="#s-shield" />
            </svg>
            <span>{block.note}</span>
          </p>
        )}
      </div>
    </section>
  );
}

/** Short statements on a dark band; the card title is the label above each. */
function StatementBand({ block }: { block: CardGridBlock }) {
  return (
    <section className="statement-band" id={block.anchor}>
      <div className="wrap">
        <SectionHead
          eyebrow={block.eyebrow}
          heading={block.heading}
          body={block.body}
          centered={block.centered}
        />
        <div className="statement-grid">
          {block.cards.map((card) => (
            <figure className="statement" key={card.title}>
              <figcaption>{card.title}</figcaption>
              <blockquote>{card.body}</blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A light, numbered list of principles — not another row of boxes. */
function NumberedList({ block }: { block: CardGridBlock }) {
  return (
    <section className={block.altBackground ? 'alt-bg' : undefined} id={block.anchor}>
      <div className="wrap">
        <SectionHead
          eyebrow={block.eyebrow}
          heading={block.heading}
          body={block.body}
          centered={block.centered}
        />
        <ol className="numbered-grid">
          {block.cards.map((card, i) => (
            <li className="numbered-item" key={card.title}>
              <span className="numbered-n" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/*
 * Credential level, read from the badge artwork and the name. The badge files
 * are already level-specific (see the note on certificationLogos in the seed),
 * so this never claims a higher level than the badge shown.
 */
const CERT_LEVELS = [
  {
    key: 'expert',
    label: 'Expert',
    test: (s: string, n: string) => /expert/i.test(s) && !/^MCSE/.test(n),
  },
  {
    key: 'solutions',
    label: 'Solutions Expert',
    test: (_s: string, n: string) => /^MCSE/.test(n),
  },
  {
    key: 'associate',
    label: 'Associate',
    test: (s: string) => /associate/i.test(s),
  },
  {
    key: 'professional',
    label: 'Professional',
    test: (s: string) => /professional/i.test(s),
  },
  {
    key: 'fundamentals',
    label: 'Fundamentals',
    test: (s: string) => /fundamentals/i.test(s),
  },
] as const;

function certLevel(logo: LogoGridBlock['logos'][number]) {
  const s = `${logo.image ?? ''} ${logo.name}`;
  return (
    CERT_LEVELS.find((l) => l.test(s, logo.name)) ?? {
      key: 'certified',
      label: 'Certified',
    }
  );
}

/**
 * Home-page credentials band. A dark section so it reads as proof rather than
 * another light card wall: the heading and a count by level on the left, the
 * badges on the right. On phones the badges become one swipeable row, so
 * twelve credentials no longer cost six screens of scrolling.
 */
function CertShowcase({ block }: { block: LogoGridBlock }) {
  const items = block.logos.map((logo) => ({
    ...logo,
    level: certLevel(logo),
  }));
  const counts = CERT_LEVELS.map((l) => ({
    ...l,
    n: items.filter((i) => i.level.key === l.key).length,
  })).filter((l) => l.n > 0);
  const issuers = [
    ...new Set(items.map((i) => (i.issuer ?? '').split('·')[0].trim()).filter(Boolean)),
  ];

  return (
    <section className="cert-band" id={block.anchor}>
      <div className="wrap cert-layout">
        <div className="cert-intro">
          {block.eyebrow && <div className="eyebrow">{block.eyebrow}</div>}
          {block.heading && <h2>{block.heading}</h2>}
          {block.body && <p className="cert-body">{block.body}</p>}
          <div className="cert-total">
            <b>{items.length}</b>
            <span>
              certifications across
              <br />
              {issuers.join(' and ')}
            </span>
          </div>
          <ul className="cert-levels" aria-label="Certifications by level">
            {counts.map((l) => (
              <li key={l.key} className={`lvl-${l.key}`}>
                <i aria-hidden="true" />
                {l.label}
                <b>{l.n}</b>
              </li>
            ))}
          </ul>
          <Link className="cert-link" href="/certifications">
            See every certification
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" />
            </svg>
          </Link>
        </div>

        <div className="cert-rail">
          <ul className="cert-grid">
            {items.map((logo) => (
              <li className={`cert-card lvl-${logo.level.key}`} key={logo.name}>
                <span className="cert-badge">
                  {logo.image ? (
                    // Plain <img>: the set mixes SVG and raster, and next/image
                    // refuses SVG without dangerouslyAllowSVG.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.image} alt={logo.alt ?? `${logo.name} badge`} loading="lazy" />
                  ) : (
                    <svg aria-hidden="true">
                      <use href="#s-check" />
                    </svg>
                  )}
                </span>
                <span className="cert-level">{logo.level.label}</span>
                <span className="cert-name">{logo.name}</span>
                {logo.issuer && <span className="cert-issuer">{logo.issuer}</span>}
              </li>
            ))}
          </ul>
          <p className="cert-swipe" aria-hidden="true">
            Swipe to see all {items.length}
            <svg viewBox="0 0 16 16">
              <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" />
            </svg>
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Vendor partner logos in one panel. Each mark gets the same visual area
 * rather than the same height: a fixed height makes a near-square mark look
 * twice the weight of a long wordmark. Captions are left off because every
 * mark already says its own name; the alt text carries it for screen readers.
 */
const PARTNER_AREA = 6600; // px² of drawn logo per cell

function PartnerPanel({ block }: { block: LogoGridBlock }) {
  return (
    <section className={block.altBackground ? 'alt-bg partners' : 'partners'} id={block.anchor}>
      <div className="wrap">
        <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />
        <ul
          className="partner-panel"
          style={{ '--partner-count': block.logos.length } as CSSProperties}
        >
          {block.logos.map((logo) => {
            const ratio = logo.aspect ?? 3;
            const h = Math.round(Math.sqrt(PARTNER_AREA / ratio));
            return (
              <li className="partner-cell" key={logo.name}>
                {logo.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo.image}
                    alt={logo.alt ?? logo.name}
                    loading="lazy"
                    style={{ '--h': `${h}px` } as CSSProperties}
                  />
                ) : (
                  <span className="partner-name">{logo.name}</span>
                )}
              </li>
            );
          })}
        </ul>
        {block.points && block.points.length > 0 && (
          <ul className="partner-points">
            {block.points.map((point) => (
              <li key={point}>
                <span className="partner-tick" aria-hidden="true">
                  <svg viewBox="0 0 16 16">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </span>
                {point}
              </li>
            ))}
          </ul>
        )}
        {block.note && <div className="price-note">{block.note}</div>}
      </div>
    </section>
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
                imagePosition: block.imagePosition,
                ctas: block.ctas,
              },
              ...block.slides,
            ]}
          />
        );
      }
      return (
        // Same hero as every other page, at home size. Without a photo it falls
        // back to the navy gradient; with a video the copy sits beside it.
        <section className={`hero hero--home${block.videoUrl ? ' hero--video' : ''}`}>
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
          <div className="wrap hero-grid">
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
              {block.body && <p className="lede">{block.body}</p>}
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
            <div className="ql-grid" style={{ '--ql-count': block.items.length } as CSSProperties}>
              {block.items.map((item) => (
                <Link className="ql-item" href={item.href} key={item.label}>
                  <div className="ql-ic" style={{ background: item.color }}>
                    <svg width="24" height="24" aria-hidden="true">
                      <use href={item.icon} />
                    </svg>
                  </div>
                  <span className="ql-text">
                    <span>{item.label}</span>
                    {item.sub && <small className="ql-sub">{item.sub}</small>}
                  </span>
                  <svg className="ql-arrow" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cardGrid':
      if (block.variant === 'plans') return <PlanGrid block={block} />;
      if (block.variant === 'routes') return <RouteGrid block={block} />;
      if (block.variant === 'split') return <SplitGrid block={block} />;
      if (block.variant === 'statement') return <StatementBand block={block} />;
      if (block.variant === 'numbered') return <NumberedList block={block} />;
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
                <article
                  className={`mcard${card.link ? ' mcard--link' : ''}${card.image || card.coverImage ? ' mcard--media' : ''}`}
                  key={card.title}
                >
                  {/* A photo (image) or supplied artwork (coverImage) runs
                      across the top and replaces the icon tile. Artwork keeps
                      its own proportions and alt text, and gets no shading. */}
                  {card.image ? (
                    <div className="mcard-media">
                      <Image
                        src={card.image}
                        alt=""
                        fill
                        sizes="(max-width: 700px) 100vw, (max-width: 1024px) 50vw, 400px"
                      />
                    </div>
                  ) : card.coverImage ? (
                    <div className="mcard-media mcard-media--art">
                      <Image
                        src={card.coverImage}
                        alt={card.coverImageAlt ?? ''}
                        fill
                        sizes="(max-width: 700px) 100vw, (max-width: 1024px) 50vw, 400px"
                      />
                    </div>
                  ) : (
                    card.icon && (
                      <div
                        className="mcard-icon"
                        style={{
                          background: card.coverColor ?? 'var(--surface-blue)',
                        }}
                      >
                        <svg aria-hidden="true">
                          <use href={card.icon} />
                        </svg>
                      </div>
                    )
                  )}
                  {card.tag && <div className="tag">{card.tag}</div>}
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
                  {/* On a linked card this link stretches over the whole card. */}
                  {card.link && (
                    <Link className="lnk" href={card.link.href}>
                      {card.link.label} ›
                    </Link>
                  )}
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
                  {/* Keyed by position, not by label. A fact table may
                      legitimately repeat a label across rows — two rows for the
                      two halves of the year, for instance — and keying on the
                      content made that a duplicate-key error. The list is
                      static and never reordered, so the index is stable. */}
                  {block.sidebar.rows.map((row, rowIndex) => (
                    <li key={`${row.label}-${rowIndex}`}>
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
      if (block.variant === 'checks') {
        return (
          <HealthChecks
            anchor={block.anchor}
            items={block.steps}
            highlights={block.highlights}
            head={<SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />}
          />
        );
      }
      return (
        <section id={block.anchor}>
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />
            <div className={`steps steps--${block.steps.length}`}>
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

    case 'pricing': {
      // One shared rate is stated once, not repeated on every card.
      const sharedRate =
        block.variant === 'rates' &&
        block.plans.length > 0 &&
        block.plans.every((p) => p.price === block.plans[0].price && p.unit === block.plans[0].unit)
          ? block.plans[0]
          : null;
      return (
        <section className={block.altBackground ? 'alt-bg' : undefined} id={block.anchor ?? 'pricing'}>
          <div className="wrap">
            <SectionHead eyebrow={block.eyebrow} heading={block.heading} body={block.body} centered />
            {sharedRate && (
              <div className="rate-banner">
                <p className="rate-banner-price">
                  <b>{sharedRate.price}</b>
                  {sharedRate.unit && <span>{sharedRate.unit}</span>}
                </p>
                {block.note && <p className="rate-banner-note">{block.note}</p>}
              </div>
            )}
            <div
              className={`${block.columns === 3 ? 'price-grid-3' : 'price-grid'}${
                sharedRate ? ' price-grid--rates' : ''
              }`}
            >
              {block.plans.map((plan) => (
                <div className={`price-card${plan.featured ? ' featured' : ''}`} key={plan.name}>
                  {plan.badge && <span className="badge">{plan.badge}</span>}
                  <h3>{plan.name}</h3>
                  {!sharedRate && (
                    <div className="price">
                      <b>{plan.price}</b>
                      {plan.unit && <span className="unit">{plan.unit}</span>}
                    </div>
                  )}
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
            {block.note && !sharedRate && <div className="price-note">{block.note}</div>}
          </div>
        </section>
      );
    }

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
      if (block.variant === 'showcase') return <CertShowcase block={block} />;
      if (block.variant === 'partners') return <PartnerPanel block={block} />;
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
            <TechGroups
              groups={block.groups.map((group): TechGroupView => ({
                title: group.title,
                icon: groupGlyph(group.title),
                chips: group.chips.map((chip) => {
                  // "Linux — Red Hat, Ubuntu" reads as a name and its detail.
                  const [name, ...rest] = chip.label.split(/\s+—\s+/);
                  return {
                    key: chip.label,
                    name,
                    detail: rest.join(' — ') || undefined,
                    icon: techGlyph(chip.label, chip.icon),
                    href: techHref(chip.label, chip.href),
                  };
                }),
              }))}
            />

            <p className="tg-more">
              Running something not listed? <Link href="/contact">Ask us about it ›</Link>
            </p>

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
      // An untitled paragraph straight under the hero is the page's one-line
      // answer, so it is set as a summary rather than as body copy.
      if (index === 0 && !block.heading) {
        return (
          <section className="rt-lead">
            <div className="wrap">
              <div className="rt-lead-box">
                <span className="rt-lead-label">In short</span>
                <div className="article-body" dangerouslySetInnerHTML={{ __html: block.html }} />
              </div>
            </div>
          </section>
        );
      }
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
            <div className="cta-band-actions">
              <Cta {...block.cta} variant="btn-white" />
              <a className="cta-band-phone" href={`tel:${siteConfig.phoneE164}`}>
                <svg aria-hidden="true">
                  <use href="#i-phone" />
                </svg>
                or call {siteConfig.phone}
              </a>
            </div>
          </div>
        </div>
      );

    case 'contactForm':
      return (
        <section className="contact-sec">
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
              <span className="rs-icon" aria-hidden="true">
                <svg>
                  <use href={`#${calloutGlyph(`${block.eyebrow ?? ''} ${block.heading}`)}`} />
                </svg>
              </span>
              <div className="rs-copy">
                {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
                <h2>{block.heading}</h2>
                <p>{block.body}</p>
              </div>
              <Cta label={block.cta.label} href={block.cta.href} variant="btn-primary" />
            </aside>
          </div>
        </section>
      );

    case 'onCallSubscribe':
      return (
        <OnCallSubscribe
          anchor={block.anchor}
          eyebrow={block.eyebrow}
          heading={block.heading}
          body={block.body}
          pricePerInstanceCents={block.pricePerInstanceCents}
          hourlyRateCents={block.hourlyRateCents}
          minInstances={block.minInstances}
          maxInstances={block.maxInstances}
          /*
           * Deployment configuration beats content here.
           *
           * The address lived only in the seeded block, so ONCALL_SIGNUP_URL
           * in .env governed the confirmation email and silently did nothing
           * to the button beside it — one setting, two sources, and the one
           * an operator edits was the one being ignored. This is a server
           * component, so the value is read per request: changing .env and
           * recreating the web container is enough, with no rebuild.
           */
          signupUrl={process.env.ONCALL_SIGNUP_URL || block.signupUrl}
          includes={block.includes}
          callsTitle={block.callsTitle}
          callsIncludes={block.callsIncludes}
          monthlyPlanHref={block.monthlyPlanHref}
          monthlyPlanLabel={block.monthlyPlanLabel}
          priceNote={block.priceNote}
          fitsTitle={block.fitsTitle}
          fits={block.fits}
          note={block.note}
        />
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
