/**
 * Seeds the footer link table from the list that used to live in the web app's
 * config.
 *
 * Run once per environment when the nav_links migration is applied. Until the
 * table has rows the web app falls back to its built-in list, so the site
 * looks identical before and after — this script is what moves editing control
 * to the admin console without changing what a visitor sees.
 *
 * Idempotent: existing rows are left alone, so re-running it will not undo
 * edits made in the admin console.
 */
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/** Mirror of `navigation.footer` in apps/web/src/lib/config.ts. */
const FOOTER: Array<{ group: string; links: Array<{ label: string; href: string }> }> = [
  {
    group: 'Services',
    links: [
      { label: 'Managed SQL Server Support', href: '/managed-sql-server-support' },
      { label: 'SQL Server DBA Melbourne', href: '/sql-server-dba-melbourne' },
      { label: 'Remote Database Support', href: '/remote-database-support' },
      { label: 'Managed IT Services', href: '/managed-it-services' },
      { label: 'Cloud Migrations', href: '/cloud-migrations' },
      { label: 'Software Development', href: '/custom-software-development' },
      { label: 'AI Development & Solutions', href: '/artificial-intelligence-solutions' },
    ],
  },
  {
    group: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Our Expertise', href: '/expertise' },
      { label: 'Certifications', href: '/expertise#certifications' },
      { label: 'Products', href: '/products' },
      { label: 'Insights', href: '/blog' },
      { label: 'Careers', href: '/contact' },
    ],
  },
  {
    group: 'Support',
    links: [
      { label: 'Free SQL Server Health Check', href: '/free-20-point-sql-server-health-check' },
      { label: 'Book a Consultation', href: '/book' },
      { label: 'Emergency Database Support', href: '/emergency-database-support' },
      { label: 'Pricing & Plans', href: '/pricing-and-plans' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    group: 'Legal',
    links: [
      { label: 'Who Can Access Your Database', href: '/who-can-access-your-database' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Disclaimer', href: '/disclaimer' },
    ],
  },
];

async function main() {
  const existing = await prisma.navLink.count();
  if (existing > 0) {
    logger.info({ existing }, 'nav_links already populated — leaving it alone');
    return;
  }

  const rows = FOOTER.flatMap((column, groupOrder) =>
    column.links.map((link, order) => ({
      group: column.group,
      groupOrder,
      label: link.label,
      href: link.href,
      order,
    })),
  );

  await prisma.navLink.createMany({ data: rows });
  logger.info({ count: rows.length, groups: FOOTER.length }, 'Footer navigation seeded');
}

main()
  .catch((err) => {
    logger.error({ err }, 'Failed to seed footer navigation');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
