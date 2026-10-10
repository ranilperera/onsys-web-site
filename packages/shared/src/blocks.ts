/**
 * Section blocks — the vocabulary the CMS uses to compose a page.
 * Each block maps 1:1 to a React component in apps/web/src/components/blocks.
 * Adding a block means: add the schema here, add the renderer there.
 */
import { z } from 'zod';

const linkSchema = z.object({ label: z.string(), href: z.string() });

const cardSchema = z.object({
  title: z.string(),
  body: z.string(),
  icon: z.string().optional(),
  coverColor: z.string().optional(),
  link: linkSchema.optional(),
  tag: z.string().optional(),
  /// A line of attribution under the title, e.g. "Manufacturing · Sri Lanka
  /// · 2024". Separate from `tag`, which is the coloured label above the
  /// title: a card uses one or the other, not both.
  meta: z.string().optional(),
  /// Short labels rendered as one separated line below the body, e.g. the
  /// platforms an engagement used. An array rather than a joined string so the
  /// separator is the renderer's decision and stays consistent site-wide.
  chips: z.array(z.string()).optional(),
});

export const blockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hero'),
    eyebrow: z.string().optional(),
    heading: z.string(),
    highlight: z.string().optional(),
    body: z.string().optional(),
    /// Full-bleed background photo, e.g. /images/hero-home.jpg. When set the
    /// hero switches to its dark treatment: a navy scrim over the image and
    /// white type, because navy-on-photo is unreadable.
    backgroundImage: z.string().optional(),
    videoUrl: z.string().optional(),
    ctas: z.array(linkSchema).default([]),
    /// Short platform list rendered under the body, e.g.
    /// "SQL Server · Oracle · PostgreSQL". Kept separate from `body` so it can
    /// be styled as a credential strip rather than prose.
    platforms: z.string().optional(),
    /// Additional hero variants to rotate through. The block's own fields are
    /// slide one, so a hero with no slides behaves exactly as before and the
    /// first paint is always server-rendered rather than chosen on the client.
    slides: z
      .array(
        z.object({
          eyebrow: z.string().optional(),
          heading: z.string(),
          highlight: z.string().optional(),
          body: z.string().optional(),
          platforms: z.string().optional(),
          backgroundImage: z.string().optional(),
          ctas: z.array(linkSchema).default([]),
        }),
      )
      .default([]),
  }),
  z.object({
    type: z.literal('quicklinks'),
    items: z.array(z.object({ label: z.string(), href: z.string(), icon: z.string(), color: z.string() })),
  }),
  z.object({
    type: z.literal('cardGrid'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
    /// Optional id so menu items can deep-link to this section.
    anchor: z.string().optional(),
    centered: z.boolean().default(false),
    altBackground: z.boolean().default(false),
    columns: z.number().int().min(1).max(4).default(3),
    cards: z.array(cardSchema),
  }),
  z.object({
    type: z.literal('checkList'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
    /// Optional id so in-page navigation can target this section.
    anchor: z.string().optional(),
    items: z.array(z.string()),
    sidebar: z
      .object({ title: z.string(), rows: z.array(z.object({ label: z.string(), value: z.string() })) })
      .optional(),
  }),
  z.object({
    type: z.literal('steps'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
    /// Optional id so menu items can deep-link to this section.
    anchor: z.string().optional(),
    steps: z.array(z.object({ title: z.string(), body: z.string() })),
  }),
  z.object({
    type: z.literal('pricing'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
    note: z.string().optional(),
    /// Unique id so a page can carry several pricing sections without
    /// duplicating `id="pricing"` in the DOM.
    anchor: z.string().optional(),
    altBackground: z.boolean().default(true),
    columns: z.number().int().min(2).max(3).default(2),
    plans: z.array(
      z.object({
        name: z.string(),
        /// The headline figure on its own, e.g. "$1,500" or "POA".
        price: z.string(),
        /// Billing unit shown beside the figure, e.g. "per month (up to 30 users)".
        unit: z.string().optional(),
        /// One-line positioning statement above the feature list.
        description: z.string().optional(),
        featured: z.boolean().default(false),
        badge: z.string().optional(),
        /// Heading for the feature list — "Key features", "What's included".
        featuresTitle: z.string().optional(),
        /// A plain string, or a labelled row so "Expertise across: …" keeps its
        /// emphasis without embedding HTML in the CMS.
        features: z.array(z.union([z.string(), z.object({ label: z.string(), text: z.string() })])),
        cta: linkSchema,
        /**
         * Show a two-field enquiry on the card instead of only a link.
         *
         * Every plan card sent people to the generic contact form, which asked
         * for name, email, company, phone, service and a message before anyone
         * could ask what a plan would cost them. The enquiry asks for a work
         * email and an instance count, records which plan was being looked at,
         * and offers a sizing call — the plan name is the one thing the contact
         * form could never capture.
         *
         * The `cta` stays and is rendered alongside, because some visitors
         * want the detail page before they want a conversation.
         */
        /*
         * `.optional()` rather than `.default(false)` on purpose. Block is
         * zod's *output* type, so a defaulted field becomes required on it —
         * which would mean adding `enquiry: false` to all twenty existing plan
         * cards in the seed to satisfy the compiler, for no behavioural gain.
         */
        enquiry: z.boolean().optional(),
      }),
    ),
  }),
  /**
   * Testimonials.
   *
   * Five consecutive SEO reports recorded zero testimonials on this site while
   * every competitor that outranks it shows named clients. This is the block
   * that fixes that when quotes exist.
   *
   * `attribution` is deliberately one free-text field rather than separate
   * name/role/company fields. A quote can be attributed as "IT Manager,
   * Australian healthcare group" when the client will not be named, and that
   * has to be as easy to enter as a full name — otherwise the pressure is to
   * leave the fields blank or to invent something to fill them.
   *
   * There is no `rating`, and no Review schema is emitted. AggregateRating on
   * testimonials that were never collected as reviews is the kind of markup
   * that earns a manual action.
   */
  z.object({
    type: z.literal('testimonial'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
    anchor: z.string().optional(),
    altBackground: z.boolean().default(false),
    quotes: z.array(
      z.object({
        /// The quote itself, without surrounding quotation marks — the markup
        /// supplies those, so a pasted quote cannot end up double-quoted.
        quote: z.string(),
        /// "IT Manager, Australian healthcare group" or a name and title.
        attribution: z.string(),
        /// Optional second line: sector, region, or which service it concerns.
        context: z.string().optional(),
        /// Path under /public. Omitted for an anonymous attribution.
        logo: z.string().optional(),
      }),
    ),
  }),
  /**
   * Product catalogue. Each entry is a self-contained card with its own
   * "more info" destination, which may be an external product site. Adding a
   * future product is a content edit — the grid reflows to any number of them.
   */
  z.object({
    type: z.literal('productGrid'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
    anchor: z.string().optional(),
    altBackground: z.boolean().default(false),
    products: z.array(
      z.object({
        name: z.string(),
        /// Short positioning line under the name.
        tagline: z.string().optional(),
        body: z.string(),
        /// Award, partner status or "new" flag shown as a pill.
        badge: z.string().optional(),
        icon: z.string().optional(),
        coverColor: z.string().optional(),
        features: z.array(z.string()).default([]),
        /// Primary "More info" action — usually the product's own site.
        cta: linkSchema,
        /// Secondary action, normally a route into the contact form.
        secondaryCta: linkSchema.optional(),
      }),
    ),
  }),
  /**
   * A wall of credential or partner logos. `image` is optional so a credential
   * can still be listed while its artwork is being sourced.
   */
  z.object({
    type: z.literal('logoGrid'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
    anchor: z.string().optional(),
    altBackground: z.boolean().default(false),
    note: z.string().optional(),
    logos: z.array(
      z.object({
        name: z.string(),
        /// Path under /public, e.g. /certifications/vmware-vcp-dcv.png
        image: z.string().optional(),
        alt: z.string().optional(),
        issuer: z.string().optional(),
      }),
    ),
  }),
  z.object({
    type: z.literal('faq'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    items: z.array(z.object({ question: z.string(), answer: z.string() })),
  }),
  z.object({
    type: z.literal('stats'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    stats: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
  z.object({
    type: z.literal('platformChips'),
    eyebrow: z.string().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
    /// Optional id so menu items can deep-link to this section.
    anchor: z.string().optional(),
    groups: z.array(
      z.object({
        title: z.string(),
        chips: z.array(
          z.object({
            label: z.string(),
            /// Vendor accent colour, used to tint the glyph.
            color: z.string(),
            /// Sprite id describing what kind of technology this is
            /// (t-cluster, t-migrate, …). Falls back to a neutral mark.
            icon: z.string().optional(),
          }),
        ),
      }),
    ),
    sidebar: z.object({ title: z.string(), items: z.array(z.string()) }).optional(),
  }),
  z.object({
    type: z.literal('richText'),
    heading: z.string().optional(),
    html: z.string(),
  }),
  z.object({
    type: z.literal('ctaBand'),
    heading: z.string(),
    body: z.string().optional(),
    cta: linkSchema,
  }),
  z.object({
    type: z.literal('contactForm'),
    heading: z.string().optional(),
    body: z.string().optional(),
  }),
  /**
   * Prepaid incident block: details, payment, then how to reach us.
   *
   * The price lives in Stripe, not here. A number typed into page content is
   * one that can silently disagree with what the customer is actually charged,
   * and the checkout is the side that has to be right.
   */
  /**
   * An in-body link from an article to the service it relates to.
   *
   * Service links previously appeared only in the global footer, so genuine
   * practitioner writing converted nothing. Editors drop one of these into a
   * post to point at the relevant money page — with a descriptive anchor,
   * which is worth far more than "click here" both to a reader and to a
   * crawler working out what the target page is about.
   */
  /**
   * Health check request form.
   *
   * Captures the SQL Server version alongside the usual contact fields,
   * because the version decides which of the twenty checks apply and whether
   * the instance is past end of support — which is often the finding before
   * anyone runs a query.
   */
  z.object({
    type: z.literal('healthCheckBooking'),
    eyebrow: z.string().optional(),
    heading: z.string(),
    body: z.string().optional(),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('relatedService'),
    eyebrow: z.string().optional(),
    heading: z.string(),
    body: z.string(),
    cta: linkSchema,
  }),
  z.object({
    type: z.literal('emergencyCheckout'),
    /**
     * 'contact' captures details and books a Teams session; 'payment' sends the
     * same details through Stripe first.
     *
     * Kept as a switch rather than two block types because the difference is
     * one step in the same funnel, and the paid path is wired end to end ready
     * for prepaid hour bundles.
     */
    mode: z.enum(['contact', 'payment']).default('contact'),
    eyebrow: z.string().optional(),
    heading: z.string(),
    body: z.string().optional(),
    /** Shown beside the form so nobody reaches Stripe unsure what they are buying. */
    summary: z
      .object({
        title: z.string(),
        rows: z.array(z.object({ label: z.string(), value: z.string() })),
        note: z.string().optional(),
      })
      .optional(),
    steps: z
      .array(z.object({ title: z.string(), body: z.string() }))
      .default([]),
  }),
]);

export type Block = z.infer<typeof blockSchema>;
export const blocksSchema = z.array(blockSchema);
