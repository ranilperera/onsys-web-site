import type { Metadata } from 'next';
import { siteConfig } from './config';
import type { PageRecord, PostRecord, Faq } from './api';

/**
 * SEO + AEO (answer engine optimisation).
 *
 * SEO gets the page ranked. AEO gets it *quoted* by AI assistants and featured
 * snippets — which needs explicit question/answer pairs, unambiguous entity
 * markup, and crawlable facts rather than marketing prose. Both are handled
 * here so every route gets consistent treatment.
 */

const absoluteUrl = (path: string): string =>
  path.startsWith('http') ? path : `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`;

const DEFAULT_OG = '/og-default.png';

export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  ogImage?: string | null;
  noindex?: boolean;
  canonicalUrl?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
}): Metadata {
  const url = opts.canonicalUrl || absoluteUrl(opts.path);
  const image = absoluteUrl(opts.ogImage || DEFAULT_OG);

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: opts.noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
        },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: opts.type ?? 'website',
      images: [{ url: image, width: 1200, height: 630, alt: opts.title }],
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
      ...(opts.modifiedTime ? { modifiedTime: opts.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}

// ---------------------------------------------------------------
// JSON-LD builders
// ---------------------------------------------------------------

export function organizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.png') },
    description: siteConfig.description,
    email: siteConfig.email,
    telephone: siteConfig.phone,
    identifier: { '@type': 'PropertyValue', name: 'ABN', value: siteConfig.abn },
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.locality,
      addressRegion: siteConfig.address.region,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.country,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: siteConfig.phoneE164,
        contactType: 'customer service',
        email: siteConfig.email,
        areaServed: 'AU',
        availableLanguage: ['en'],
      },
      {
        // The office keeps business hours; incident support does not. Stating
        // the 24/7 window here stops the LocalBusiness opening hours from
        // being read as the limit of when Onsys can be reached.
        '@type': 'ContactPoint',
        telephone: siteConfig.phoneE164,
        contactType: 'technical support',
        email: siteConfig.email,
        areaServed: 'AU',
        availableLanguage: ['en'],
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '00:00',
          closes: '23:59',
        },
      },
    ],
    sameAs: Object.values(siteConfig.social).filter((v) => v !== '#'),
    areaServed: { '@type': 'Country', name: 'Australia' },
    // Third-party recognition is one of the few entity signals an assistant
    // can verify externally, so it is worth stating explicitly.
    award: [
      'BRONZE Winner — National Best Quality Software Awards (NBQSA) 2025, for OnsysConnect',
      'Second Runner-up — APICTA 2025, for OnsysConnect',
    ],
    knowsAbout: [
      'Microsoft SQL Server',
      'Oracle Database',
      'PostgreSQL',
      'EnterpriseDB',
      'MySQL',
      'MariaDB',
      'MongoDB',
      'Azure SQL Database',
      'Azure SQL Managed Instance',
      'Microsoft Azure',
      'Amazon Web Services',
      'Oracle Cloud Infrastructure',
      'Database administration',
      'Remote DBA services',
      'Managed IT services',
      'Cyber security',
      'Managed endpoint detection and response',
      'Cloud migration',
      'Custom software development',
      'Artificial intelligence',
    ],
  };
}

/** LocalBusiness gives us the Melbourne map pack and "near me" queries. */
export function localBusinessSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${siteConfig.url}/#localbusiness`,
    name: siteConfig.name,
    image: absoluteUrl('/logo.png'),
    url: siteConfig.url,
    telephone: siteConfig.phoneE164,
    email: siteConfig.email,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.locality,
      addressRegion: siteConfig.address.region,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.country,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '17:00',
      },
    ],
  };
}

export function websiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    publisher: { '@id': `${siteConfig.url}/#organization` },
    inLanguage: 'en-AU',
  };
}

/**
 * A WebPage node ties the page to the Organization and WebSite entities via
 * @id, so a crawler reads one connected graph instead of three loose objects.
 * `speakable` marks the passages a voice assistant should read aloud.
 */
export function webPageSchema(opts: {
  name: string;
  description: string;
  path: string;
  modified?: string | null;
  speakableSelectors?: string[];
}): Record<string, unknown> {
  const url = absoluteUrl(opts.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': `${siteConfig.url}/#website` },
    about: { '@id': `${siteConfig.url}/#organization` },
    primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl(DEFAULT_OG) },
    inLanguage: 'en-AU',
    ...(opts.modified ? { dateModified: opts.modified } : {}),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: opts.speakableSelectors ?? ['h1', '.faq-a'],
    },
  };
}

/** "$1,500" -> 1500. Returns null for POA / "Custom quote" style values. */
function parsePrice(price: string): number | null {
  const digits = price.replace(/[^0-9.]/g, '');
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Turns the pricing blocks of a CMS page into an OfferCatalog.
 *
 * Built from the page's own blocks rather than a hardcoded list, so the
 * published prices and the structured data can never drift apart. This is what
 * lets an assistant answer "how much does Onsys DBA support cost" with a real
 * figure instead of "contact them for a quote".
 */
export function offerCatalogSchema(page: PageRecord): Record<string, unknown> | null {
  const offers = page.blocks
    .filter((block) => block.type === 'pricing')
    .flatMap((block) =>
      block.plans.map((plan) => {
        const value = parsePrice(plan.price);
        if (value === null) return null;
        const perHour = /hour|hr/i.test(plan.unit ?? '');

        return {
          '@type': 'Offer',
          name: plan.name,
          ...(plan.description ? { description: plan.description } : {}),
          category: block.heading ?? page.title,
          url: `${absoluteUrl(`/${page.slug}`)}${block.anchor ? `#${block.anchor}` : ''}`,
          availability: 'https://schema.org/InStock',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: value,
            priceCurrency: 'AUD',
            // Every published Onsys price excludes GST — saying so prevents an
            // assistant quoting the figure as a tax-inclusive total.
            valueAddedTaxIncluded: false,
            unitText: plan.unit ?? (perHour ? 'per hour' : 'per month'),
            referenceQuantity: {
              '@type': 'QuantitativeValue',
              value: 1,
              unitCode: perHour ? 'HUR' : 'MON',
            },
          },
        };
      }),
    )
    .filter((offer): offer is NonNullable<typeof offer> => offer !== null);

  if (offers.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    // Keyed to the page the prices live on, so a page that republishes another
    // page's catalog (the home page does) reuses the same node rather than
    // colliding with it.
    '@id': `${absoluteUrl(`/${page.slug}`)}#support-plans`,
    name: `${page.title} — plans and rates`,
    serviceType: 'Managed IT and database support',
    description: page.seoDescription || page.lede || '',
    provider: { '@id': `${siteConfig.url}/#organization` },
    areaServed: { '@type': 'Country', name: 'Australia' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Support plans and rates',
      itemListElement: offers,
    },
  };
}

/**
 * Marks the product catalogue up as an ItemList of SoftwareApplication nodes,
 * built from the page's own productGrid block so a new product appears in the
 * structured data the moment it is added to the CMS.
 */
export function productListSchema(page: PageRecord): Record<string, unknown> | null {
  const products = page.blocks
    .filter((block) => block.type === 'productGrid')
    .flatMap((block) => block.products);

  if (products.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${absoluteUrl(`/${page.slug}`)}#products`,
    name: page.title,
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: product.name,
        ...(product.tagline ? { alternateName: product.tagline } : {}),
        description: product.body,
        url: product.cta.href,
        applicationCategory: 'BusinessApplication',
        provider: { '@id': `${siteConfig.url}/#organization` },
        ...(product.features.length > 0 ? { featureList: product.features } : {}),
      },
    })),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url?: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: absoluteUrl(item.url) } : {}),
    })),
  };
}

/**
 * FAQPage is the single highest-leverage AEO markup: it is what assistants
 * and featured snippets lift answers from verbatim.
 */
export function faqSchema(faqs: Array<Pick<Faq, 'question' | 'answer'>>): Record<string, unknown> | null {
  if (faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function serviceSchema(page: PageRecord): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: page.title,
    description: page.seoDescription || page.lede || '',
    url: absoluteUrl(`/${page.slug}`),
    provider: { '@id': `${siteConfig.url}/#organization` },
    areaServed: { '@type': 'Country', name: 'Australia' },
    serviceType: page.title,
  };
}

export function articleSchema(post: PostRecord): Record<string, unknown> {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.seoDescription || post.excerpt || '',
    url,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: post.authorName, url: siteConfig.url },
    publisher: { '@id': `${siteConfig.url}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(post.coverImage ? { image: absoluteUrl(post.coverImage) } : {}),
    ...(post.category ? { articleSection: post.category.name } : {}),
    inLanguage: 'en-AU',
    timeRequired: `PT${post.readMinutes}M`,
  };
}

/**
 * HowTo markup for step-by-step guides. Assistants use this to render
 * numbered instructions directly, so a tutorial that has it is far more
 * likely to be surfaced than one that doesn't.
 */
export function howToSchema(opts: {
  name: string;
  description: string;
  url: string;
  steps: Array<{ name: string; text: string }>;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    step: opts.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${absoluteUrl(opts.url)}#step-${i + 1}`,
    })),
  };
}

/** Extract `<h2 id="...">` headings from post HTML to auto-generate HowTo steps. */
export function extractSteps(html: string): Array<{ name: string; text: string }> {
  const steps: Array<{ name: string; text: string }> = [];
  const headingRegex = /<h2[^>]*>(.*?)<\/h2>([\s\S]*?)(?=<h2|$)/g;

  for (const match of html.matchAll(headingRegex)) {
    const name = match[1].replace(/<[^>]+>/g, '').trim();
    if (!/^step\s*\d/i.test(name)) continue;

    const text = match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);

    if (name && text) steps.push({ name, text });
  }
  return steps;
}
