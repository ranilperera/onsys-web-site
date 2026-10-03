import Link from 'next/link';
import { getJobs } from '@/lib/api';
import { buildMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import {
  JOB_TYPE_LABEL,
  JOB_LOCATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
} from '@onsys/shared';

/**
 * /careers — open vacancies, managed from /admin/jobs.
 *
 * The footer has linked "Careers" at /contact since the site launched, which
 * every SEO review has flagged as a trust problem: a buyer who checks whether
 * the people exist finds a contact form.
 *
 * Content comes from the database, which does not exist during `next build`,
 * so this renders on request for the same reason llms.txt does. The underlying
 * fetch carries its own revalidate, so the database is not queried per request.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata = buildMetadata({
  title: 'Careers at Onsys | Database, Cloud and IT Roles',
  description:
    'Open roles at Onsys Technologies across Melbourne and Colombo — database administration, cloud, infrastructure, security and software engineering.',
  path: '/careers',
});

const dateFmt = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default async function CareersIndex() {
  const jobs = await getJobs();

  return (
    <>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Careers</div>
            <h1>Work at Onsys</h1>
            <p>
              We run production databases and the infrastructure around them for Australian
              organisations. Roles are posted here as they open.
            </p>
          </div>

          {jobs.length === 0 ? (
            /* An empty state that says something true, rather than an empty
               page. There is no "register your interest" form yet, so this
               points at the address people can actually reach. */
            <div className="article-cta">
              <div>
                <h2>No open roles right now</h2>
                <p>
                  Nothing is advertised at the moment. If you are a senior DBA or a cloud or
                  security engineer, send a CV to{' '}
                  <a href={`mailto:${siteConfig.careersEmail}`}>{siteConfig.careersEmail}</a> and we
                  will keep it on file.
                </p>
              </div>
            </div>
          ) : (
            <div className="card-grid">
              {jobs.map((job) => (
                <article className="mcard" key={job.id}>
                  <div className="body notag">
                    <h2>
                      <Link href={`/careers/${job.slug}`}>{job.title}</Link>
                    </h2>
                    <p className="lead-source">
                      {JOB_TYPE_LABEL[job.type]} · {JOB_LOCATION_LABEL[job.location]} ·{' '}
                      {WORK_ARRANGEMENT_LABEL[job.workArrangement]}
                    </p>
                    <p>{job.summary}</p>
                    {job.salaryRange && (
                      <p>
                        <strong>{job.salaryRange}</strong>
                      </p>
                    )}
                    <p className="lead-source">
                      Applications close {dateFmt.format(new Date(job.closesAt))}
                    </p>
                    <Link className="lnk" href={`/careers/${job.slug}`}>
                      Read the role ›
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
          <h2>Not a role on this list?</h2>
          <p>
            We hire senior database, cloud and security people when we find them. Tell us what you
            do.
          </p>
          <Link className="btn btn-white" href="/contact">
            Get in touch
          </Link>
        </div>
      </div>
    </>
  );
}
