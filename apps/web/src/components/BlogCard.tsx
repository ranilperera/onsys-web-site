import Link from 'next/link';

export interface BlogCardPost {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  readMinutes: number;
  category: { name: string; color: string } | null;
}

/**
 * One post in a listing grid.
 *
 * Shared by /blog and the author profile so the two cannot drift — they were
 * already using different class names for the same card, and one of them was
 * rendering unstyled as a result.
 *
 * The title sits inside the coloured panel rather than under it. The panel was
 * otherwise an empty block of category colour taking the top third of every
 * card, which pushed the one thing a reader scans for below the fold of the
 * card itself.
 */
export function BlogCard({
  post,
  headingLevel: Heading = 'h2',
}: {
  post: BlogCardPost;
  /** h2 on a listing whose grid follows the page h1; h3 under a section h2. */
  headingLevel?: 'h2' | 'h3';
}) {
  const href = `/blog/${post.slug}`;

  return (
    <article className="blog-card">
      <Link
        className="blog-cover"
        href={href}
        style={post.category ? { background: post.category.color } : undefined}
      >
        {post.category && <span className="cat-tag">{post.category.name}</span>}
        <Heading className="blog-cover-title">{post.title}</Heading>
      </Link>

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

        {post.excerpt && <p>{post.excerpt}</p>}

        <Link className="lnk" href={href} tabIndex={-1} aria-hidden="true">
          Read article ›
        </Link>
      </div>
    </article>
  );
}
