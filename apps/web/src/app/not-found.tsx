import { PageHero } from '@/components/PageHero';

export default function NotFound() {
  return (
    <PageHero
      style={{ minHeight: '52vh' }}
      eyebrow="Error 404"
      title="We couldn't find that page"
      lede="The page may have moved during our site rebuild. Try the links below, or get in touch and we'll point you the right way."
      ctas={[
        { label: 'Back to home', href: '/' },
        { label: 'Contact us', href: '/contact' },
      ]}
    />
  );
}
