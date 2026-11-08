import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage, getPages } from '@/lib/api';
import { buildMetadata, faqSchema, breadcrumbSchema, serviceSchema, offerCatalogSchema, productListSchema, webPageSchema } from '@/lib/seo';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { FaqAccordion } from '@/components/blocks/FaqAccordion';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/PageHero';
import { PageDates } from '@/components/PageDates';
import { siteConfig } from '@/lib/config';
import type { Block } from '@onsys/shared';

/**
 * The hero's "At a glance" card reuses the page's own fact table (a checkList
 * sidebar titled "At a glance"), so the figures are written once and cannot
 * disagree. A "Prices shown" row becomes the small print under the card.
 */
function heroFacts(blocks: Block[]) {
  const rows =
    blocks.find(
      (b): b is Extract<Block, { type: 'checkList' }> =>
        b.type === 'checkList' && !!b.sidebar && /^at a glance$/i.test(b.sidebar.title.trim()),
    )?.sidebar?.rows ??
    blocks.find(
      (b): b is Extract<Block, { type: 'onCallSubscribe' }> =>
        b.type === 'onCallSubscribe' && !!b.glance?.length,
    )?.glance;
  if (!rows) return { facts: undefined, note: undefined };
  const isNote = (label: string) => /prices shown/i.test(label);
  const noteRow = rows.find((r) => isNote(r.label));
  return {
    facts: rows.filter((r) => !isNote(r.label)).slice(0, 4),
    note: noteRow ? `All prices ${noteRow.value}` : undefined,
  };
}

export const revalidate = 300;
export const dynamicParams = true;

/** Pre-render every published page at build time. */
export async function generateStaticParams() {
  const pages = await getPages();
  return pages.filter((p) => p.slug !== 'home').map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: 'Page not found' };

  return buildMetadata({
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.lede ?? '',
    path: `/${page.slug}`,
    ogImage: page.ogImage,
    noindex: page.noindex,
    canonicalUrl: page.canonicalUrl,
  });
}

/** Pages that describe a commercial offering get Service schema. */
const SERVICE_SLUGS = new Set([
  // Market pages are services with a defined area served, which is the
  // whole point of them — so they emit Service schema like any other.
  'database-support-new-zealand',
  'database-support-pacific-islands',
  'database-support-fiji',
  'database-support-papua-new-guinea',
  'database-support-vanuatu',
  'database-support-solomon-islands',
  'remote-database-support',
  'free-20-point-sql-server-health-check',
  'managed-database-services',
  'expertise',
  'pricing-and-plans',
  'on-call-dba-services',
  'emergency-database-support',
  'database-consultancy',
  'database-upgrades-migrations-dr',
  'sql-server-migration-and-upgrade-services',
  'postgresql-consulting-services',
  'mysql-consulting-services',
  'managed-it-services',
  'cloud-consultancy',
  'cloud-migrations',
  'system-administration',
  'network-and-firewalls',
  'virtualization-and-storage',
  'custom-software-development',
  'mobile-app-development',
  'integration-services',
  'artificial-intelligence-solutions',
  'managed-security-services',
  'managed-endpoint-detection-and-response',
  'data-and-application-security',
  'grc-and-compliance',
]);

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  const crumbs = [{ label: 'Home', href: '/' }, { label: page.title }];
  const schemas: Array<Record<string, unknown>> = [
    breadcrumbSchema([{ name: 'Home', url: '/' }, { name: page.title }]),
    webPageSchema({
      name: page.seoTitle ?? page.title,
      description: page.seoDescription ?? page.lede ?? '',
      path: `/${page.slug}`,
      modified: page.updatedAt,
      published: page.publishedAt,
    }),
  ];

  const faqLd = faqSchema(page.faqs);
  if (faqLd) schemas.push(faqLd);

  // Any page that publishes prices gets its plans marked up as offers. That
  // node already *is* a Service, so emitting the plain one as well would
  // describe the same offering twice as two unrelated entities.
  const offersLd = offerCatalogSchema(page);
  if (offersLd) schemas.push(offersLd);
  else if (SERVICE_SLUGS.has(page.slug)) schemas.push(serviceSchema(page));

  const productsLd = productListSchema(page);
  if (productsLd) schemas.push(productsLd);
  if (page.structuredData) schemas.push(page.structuredData);

  const glance = heroFacts(page.blocks);

  return (
    <>
      <JsonLd data={schemas} />

      <PageHero
        image={page.heroImage}
        crumbs={crumbs}
        eyebrow={page.eyebrow}
        title={page.heading}
        lede={page.lede}
        ctas={page.heroCtas ?? undefined}
        facts={glance.facts}
        factsNote={glance.note}
      />

      <BlockRenderer blocks={page.blocks} />

      {/* The audit's AEO-11: content of unknown age is down-weighted, and these
          dates are mirrored into datePublished / dateModified above. */}
      <PageDates published={page.publishedAt} modified={page.updatedAt} />

      {page.faqs.length > 0 && (
        <section className={page.blocks.length % 2 === 0 ? 'alt-bg' : undefined}>
          <div className="wrap faq-layout">
            <div className="faq-side">
              <div className="section-head">
                <div className="eyebrow">FAQ</div>
                <h2>Common questions</h2>
              </div>
              <div className="faq-help">
                <p className="faq-help-title">Still have a question?</p>
                <p>Call, email or book a time that suits you.</p>
                <a className="faq-help-line" href={`tel:${siteConfig.phoneE164}`}>
                  <svg aria-hidden="true">
                    <use href="#i-phone" />
                  </svg>
                  {siteConfig.phone}
                </a>
                <a className="faq-help-line" href={`mailto:${siteConfig.email}`}>
                  <svg aria-hidden="true">
                    <use href="#i-mail" />
                  </svg>
                  {siteConfig.email}
                </a>
                <a className="btn btn-primary btn-sm" href={siteConfig.bookingUrl}>
                  Book a call
                </a>
              </div>
            </div>
            <FaqAccordion items={page.faqs} />
          </div>
        </section>
      )}
    </>
  );
}
