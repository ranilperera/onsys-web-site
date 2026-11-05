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

          {/*
            Operator-authored HTML, sanitised server-side on save in the admin
            API — the same path post bodies take.

            `article-body`, not a class of its own. The advert is the same kind
            of document as a blog post and there is one stylesheet for that.
            This rendered as `prose` for a while, which is a Tailwind name and
            this site does not use Tailwind — so it matched no rule at all, and
            the global `ul{list-style:none}` reset meant every bullet in every
            advert rendered as an unmarked, unindented line. It is also the
            class the admin editor puts on its own editing surface, so what an
            author sees while writing is now what the page serves.
          */}
          <div className="article-body" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />

          {/*
            Applications come through the site, not by email.
            Until now this block asked for a CV by email, which lost
            applications in the ordinary course of business: an inbox cannot
            record that a CV was read, cannot stop two people replying, and
            cannot tell a message that was dealt with from one that landed
            while somebody was on leave. The form posts into a queue at
            /admin/applications instead, so every CV has a state.

            `job.applyEmail` is still on the record and still editable — it is
            how a role advertised on behalf of a client can route elsewhere —
            but it is no longer published here, because a published address
            collects applications nothing tracks.
          */}
          {open && (
            <div className="article-cta">
              <div>
                <h2>Apply for this role</h2>
                <p>
                  Applications close {dateFmt.format(new Date(job.closesAt))}. It takes a couple of
                  minutes: a few details, your CV, and anything you want us to know. You will get a
                  confirmation by email straight away.
                </p>
              </div>
              <div className="article-cta-actions">
                <Link className="btn btn-primary" href={`/careers/${job.slug}/apply`}>
                  Apply for this role
                </Link>
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
