import type { Metadata } from 'next';
import { BookingWidget } from '@/components/BookingWidget';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageHeroImage } from '@/components/PageHeroImage';
import { JsonLd } from '@/components/JsonLd';
import { siteConfig } from '@/lib/config';
import { breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Book a Free 30-Minute Consultation',
  description:
    'Pick a time that suits you and talk to a senior Onsys consultant on Microsoft Teams. No charge, no obligation, no lock-in contracts — just an honest read on your environment.',
  path: '/book',
});

// Live calendar availability is fetched client-side, so nothing here is stale.
export const dynamic = 'force-static';

const REASSURANCE = [
  {
    title: 'A senior consultant, not a salesperson',
    body: 'You are talking to someone who runs these environments for a living — so you get a technical answer, not a brochure.',
  },
  {
    title: 'Straight answer on fit and cost',
    body: 'By the end of the call you will know whether we can help and roughly what it would cost. Including when the answer is no.',
  },
  {
    title: 'Nothing committed',
    body: 'The call is free and there is no lock-in afterwards. If you want a written scope, we send one — that is the whole obligation.',
  },
];

export default function BookPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Book a consultation' }]),
          {
            '@context': 'https://schema.org',
            '@type': 'ReservationPackage',
            name: 'Free 30-minute IT and database consultation',
            provider: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
          },
        ]}
      />

      <section className="page-hero page-hero-dark">
        <PageHeroImage src="/images/hero-book.jpg" />
        <div className="wrap">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Book a consultation' }]} />
          <span className="eyebrow-pill">
            <span className="dot" aria-hidden="true" />
            Free · 30 minutes · Microsoft Teams
          </span>
          <h1>Book time with a consultant</h1>
          <p className="lede">
            Pick a slot from our live calendar and we will send you a Microsoft Teams link straight
            away. Bring your environment, your problem, or just a question you cannot get a straight
            answer to elsewhere.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <BookingWidget />
        </div>
      </section>

      <section className="alt-bg">
        <div className="wrap">
          <div className="section-head center">
            <div className="eyebrow">What to expect</div>
            <h2>Thirty minutes, genuinely useful</h2>
          </div>
          <div className="card-grid cols-3">
            {REASSURANCE.map((item) => (
              <div className="mcard" key={item.title}>
                <div className="body notag">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
