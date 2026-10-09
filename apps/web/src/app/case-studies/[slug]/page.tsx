import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCaseStudy } from '@/lib/api';
import { buildMetadata, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { JsonLd } from '@/components/JsonLd';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import type { Block } from '@onsys/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cs = await getCaseStudy(slug);
  if (!cs) {
    return buildMetadata({
      title: 'Case study not found',
      description: '',
      path: `/case-studies/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: cs.seoTitle || `${cs.title} | Onsys Case Study`,
    description: cs.seoDescription || cs.summary,
    path: `/case-studies/${cs.slug}`,
  });
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const cs = await getCaseStudy(slug);
  if (!cs) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: siteConfig.url },
          { name: 'Case studies', url: `${siteConfig.url}/case-studies` },
          { name: cs.title },
        ])}
      />

      <article>
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">
                {cs.sector} · {cs.region} · delivered {cs.deliveredYear}
              </div>
              <h1>{cs.title}</h1>
              <p>{cs.summary}</p>
            </div>

            {cs.platforms.length > 0 && (
              <p className="cs-platforms">
                {cs.platforms.map((pf) => (
                  <span className="lead-service" key={pf}>
                    {pf}
                  </span>
                ))}
              </p>
            )}
          </div>
        </section>

        {/* Case studies are authored as blocks, so they are edited with the
            same tools as every other page and can carry a checklist, a steps
            sequence or a quote without new markup being written for each one. */}
        <BlockRenderer blocks={cs.blocks as Block[]} />

        <section className="section">
          <div className="wrap">
            {/* Stated on every case study because it is the one outcome that
                holds across all of them, and it is what a buyer comparing
                providers actually wants to know. */}
            <div className="article-cta">
              <div>
                <h2>How this engagement was run</h2>
                <p>
                  Delivered as a fixed-price project against written acceptance criteria, to the
                  agreed timeline and without a cost variation. Client not named: the work was done
                  under confidentiality.
                </p>
              </div>
              <div className="article-cta-actions">
                <Link className="btn btn-primary" href="/contact">
                  Discuss a project
                </Link>
                <Link className="btn btn-outline" href="/case-studies">
                  Other engagements
                </Link>
              </div>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
