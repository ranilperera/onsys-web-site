import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/api';
import { buildMetadata, faqSchema, webPageSchema, offerCatalogSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { FaqAccordion } from '@/components/blocks/FaqAccordion';
import { JsonLd } from '@/components/JsonLd';

// Content for this route lives in the database, which does not exist during
// `next build` — the Docker image is built before any database is running. Left
// as a default ISR route, Next bakes the empty (or 404) render into the image
// and serves it until the revalidate window expires, which reintroduces the
// problem on every rebuild. Rendering on request keeps it correct from the
// first hit; the underlying API fetch still carries its own revalidate, so the
// database is not queried per request.
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('home');
  return buildMetadata({
    // The <title> template in the root layout applies to child segments only,
    // never to this one, so the brand close has to be appended by hand here.
    title: page?.seoTitle
      ? `${page.seoTitle} | ${siteConfig.shortName}`
      : `${siteConfig.name} | Remote DBA & Managed IT Services Australia`,
    description: page?.seoDescription ?? siteConfig.description,
    path: '/',
    ogImage: page?.ogImage,
  });
}

export default async function HomePage() {
  // The offer catalog is built from the pricing page's own blocks so the
  // structured data cannot drift from the prices we actually publish.
  const [page, pricingPage] = await Promise.all([getPage('home'), getPage('pricing-and-plans')]);
  if (!page) notFound();

  const schemas: Array<Record<string, unknown>> = [
    webPageSchema({
      name: page.seoTitle ?? page.title,
      description: page.seoDescription ?? page.lede ?? '',
      path: '/',
      modified: page.updatedAt,
      speakableSelectors: ['.hero h1', '.hero p', '.faq-a'],
    }),
  ];

  const offersLd = pricingPage ? offerCatalogSchema(pricingPage) : null;
  if (offersLd) schemas.push(offersLd);

  const faqLd = faqSchema(page.faqs);
  if (faqLd) schemas.push(faqLd);

  return (
    <>
      <JsonLd data={schemas} />
      <BlockRenderer blocks={page.blocks} />

      {page.faqs.length > 0 && (
        <section className="alt-bg">
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
