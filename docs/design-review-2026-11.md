# Onsys website — design review (4 Nov 2026)

Scope: front-end design of `apps/web` (Next.js 15, React 19, one hand-written stylesheet
`src/app/globals.css`, ~1,315 lines). Reviewed from code. The live site
(www.onsys.com.au) returned **502 Bad Gateway** during the review, so no visual pass was possible.

## How the design is built

- **Styling:** plain global CSS, no Tailwind or CSS modules. Colours in `:root` variables
  (navy `#0E336A`, orange `#FF8B00`, gold, green, Microsoft-Fluent-style greys).
- **Fonts:** Plus Jakarta Sans (headings) + DM Sans (body), self-hosted via `next/font`.
- **Pages are CMS-driven:** almost every page is a list of "blocks" stored in PostgreSQL and
  rendered by `components/blocks/BlockRenderer.tsx` (hero, cardGrid, pricing, steps, stats,
  logoGrid, faq, ctaBand, richText, etc. — 18 block types). Changing a block's CSS changes
  it on every page that uses it.
- **Layout shell:** topbar (email/phone/Book a call) → sticky header with mega-menus →
  page blocks → footer → floating chat widget.

## What is good

- Consistent shell, sensible max width (1240px), clear brand palette.
- Accessibility basics present: skip link, visible focus rings, keyboard-operable mega-menu,
  `prefers-reduced-motion` respected, form error states.
- Responsive breakpoints at 1024 / 900 / 700 / 480 px, with real thought given to mobile nav.
- Well-commented CSS — design intent is documented next to each rule.

## Issues, by priority

### High — accessibility / brand colour contrast (WCAG AA needs 4.5:1 for normal text)

| Use | Ratio | Result |
|---|---|---|
| White text on orange `#FF8B00` (primary buttons, topbar CTA, badges, chat send) | 2.35 | Fails |
| Orange text on white (`.eyebrow` section labels, mega-menu headings) | 2.35 | Fails |
| Orange-dark `#D87600` text on white (card links, tags) | 3.23 | Fails |
| White heading on gold end of the CTA band gradient | 1.79 | Fails |
| Footer legal text `#8A8886` on `#F3F2F1` | 3.16 | Fails |

The orange is the main call-to-action colour, so this affects every page. Fix options:
darken the orange for text/buttons (≈ `#B85C00` reaches 4.5:1 with white), or use navy
text on orange buttons; make the CTA band darker or use navy type on it.

### High — too many hero variants

Six hero styles exist: `.hero` (light), `.hero-dark`, `.hero-dark.hero-single`,
`.hero-rotator`, `.page-hero` (light), `.page-hero-dark`, plus `.cs-hero` overrides. Each has
its own heading size (64 / 54 / 46 / 44 / 42 / 38 px) and its own scrim gradient. Recent
commits have been converging on "the same hero every page uses" — worth finishing that:
one hero component with 2 sizes (home / inner).

### Medium — no real type or spacing scale

- **33 different font sizes** in the stylesheet, many half-pixel steps
  (10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5…). Suggest ~8 tokens
  (e.g. 12 / 14 / 16 / 18 / 22 / 28 / 36 / 52).
- **8 border-radius values** (2, 4, 6, 8, 10, 12, 14, 999). Suggest 3: 6 / 12 / pill.
- **64 distinct hex colours** hard-coded alongside the variables. Many are near-duplicate
  pale blues/greys (`#F8FAFC`, `#FAFBFD`, `#F3F7FD`, `#EAF1FB`, `#F4F6FA`…).
- Shadows are each one-off values.

Putting these into `:root` tokens first makes every later design change faster and safer.

### Medium — visual identity

- Greys are Microsoft Fluent's (`#605E5C`, `#3B3A39`, `#E1DFDD`, `#FAF9F8`), so parts of the
  site read as "Microsoft template" rather than Onsys.
- Service cards (`.mcard .cover`) are a flat colour block with a single 46px icon — generic
  and space-hungry. Photography exists for heroes but not cards.
- Body copy is small for a marketing site: most card/list text is 13.5px, article text
  15.5px. 16px+ would read better.
- Header logo is 64px tall plus a topbar → ~120px of chrome before content on desktop.

### Low — code hygiene that affects design work

- Admin console CSS (~250 lines) ships in the same public stylesheet as the marketing site.
- `.article-body .table-scroll` is defined twice with conflicting margins (lines 341 / 346).
- `.plan-enquiry input[name="website"]` duplicates the shared `.hp-field` honeypot.
- Inline `style={{}}` in ~30 places (ContactForm has 11), e.g. card cover colours —
  these bypass the stylesheet and responsive rules.
- FAQ answers are capped at `max-height:600px`; a long answer will be clipped.
- No dark mode (fine to leave, just noting).

## Recommended order of work

1. **Design tokens** — colour, type, spacing, radius, shadow variables in `:root`; replace
   hard-coded values. No visual change yet, but everything after is easier.
2. **Contrast fix** for orange/gold (one variable change + CTA band).
3. **Unify heroes** into one component with home and inner sizes.
4. **Type scale bump** — larger body text, fewer sizes.
5. **Card redesign** (service cards, case study and blog cards) and refreshed neutral palette.
6. Split admin CSS out of the public bundle.

## To review visually

The live site was down (502). To preview locally the stack needs PostgreSQL with seed data
(`docker compose up`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`) — content
comes from the database, so the web app alone shows empty pages.
