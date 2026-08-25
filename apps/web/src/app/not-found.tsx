import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="page-hero" style={{ minHeight: '52vh' }}>
      <div className="wrap">
        <span className="eyebrow-pill">
          <span className="dot" aria-hidden="true" />
          Error 404
        </span>
        <h1>We couldn&apos;t find that page</h1>
        <p className="lede">
          The page may have moved during our site rebuild. Try the links below, or get in touch and
          we&apos;ll point you the right way.
        </p>
        <div className="page-hero-cta">
          <Link className="btn btn-primary" href="/">
            Back to home
          </Link>
          <Link className="btn btn-outline" href="/contact">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
