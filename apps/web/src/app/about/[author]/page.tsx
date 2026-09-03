import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getAuthor } from '@/lib/api';
import { buildMetadata, personSchema, breadcrumbSchema } from '@/lib/seo';
import { Breadcrumb } from '@/components/Breadcrumb';
import { JsonLd } from '@/components/JsonLd';
import { BlogCard } from '@/components/BlogCard';

/**
 * Author profile.
 *
 * Exists so the Person referenced by every article's JSON-LD resolves to a
 * real URL. A `sameAs` or an `@id` pointing at a 404 is worse than omitting
 * the author markup altogether.
 *
 * Note this does not shadow /about — that is a CMS page served by [slug], and
 * this route only matches a second path segment.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 300;

type Props = { params: Promise<{ author: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { author: slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return { title: 'Author not found' };

  return buildMetadata({
    title: `${author.name}${author.role ? ` — ${author.role}` : ''}`,
    description:
      author.bio?.slice(0, 155) ??
      `Articles by ${author.name} on database administration, performance and recovery.`,
    path: `/about/${author.slug}`,
    ogImage: author.photo,
  });
}

export default async function AuthorPage({ params }: Props) {
  const { author: slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();

  return (
    <>
      <JsonLd
        data={[
          personSchema(author),
          breadcrumbSchema([{ name: 'Home', url: '/' }, { name: author.name }]),
        ]}
      />

      <section className="page-hero">
        <div className="wrap">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: author.name }]} />
          <h1>{author.name}</h1>
          {author.role && <p className="lede">{author.role}</p>}
        </div>
      </section>

      <section className="section">
        <div className="wrap author-profile">
          {author.photo && (
            <Image
              src={author.photo}
              alt={author.name}
              width={120}
              height={120}
              className="author-photo"
            />
          )}

          <div className="author-detail">
            {author.bio && <p className="author-bio">{author.bio}</p>}

            {author.credentials.length > 0 && (
              <ul className="author-credentials">
                {author.credentials.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}

            {(author.linkedIn || author.website) && (
              <p className="author-links">
                {author.linkedIn && (
                  <a href={author.linkedIn} target="_blank" rel="noopener noreferrer me">
                    LinkedIn
                  </a>
                )}
                {author.website && (
                  <a href={author.website} target="_blank" rel="noopener noreferrer me">
                    Website
                  </a>
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="section alt-bg">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Articles</div>
            <h2>
              {author.posts.length} {author.posts.length === 1 ? 'article' : 'articles'} by{' '}
              {author.name}
            </h2>
          </div>

          {author.posts.length === 0 ? (
            <p style={{ color: 'var(--gray)' }}>No published articles yet.</p>
          ) : (
            <div className="blog-grid">
              {author.posts.map((post) => (
                // h3 here: this grid sits under the section's own h2.
                <BlogCard key={post.slug} post={post} headingLevel="h3" />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
