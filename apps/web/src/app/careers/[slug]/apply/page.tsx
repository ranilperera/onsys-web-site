import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getJob } from '@/lib/api';
import { buildMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { ApplyForm } from '@/components/ApplyForm';
import {
  JOB_TYPE_LABEL,
  JOB_LOCATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
  isJobOpen,
} from '@onsys/shared';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

/**
 * The application form for one role.
 *
 * A page of its own rather than a form at the foot of the advert: the advert is
 * long, an application is a deliberate act, and a candidate who has started
 * filling this in should not have to scroll past the job description to find
 * where they were. It also gives us a URL to put on a job board.
 *
 * noindex, because there is nothing here for a search engine and a form
 * indexed apart from its advert is a page that arrives with no context.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  return buildMetadata({
    title: job ? `Apply — ${job.title}` : 'Apply',
    description: job?.summary ?? '',
    path: `/careers/${slug}/apply`,
    noindex: true,
  });
}

export default async function ApplyPage({ params }: Props) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

  // A closed role has nothing to submit to, and the API would refuse it. Send
  // the candidate to the advert, which explains that it closed, rather than
  // letting them fill in a form that cannot be accepted.
  if (!isJobOpen(job.closesAt)) redirect(`/careers/${job.slug}`);

  return (
    <article className="section">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">
            {JOB_TYPE_LABEL[job.type]} · {JOB_LOCATION_LABEL[job.location]} ·{' '}
            {WORK_ARRANGEMENT_LABEL[job.workArrangement]}
          </div>
          <h1>Apply: {job.title}</h1>
          <p>
            Four details, your CV, and anything you want us to know.{' '}
            <Link href={`/careers/${job.slug}`}>Read the full advert</Link> if you have not already.
          </p>
        </div>

        <div className="apply-layout">
          <ApplyForm jobId={job.id} jobTitle={job.title} />

          <aside className="apply-aside">
            <h2>What happens next</h2>
            <ol>
              <li>
                You get an emailed confirmation straight away. If it does not arrive, check your
                spam folder before resending — duplicates are more trouble than a missing copy.
              </li>
              <li>
                Your application goes into the queue for this role, where it is read by the people
                hiring for it. Nothing sits in a shared mailbox.
              </li>
              <li>
                If your experience lines up with what the role needs, someone contacts you to
                arrange a conversation. We are a small team and cannot reply to everyone
                individually.
              </li>
            </ol>

            <h2>Your information</h2>
            <p>
              Your CV is stored privately and read only by the people hiring. We keep it on file for
              future openings; email{' '}
              <a href={`mailto:${siteConfig.careersEmail}`}>{siteConfig.careersEmail}</a> at any time
              and we will delete it.
            </p>

            {job.salaryRange && (
              <>
                <h2>Salary</h2>
                <p>{job.salaryRange}</p>
              </>
            )}
          </aside>
        </div>
      </div>
    </article>
  );
}
