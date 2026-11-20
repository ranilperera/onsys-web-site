'use client';

import { useEffect, useState } from 'react';
import type { CvInsight } from '@onsys/shared';
import { siteConfig } from '@/lib/config';

/**
 * The CV, read on this screen.
 *
 * Before this, deciding anything about a candidate cost a round trip: download
 * the file, wait for a PDF reader, read it, close it, come back, find your
 * place again. At a hundred applications that is the afternoon, and the
 * predictable result was that the ones at the bottom of the queue never got
 * read at all.
 *
 * Two things are shown, in this order, because they answer two different
 * questions. The summary answers "is this worth my next ten minutes?" — it is
 * what lets somebody move through a backlog. The full text answers "what does
 * it actually say?" and is there for the candidate who passed the first
 * question, so that the decision is never made on the summary alone.
 *
 * The download stays exactly where it was. This replaces opening a CV to triage
 * it, not opening a CV to read it properly before an interview.
 */

/** A labelled group of short facts, hidden entirely when there are none. */
function Points({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '.04em',
          color: '#605E5C',
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function CvInsightPanel({
  applicationId,
  jobTitle,
}: {
  applicationId: string;
  jobTitle: string;
}) {
  const [insight, setInsight] = useState<CvInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setInsight(null);
    setShowFullText(false);

    fetch(`${siteConfig.apiUrl}/api/admin/applications/${applicationId}/insight`, {
      credentials: 'include',
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? 'Could not read the CV.');
        }
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setInsight(d.insight);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (loading) {
    return (
      <section className="admin-card">
        <h2>What the CV says</h2>
        <p style={{ color: 'var(--gray)', margin: 0 }}>Reading the CV&hellip;</p>
      </section>
    );
  }

  /*
   * A failure here costs the reviewer nothing they had before — the download
   * is still on the screen above. So it is stated in one line and the page
   * carries on, rather than becoming an error.
   */
  if (error || !insight) {
    return (
      <section className="admin-card">
        <h2>What the CV says</h2>
        <p style={{ color: 'var(--gray)', margin: 0, fontSize: 14 }}>
          {error ?? 'The CV could not be read.'} Download it above to read it.
        </p>
      </section>
    );
  }

  if (insight.state === 'unreadable') {
    return (
      <section className="admin-card">
        <h2>What the CV says</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          {insight.problem ?? 'This CV holds no text that can be read here.'}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--gray)' }}>
          {/* Said plainly, because the alternative reading — that the
              application is somehow defective — is both wrong and unfair to
              the candidate. */}
          This says nothing about the application itself. Plenty of good CVs are
          scanned or exported as images.
        </p>
      </section>
    );
  }

  const summary = insight.summary;
  const matched = insight.requirements.filter((r) => r.present);
  const missing = insight.requirements.filter((r) => !r.present);

  return (
    <section className="admin-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0 }}>What the CV says</h2>
        {/*
          Never hidden, and never softened. A reviewer deciding somebody's
          livelihood is entitled to know whether they are reading a model's
          reading of a document or a list of words found in it — the two are
          worth very different amounts.
        */}
        <span style={{ fontSize: 12, color: 'var(--gray)' }}>
          {summary?.source === 'ai'
            ? 'Summarised automatically — check anything it rests on against the CV'
            : 'Keyword scan only — no summary was generated'}
        </span>
      </div>

      {summary && (
        <>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, margin: '12px 0 4px', fontWeight: 600 }}>
            {summary.headline}
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--gray)', margin: '0 0 16px' }}>
            {[
              summary.currentRole,
              summary.yearsExperience ? `${summary.yearsExperience} years` : null,
              insight.pages ? `${insight.pages} page${insight.pages === 1 ? '' : 's'}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {summary.recentRoles.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  color: '#605E5C',
                  marginBottom: 6,
                }}
              >
                Recent roles
              </div>
              {summary.recentRoles.map((role, i) => (
                <div key={`${role.title}-${role.employer}-${i}`} style={{ fontSize: 14, marginBottom: 4 }}>
                  <strong>{role.title || 'Role not stated'}</strong>
                  {role.employer && ` — ${role.employer}`}
                  {role.period && (
                    <span style={{ color: 'var(--gray)' }}> · {role.period}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {summary.skills.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  color: '#605E5C',
                  marginBottom: 6,
                }}
              >
                Skills
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {summary.skills.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      background: 'var(--surface-gray)',
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontSize: 12.5,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Points title={`Strengths for ${jobTitle}`} items={summary.strengths} />
          <Points title="Worth asking about" items={summary.concerns} />
          <Points title="Certifications" items={summary.certifications} />
          <Points title="Education" items={summary.education} />
        </>
      )}

      {/*
        The advert's own words, checked against the CV. Not a score: a missing
        term means the CV does not use that word, which is a prompt for a
        question and never a reason on its own.
      */}
      {insight.requirements.length > 0 && (
        <div style={{ marginTop: 6, marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              color: '#605E5C',
              marginBottom: 6,
            }}
          >
            Against the advert ({matched.length} of {insight.requirements.length} terms mentioned)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {matched.map((r) => (
              <span
                key={r.term}
                style={{
                  background: '#E7F5EC',
                  color: '#0B5B36',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {r.term}
              </span>
            ))}
            {missing.map((r) => (
              <span
                key={r.term}
                style={{
                  background: 'var(--surface-gray)',
                  color: 'var(--gray)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 12.5,
                  textDecoration: 'line-through',
                }}
              >
                {r.term}
              </span>
            ))}
          </div>
        </div>
      )}

      {insight.text && (
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowFullText((v) => !v)}
            aria-expanded={showFullText}
          >
            {showFullText ? 'Hide the full CV text' : 'Read the full CV text'}
          </button>

          {showFullText && (
            <>
              <pre
                style={{
                  marginTop: 12,
                  marginBottom: 6,
                  maxHeight: 520,
                  overflow: 'auto',
                  background: '#F8FAFC',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '14px 16px',
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  // The document's own line breaks carry the structure of a
                  // CV — dates against roles, one bullet per line — so they
                  // are kept. Wrapping stops a wide table turning the whole
                  // console into a horizontal scroll.
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                }}
              >
                {insight.text}
              </pre>
              <p style={{ fontSize: 12, color: 'var(--gray)', margin: 0 }}>
                Text extracted from {insight.pages ? `${insight.pages} pages, ` : ''}
                {insight.chars.toLocaleString('en-AU')} characters. Layout, tables and anything in
                an image are not shown — download the file for the document as the candidate
                designed it.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
