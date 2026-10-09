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
    group: 'Database',
    links: [
      { label: 'SQL Server DBA Services', href: '/sql-server-dba-services' },
      { label: 'Managed SQL Server Support', href: '/managed-sql-server-support' },
      { label: 'Remote Database Support', href: '/remote-database-support' },
      { label: 'Remote On-Call DBA', href: '/on-call-dba-services' },
      { label: 'SQL Server Projects', href: '/sql-server-migration-and-upgrade-services' },
      { label: 'Emergency Database Support', href: '/emergency-database-support' },
      { label: 'PostgreSQL Consulting', href: '/postgresql-consulting-services' },
      { label: 'MySQL Consulting', href: '/mysql-consulting-services' },
      { label: 'SQL Server DBA Melbourne', href: '/sql-server-dba-melbourne' },
      { label: 'Database Support New Zealand', href: '/database-support-new-zealand' },
      { label: 'Pacific Islands Database Support', href: '/database-support-pacific-islands' },
    ],
  },
  {
    group: 'Cloud, IT & AI',
    links: [
      { label: 'Managed IT Services', href: '/managed-it-services' },
      { label: 'Cloud Consultancy & Support', href: '/cloud-consultancy' },
      { label: 'Cloud Migrations', href: '/cloud-migrations' },
      { label: 'Software Development', href: '/custom-software-development' },
      { label: 'Integration Services', href: '/integration-services' },
      { label: 'AI Development & Solutions', href: '/artificial-intelligence-solutions' },
      { label: 'All Other Services', href: '/other-services' },
    ],
  },
  {
    group: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Our Expertise', href: '/expertise' },
      { label: 'Case Studies', href: '/case-studies' },
      { label: 'Clients', href: '/clients' },
      { label: 'Certifications', href: '/certifications' },
      { label: 'Products', href: '/products' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
    ],
  },
  {
    group: 'Support',
    links: [
      { label: 'Free SQL Server Health Check', href: '/free-20-point-sql-server-health-check' },
      { label: 'Pricing & Plans', href: '/pricing-and-plans' },
      { label: 'Book a Consultation', href: '/book' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Who Can Access Your Database', href: '/who-can-access-your-database' },
    ],
  },
  {
    /** Rendered beside the copyright rather than as a fifth column. */
    group: 'Legal',
    links: [
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
