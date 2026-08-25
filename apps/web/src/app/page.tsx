import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/api';
import { buildMetadata, faqSchema, webPageSchema, offerCatalogSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { FaqAccordion } from '@/components/blocks/FaqAccordion';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('home');
  return buildMetadata({
    title: page?.seoTitle ?? `${siteConfig.name} | Managed Database, Cloud & IT Services Australia`,
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
