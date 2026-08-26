import type { Metadata } from 'next';
import Link from 'next/link';
import { getPosts, getCategories } from '@/lib/api';
import { buildMetadata, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/lib/config';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageHeroImage } from '@/components/PageHeroImage';
import { JsonLd } from '@/components/JsonLd';

// Content for this route lives in the database, which does not exist during
// `next build` — the Docker image is built before any database is running. Left
// as a default ISR route, Next bakes the empty (or 404) render into the image
// and serves it until the revalidate window expires, which reintroduces the
// problem on every rebuild. Rendering on request keeps it correct from the
// first hit; the underlying API fetch still carries its own revalidate, so the
// database is not queried per request.
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Database & Cloud Blog | SQL Server, Oracle, Azure',
  description:
    'Hands-on guides from Australian DBAs and engineers — SQL Server, Oracle, PostgreSQL, Azure and AWS troubleshooting, tuning and migration walkthroughs.',
  path: '/blog',
});

type Props = { searchParams: Promise<{ category?: string; page?: string }> };

export default async function BlogIndex({ searchParams }: Props) {
  const { category, page: pageParam } = await searchParams;
  const currentPage = Number(pageParam) || 1;

  const [{ posts, pagination }, categories] = await Promise.all([
    getPosts({ page: currentPage, category }),
    getCategories(),
  ]);

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Onsys Technologies Blog',
    url: `${siteConfig.url}/blog`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteConfig.url}/blog/${p.slug}`,
        name: p.title,
      })),
    },
  };

  return (
    <>
      <JsonLd data={[breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Blog' }]), listSchema]} />

      <section className="page-hero page-hero-dark">
        <PageHeroImage src="/images/hero-blog.jpg" />
        <div className="wrap">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} />
          <span className="eyebrow-pill">
            <span className="dot" aria-hidden="true" />
            Insights &amp; how-tos
          </span>
          <h1>Blog</h1>
          <p className="lede">
            Practical, hands-on guides from our database, cloud and software teams — the same kind of
            write-ups we lean on internally, shared for anyone running these platforms themselves.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <nav className="filter-row" aria-label="Filter posts by category">
            <Link className={`filter-chip${!category ? ' active' : ''}`} href="/blog">
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                className={`filter-chip${category === c.slug ? ' active' : ''}`}
                href={`/blog?category=${c.slug}`}
              >
                {c.name}
              </Link>
            ))}
          </nav>

          {posts.length === 0 ? (
            <p style={{ color: 'var(--gray)' }}>
              No posts published yet{category ? ' in this category' : ''}. Check back soon.
            </p>
          ) : (
            <div className="blog-grid">
              {posts.map((post) => (
                <article className="blog-card" key={post.slug}>
                  <div
                    className="blog-cover"
                    style={{ background: post.category?.color ?? 'var(--navy)' }}
                  >
                    {post.category && <span className="cat-tag">{post.category.name}</span>}
                    <svg aria-hidden="true">
                      <use href="#s-managed" />
                    </svg>
                  </div>
                  <div className="blog-body">
                    {post.publishedAt && (
                      <div className="blog-meta">
                        <time dateTime={post.publishedAt}>
                          {new Date(post.publishedAt).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </time>
                        {' · '}
                        {post.readMinutes} min read
                      </div>
                    )}
                    <h2 style={{ fontSize: 16.5, marginBottom: 10 }}>
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>
                    <p>{post.excerpt}</p>
                    <Link className="lnk" href={`/blog/${post.slug}`}>
                      Read article ›
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <nav
              aria-label="Pagination"
              style={{ display: 'flex', gap: 10, marginTop: 34, justifyContent: 'center' }}
            >
              {currentPage > 1 && (
                <Link
                  className="btn btn-outline"
                  href={`/blog?page=${currentPage - 1}${category ? `&category=${category}` : ''}`}
                >
                  ← Previous
                </Link>
              )}
              <span style={{ alignSelf: 'center', fontSize: 14, color: 'var(--gray)' }}>
                Page {currentPage} of {pagination.totalPages}
              </span>
              {currentPage < pagination.totalPages && (
                <Link
                  className="btn btn-outline"
                  href={`/blog?page=${currentPage + 1}${category ? `&category=${category}` : ''}`}
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>

      <div className="cta-band">
        <div className="wrap">
          <h2>Have a topic you&apos;d like us to cover?</h2>
          <p>Tell us what you&apos;re wrestling with and we may turn it into the next guide.</p>
          <Link className="btn btn-white" href="/contact">
            Get in Touch
          </Link>
        </div>
      </div>
    </>
  );
}
