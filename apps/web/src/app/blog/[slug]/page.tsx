import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPost, getPosts } from '@/lib/api';
import {
  buildMetadata,
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  howToSchema,
  extractSteps,
} from '@/lib/seo';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageHeroImage } from '@/components/PageHeroImage';
import { FaqAccordion } from '@/components/blocks/FaqAccordion';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { posts } = await getPosts({ page: 1 });
  return posts.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPost(slug);
  if (!data) return { title: 'Article not found' };

  const { post } = data;
  return buildMetadata({
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt ?? '',
    path: `/blog/${post.slug}`,
    ogImage: post.ogImage ?? post.coverImage,
    noindex: post.noindex,
    canonicalUrl: post.canonicalUrl,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
  });
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const data = await getPost(slug);
  if (!data) notFound();

  const { post, related } = data;

  const schemas: Array<Record<string, unknown>> = [
    articleSchema(post),
    breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: post.title },
    ]),
  ];

  // Step-by-step guides get HowTo markup so assistants can render the steps.
  const steps = extractSteps(post.bodyHtml);
  if (steps.length >= 2) {
    schemas.push(
      howToSchema({
        name: post.title,
        description: post.excerpt ?? '',
        url: `/blog/${post.slug}`,
        steps,
      }),
    );
  }

  const faqLd = faqSchema(post.faqs);
  if (faqLd) schemas.push(faqLd);

  return (
    <>
      <JsonLd data={schemas} />

      <article>
        {/* One image for every article rather than per-post covers: only 2 of
            50 posts have one, and both point at remote WordPress URLs that the
            CSP blocks. The picture is abstract so it does not fight 50
            different subjects. */}
        <section className="page-hero page-hero-dark">
          <PageHeroImage src="/images/hero-article.jpg" />
          <div className="wrap article-wrap">
            <Breadcrumb
              items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.title }]}
            />
            <div className="article-meta">
              {post.category && <span className="cat-pill">{post.category.name}</span>}
              {post.author ? (
                <Link href={`/about/${post.author.slug}`} className="article-byline">
                  {post.author.name}
                </Link>
              ) : (
                <span>{post.authorName}</span>
              )}
              <span aria-hidden="true">·</span>
              {post.publishedAt && (
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              )}
              <span aria-hidden="true">·</span>
              <span>{post.readMinutes} min read</span>
            </div>
            <h1 style={{ maxWidth: '100%' }}>{post.title}</h1>
            {post.excerpt && (
              <p className="lede" style={{ maxWidth: '100%' }}>
                {post.excerpt}
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="wrap article-wrap">
            {/* Sanitised on write by the admin API and the WordPress importer. */}
            <div className="article-body" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

            {post.faqs.length > 0 && (
              <div style={{ marginTop: 44 }}>
                <h2 style={{ fontSize: 24, marginBottom: 18 }}>Frequently asked questions</h2>
                <FaqAccordion items={post.faqs} />
              </div>
            )}

            {post.author && (
              <aside className="author-box">
                <div className="author-box-head">
                  <span className="eyebrow">Written by</span>
                  <Link href={`/about/${post.author.slug}`}>{post.author.name}</Link>
                  {post.author.role && <span className="author-box-role">{post.author.role}</span>}
                </div>
                {post.author.bio && <p>{post.author.bio}</p>}
                {post.author.credentials.length > 0 && (
                  <ul className="author-credentials">
                    {post.author.credentials.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
                <Link className="lnk" href={`/about/${post.author.slug}`}>
                  All articles by {post.author.name} →
                </Link>
              </aside>
            )}

            {/* WP5.2: the primary action is the free health check, not the
                contact form. A specific, free, scoped offer converts far better
                than "get in touch" — and that page previously received no
                internal links from any article at all. */}
            <div className="article-cta">
              <div>
                <h2>Want this checked on your own instance?</h2>
                <p>
                  Our free 20-point SQL Server health check covers one instance — configuration,
                  backups, security and patch currency — with a written report. No obligation.
                </p>
              </div>
              <div className="article-cta-actions">
                <Link className="btn btn-primary" href="/free-20-point-sql-server-health-check">
                  Book the free health check
                </Link>
                <Link className="btn btn-outline" href="/contact">
                  Ask a question instead
                </Link>
              </div>
            </div>
          </div>
        </section>
      </article>

      {related.length > 0 && (
        <section className="alt-bg">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">Related</div>
              <h2>More from the team</h2>
            </div>
            <div className="card-grid">
              {related.map((r) => (
                <article className="mcard" key={r.slug}>
                  <div className="body notag">
                    <h3>
                      <Link href={`/blog/${r.slug}`}>{r.title}</Link>
                    </h3>
                    <p>{r.excerpt}</p>
                    <Link className="lnk" href={`/blog/${r.slug}`}>
                      Read article ›
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="cta-band">
        <div className="wrap">
          <h2>Need a hand with your environment?</h2>
          <p>Talk to a senior consultant — free 30-minute consultation, no obligation.</p>
          <Link className="btn btn-white" href="/contact">
            Book Your Free Consultation
          </Link>
        </div>
      </div>
    </>
  );
}
