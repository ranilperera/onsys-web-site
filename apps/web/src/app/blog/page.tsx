import type { Metadata } from 'next';
import Link from 'next/link';
import { getPosts, getCategories } from '@/lib/api';
import { BlogCard } from '@/components/BlogCard';
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

type Props = { searchParams: Promise<{ category?: string; page?: string }> };

/**
 * Keep paginated and filtered views out of the index.
 *
 * This was a static `metadata` export, so every one of /blog?page=1..5 shipped
 * the same title, the same description and a canonical pointing at /blog —
 * and Google indexed them anyway. A canonical is a hint on a URL that returns
 * different content; noindex is not, which is what these need.
 *
 * `follow` stays on deliberately: pages two onward are the only crawl path to
 * older articles, so removing them from the index must not remove the route
 * to the posts they list. The canonical is self-referencing rather than
 * pointing at /blog, because claiming to be a duplicate of a page while also
 * refusing indexing sends a crawler two different instructions.
 *
 * ?category= gets the same treatment: it is a faceted view of the same list,
 * and the sitemap comment below already explains why those are not listed.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page, category } = await searchParams;
  const pageNumber = Number(page) || 1;
  const isFiltered = pageNumber > 1 || Boolean(category);

  const base = buildMetadata({
    title: 'Database & Cloud Blog | SQL Server, Oracle, Azure',
    description:
      'Hands-on guides from Australian DBAs and engineers — SQL Server, Oracle, PostgreSQL, Azure and AWS troubleshooting, tuning and migration walkthroughs.',
    path: '/blog',
  });

  if (!isFiltered) return base;

  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (pageNumber > 1) query.set('page', String(pageNumber));
  const self = `${siteConfig.url}/blog?${query.toString()}`;

  return {
    ...base,
    title: pageNumber > 1 ? `Database & Cloud Blog — page ${pageNumber}` : base.title,
    alternates: { canonical: self },
    robots: { index: false, follow: true },
  };
}

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
            {/* Empty categories are hidden rather than rendered as chips that
                lead to "No posts published yet". The count is a published-only
                count from the API, so a category holding nothing but drafts is
                correctly treated as empty. A category with no count at all is
                shown — an older API response should not blank the filter row. */}
            {categories
              .filter((c) => c._count === undefined || c._count.posts > 0)
              .map((c) => (
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
                <BlogCard key={post.slug} post={post} />
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
