import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getJob } from '@/lib/api';
import { buildMetadata, jobPostingSchema, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { JsonLd } from '@/components/JsonLd';
import {
  JOB_TYPE_LABEL,
  JOB_LOCATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
  isJobOpen,
} from '@onsys/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

/**
 * A closed role is still served, with noindex.
 *
 * Someone following a link from a job board or a forwarded email should be told
 * the role has closed, not handed a 404 — but there is no reason for Google to
 * keep a page nobody can act on in its index.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) return buildMetadata({ title: 'Role not found', description: '', path: `/careers/${slug}`, noindex: true });

  const open = isJobOpen(job.closesAt);
  return buildMetadata({
    title: job.seoTitle || `${job.title} — Careers at Onsys`,
    description: job.seoDescription || job.summary,
    path: `/careers/${job.slug}`,
    noindex: !open,
  });
}

const dateFmt = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

  const open = isJobOpen(job.closesAt);
  // Per-job address when the advert sets one, the careers mailbox otherwise.
  const applyTo = job.applyEmail || siteConfig.careersEmail;
  const subject = encodeURIComponent(`Application — ${job.title}`);

  return (
    <>
      {/* Only an open role is offered to Google Jobs. Advertising a closed one
          earns a page that disappoints every visitor it gets. */}
      {open && <JsonLd data={jobPostingSchema(job)} />}
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: siteConfig.url },
          { name: 'Careers', url: `${siteConfig.url}/careers` },
          { name: job.title },
        ])}
      />

      <article className="section">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">
              {JOB_TYPE_LABEL[job.type]} · {JOB_LOCATION_LABEL[job.location]} ·{' '}
              {WORK_ARRANGEMENT_LABEL[job.workArrangement]}
            </div>
            <h1>{job.title}</h1>
            <p>{job.summary}</p>
          </div>

          <dl className="form-row">
            {job.salaryRange && (
              <div className="form-field">
                <dt>Salary</dt>
                <dd>{job.salaryRange}</dd>
              </div>
            )}
            <div className="form-field">
              <dt>Applications close</dt>
              <dd>{dateFmt.format(new Date(job.closesAt))}</dd>
            </div>
          </dl>

          {!open && (
            <div className="article-cta">
              <div>
                <h2>This role has closed</h2>
                <p>
                  Applications closed on {dateFmt.format(new Date(job.closesAt))}. The advert is
                  kept here for anyone following an older link —{' '}
                  <Link href="/careers">see what is open now</Link>.
                </p>
              </div>
            </div>
          )}

          {/* Operator-authored HTML, sanitised server-side on save in the
              admin API — the same path post bodies take. */}
          <div className="prose" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />

          {open && (
            <div className="article-cta">
              <div>
                <h2>Apply for this role</h2>
                <p>
                  Send a CV and a short note to{' '}
                  <a href={`mailto:${applyTo}?subject=${subject}`}>{applyTo}</a>, quoting the role
                  title. We read everything that arrives and reply either way.
                </p>
              </div>
              <div className="article-cta-actions">
                <a className="btn btn-primary" href={`mailto:${applyTo}?subject=${subject}`}>
                  Email your application
                </a>
                <Link className="btn btn-outline" href="/careers">
                  Other open roles
                </Link>
              </div>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
