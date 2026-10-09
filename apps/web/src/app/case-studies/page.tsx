import Link from 'next/link';
import { getCaseStudies } from '@/lib/api';
import { buildMetadata } from '@/lib/seo';

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
      <section className="section">
        <div className="wrap">
          {/*
            * Wider than the 640px every other section head uses, because this
            * one is a four-paragraph page introduction under a 32px h1 rather
            * than the single-sentence lede that measure was set for — at 640
            * it ran to a thin column down the left of an empty row.
            *
            * The supplied copy arrived as six separate lines. Nothing is
            * reworded or reordered; adjacent sentences making the same point
            * are grouped so the intro reads as prose instead of six one-line
            * paragraphs, and the closing hook keeps a paragraph of its own
            * because it is the line that asks for the click.
            */}
          <div className="section-head cs-intro">
            <div className="eyebrow">Case studies</div>
            <h1>Projects We’ve Delivered — Proven Outcomes, Fixed-Price Certainty</h1>
            <p>
              These are real projects delivered for organisations across Australia, New Zealand and
              the Pacific. Each engagement was completed to an agreed scope, fixed price and
              delivery timeline — without unexpected cost variations.
            </p>
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
