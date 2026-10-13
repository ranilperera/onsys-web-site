import Link from 'next/link';
import { getCaseStudies } from '@/lib/api';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageHeroImage } from '@/components/PageHeroImage';

/**
 * /case-studies — anonymised accounts of delivered work.
 *
 * Five consecutive SEO reports recorded zero case studies on this site while
 * every competitor that outranks it shows named clients. These cannot name
 * clients: the source material is commercial-in-confidence and no permission to
 * name has been given. What they can do is describe the work precisely enough
 * that a DBA reading it can tell whether the people who did it knew what they
 * were doing — which is the actual job of a case study.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata = buildMetadata({
  title: 'Case Studies | Database & Cloud Projects Delivered',
  description:
    'Anonymised accounts of database and cloud projects Onsys has delivered across Australia, Sri Lanka and the Pacific — high availability, replication, disaster recovery and cloud migration, each to a fixed price and an agreed timeline.',
  path: '/case-studies',
});

export default async function CaseStudiesIndex() {
  const studies = await getCaseStudies();

  return (
    <>
      {/* The same hero every other landing page has. The heading and the first
          paragraph of the supplied intro move up into it; the rest stays in
          the section below, in the order it was written. */}
      <section className="page-hero page-hero-dark cs-hero">
        <PageHeroImage src="/images/hero-case-studies.jpg" />
        <div className="wrap">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Case studies' }]} />
          <span className="eyebrow-pill">
            <span className="dot" aria-hidden="true" />
            Delivered work · Fixed price · Australia, New Zealand &amp; the Pacific
          </span>
          <h1>Projects We’ve Delivered — Proven Outcomes, Fixed-Price Certainty</h1>
          <p className="lede">
            These are real projects delivered for organisations across Australia, New Zealand and
            the Pacific. Each engagement was completed to an agreed scope, fixed price and delivery
            timeline — without unexpected cost variations.
          </p>
          <div className="page-hero-cta">
            <Link className="btn btn-primary" href="/contact">
              Discuss a project
            </Link>
            <Link className="btn btn-outline" href="/book">
              Book a consultation
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          {/*
            * Wider than the 640px every other section head uses, because this
            * one is a multi-paragraph page introduction rather than the
            * single-sentence lede that measure was set for — at 640 it ran to
            * a thin column down the left of an empty row.
            *
            * The supplied copy arrived as six separate lines. Nothing is
            * reworded or reordered; adjacent sentences making the same point
            * are grouped so the intro reads as prose instead of six one-line
            * paragraphs, and the closing hook keeps a paragraph of its own
            * because it is the line that asks for the click. The heading and
            * the opening paragraph now sit in the hero above, which is the
            * only change to how this copy is arranged.
            */}
          <div className="section-head cs-intro">
            <p>
              From database migrations and high availability to disaster recovery, cloud
              transformation and critical platform upgrades, the work reflects real-world
              engineering challenges.
            </p>
            <p>
              We protect our clients’ confidentiality, so company names and identifying details are
              never disclosed. Instead, we share the industry, region, business challenge, solution
              and technical approach so you can see exactly what we delivered.
            </p>
            <p className="cs-intro-close">
              If you are facing a similar challenge, there is a good chance we have already solved
              it.
            </p>
          </div>

          {studies.length === 0 ? (
            <p style={{ color: 'var(--gray)' }}>
              Case studies are being prepared. In the meantime,{' '}
              <Link href="/contact">ask us about work in your sector</Link> and we will talk you
              through comparable engagements.
            </p>
          ) : (
            <div className="card-grid">
              {studies.map((cs) => (
                <article className="mcard" key={cs.id}>
                  <div className="body notag">
                    <h2>
                      <Link href={`/case-studies/${cs.slug}`}>{cs.title}</Link>
                    </h2>
                    <p className="lead-source">
                      {cs.sector} · {cs.region} · {cs.deliveredYear}
                    </p>
                    <p>{cs.summary}</p>
                    {cs.platforms.length > 0 && (
                      <p className="lead-source">{cs.platforms.join(' · ')}</p>
                    )}
                    <Link className="lnk" href={`/case-studies/${cs.slug}`}>
                      Read the engagement ›
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="cta-band">
        <div className="wrap">
          <h2>Something similar in front of you?</h2>
          <p>
            Fixed price, written acceptance criteria, and a dry run against a copy of production
            before any cutover. Tell us what you are trying to do.
          </p>
          <Link className="btn btn-white" href="/contact">
            Discuss a project
          </Link>
        </div>
      </div>
    </>
  );
}
