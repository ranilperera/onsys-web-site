import Image from 'next/image';

/**
 * Full-bleed photograph behind a page header, plus the navy scrim that keeps
 * white type readable over it.
 *
 * The parent <section> must carry `page-hero-dark` (and be positioned), which
 * is what switches the header's own type to its light-on-dark palette. This is
 * a component rather than repeated markup so the scrim, the loading priority
 * and the sizes hint stay identical on every page that uses one.
 */
export function PageHeroImage({ src }: { src: string }) {
  return (
    <>
      <Image className="page-hero-bg" src={src} alt="" fill priority sizes="100vw" quality={80} />
      <div className="page-hero-scrim" aria-hidden="true" />
    </>
  );
}
