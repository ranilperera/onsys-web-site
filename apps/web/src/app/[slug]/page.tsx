import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage, getPages } from '@/lib/api';
import { buildMetadata, faqSchema, breadcrumbSchema, serviceSchema, offerCatalogSchema, productListSchema } from '@/lib/seo';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { FaqAccordion } from '@/components/blocks/FaqAccordion';
import { Breadcrumb } from '@/components/Breadcrumb';
import { JsonLd } from '@/components/JsonLd';
import { PageHeroImage } from '@/components/PageHeroImage';

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
  'managed-database-services',
  'expertise',
  'pricing-and-plans',
  'on-call-dba-services',
  'emergency-database-support',
  'database-consultancy',
  'database-upgrades-migrations-dr',
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

  return (
    <>
      <JsonLd data={schemas} />

      <section className={`page-hero${page.heroImage ? ' page-hero-dark' : ''}`}>
        {page.heroImage && <PageHeroImage src={page.heroImage} />}
        <div className="wrap">
          <Breadcrumb items={crumbs} />
          {page.eyebrow && (
            <span className="eyebrow-pill">
              <span className="dot" aria-hidden="true" />
              {page.eyebrow}
            </span>
          )}
          <h1>{page.heading}</h1>
          {page.lede && <p className="lede">{page.lede}</p>}
          {page.heroCtas && page.heroCtas.length > 0 && (
            <div className="page-hero-cta">
              {page.heroCtas.map((cta, i) => (
                <a key={cta.href} href={cta.href} className={`btn ${i === 0 ? 'btn-primary' : 'btn-outline'}`}>
                  {cta.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <BlockRenderer blocks={page.blocks} />

      {page.faqs.length > 0 && (
        <section className={page.blocks.length % 2 === 0 ? 'alt-bg' : undefined}>
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">FAQ</div>
              <h2>Common questions</h2>
            </div>
            <FaqAccordion items={page.faqs} />
          </div>
        </section>
      )}
    </>
  );
}
