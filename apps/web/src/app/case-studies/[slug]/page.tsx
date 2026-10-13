import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCaseStudy } from '@/lib/api';
import { buildMetadata, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { JsonLd } from '@/components/JsonLd';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageHeroImage } from '@/components/PageHeroImage';
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
        {/* Deliberately the same hero as a service page — same element, same
            classes, same order of breadcrumb, pill, heading, lede, actions —
            so a case study does not read as a different kind of page. The only
            addition is the platform row, which a service page has no
            equivalent of. The photograph is optional: a study without one
            keeps the light header rather than rendering a navy band over
            nothing. */}
        <section className={`page-hero cs-hero${cs.heroImage ? ' page-hero-dark' : ''}`}>
          {cs.heroImage && <PageHeroImage src={cs.heroImage} />}
          <div className="wrap">
            <Breadcrumb
              items={[
                { label: 'Home', href: '/' },
                { label: 'Case studies', href: '/case-studies' },
                { label: cs.sector },
              ]}
            />
            {/* Sector, region and year ride in the pill, which is where every
                other page carries its qualifying line. They used to sit in a
                separate plate below the lede, and that was the thing making
                this header look unlike the rest of the site. */}
            <span className="eyebrow-pill">
              <span className="dot" aria-hidden="true" />
              {cs.sector} · {cs.region} · Delivered {cs.deliveredYear}
            </span>
            <h1>{cs.title}</h1>
            <p className="lede">{cs.summary}</p>

            {cs.platforms.length > 0 && (
              <p className="cs-platforms">
                {cs.platforms.map((pf) => (
                  <span className="lead-service" key={pf}>
                    {pf}
                  </span>
                ))}
              </p>
            )}

            <div className="page-hero-cta">
              <Link className="btn btn-primary" href="/contact">
                Discuss a project like this
              </Link>
              <Link className="btn btn-outline" href="/case-studies">
                All case studies
              </Link>
            </div>
          </div>
        </section>

        {/* Case studies are authored as blocks, so they are edited with the
            same tools as every other page and can carry a checklist, a steps
            sequence or a quote without new markup being written for each one.
            The wrapper is what lets the body alternate its background: the
            blocks themselves carry no alt flag, and a case study reads as one
            argument in several movements rather than a stack of sections. */}
        <div className="cs-body">
          <BlockRenderer blocks={cs.blocks as Block[]} />
        </div>

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
