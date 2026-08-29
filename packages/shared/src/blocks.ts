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
]);

export type Block = z.infer<typeof blockSchema>;
export const blocksSchema = z.array(blockSchema);
