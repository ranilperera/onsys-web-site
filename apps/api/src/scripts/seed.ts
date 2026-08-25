/**
 * Seeds the database with the approved page content from the signed-off
 * mockups, plus blog categories and the rebuilt SQL Server article.
 *
 *   npm run db:seed
 *
 * Idempotent — safe to re-run; records are upserted by slug.
 */
import { prisma } from '../lib/prisma';
import { pages, SQL_ARTICLE_HTML } from './seed-content';

async function main(): Promise<void> {
  console.log('\nSeeding Onsys platform…\n');

  for (const p of pages) {
    const { faqs = [], ...pageData } = p;

    const existing = await prisma.page.findUnique({ where: { slug: p.slug } });
    if (existing) await prisma.faq.deleteMany({ where: { pageId: existing.id } });

    await prisma.page.upsert({
      where: { slug: p.slug },
      create: {
        ...pageData,
        blocks: pageData.blocks as unknown as object,
        heroCtas: (pageData.heroCtas ?? undefined) as unknown as object | undefined,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        faqs: { create: faqs.map((f, i) => ({ ...f, order: i })) },
      },
      update: {
        ...pageData,
        blocks: pageData.blocks as unknown as object,
        heroCtas: (pageData.heroCtas ?? undefined) as unknown as object | undefined,
        status: 'PUBLISHED',
        faqs: { create: faqs.map((f, i) => ({ ...f, order: i })) },
      },
    });
    console.log(`  ✓ page: /${p.slug === 'home' ? '' : p.slug}`);
  }

  const categories = [
    { slug: 'database', name: 'Database', color: '#0E336A' },
    { slug: 'infrastructure-and-cloud', name: 'Infrastructure & Cloud', color: '#1E529D' },
    { slug: 'software-development', name: 'Software Development', color: '#0E7C4A' },
    { slug: 'cyber-security', name: 'Cyber Security', color: '#D87600' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name } });
    console.log(`  ✓ category: ${c.name}`);
  }

  const databaseCategory = await prisma.category.findUnique({ where: { slug: 'database' } });

  const articleSlug = 'how-to-update-sql-server-after-cloning-and-renaming-a-windows-server';
  await prisma.post.upsert({
    where: { slug: articleSlug },
    create: {
      slug: articleSlug,
      title: 'How to Update SQL Server After Cloning and Renaming a Windows Server',
      excerpt:
        'A step-by-step walkthrough of what breaks when you clone or rename a Windows host running SQL Server — and the exact commands to fix @@SERVERNAME, SSRS and linked servers so the instance reports its new identity correctly.',
      bodyHtml: SQL_ARTICLE_HTML,
      status: 'PUBLISHED',
      categoryId: databaseCategory?.id ?? null,
      authorName: 'Onsys Senior DBA Team',
      readMinutes: 9,
      seoTitle: 'How to Update SQL Server After Cloning & Renaming a Windows Server',
      seoDescription:
        'Fix SQL Server’s internal server name after cloning or renaming the Windows host — sp_dropserver/sp_addserver, service restarts, SSRS, replication and Kerberos SPN considerations.',
      publishedAt: new Date(),
      faqs: {
        create: [
          { question: 'Does SQL Server update its name automatically when Windows is renamed?', answer: 'No. SQL Server stores its internal name in master.sys.servers at install time and surfaces it through @@SERVERNAME. Renaming Windows does not update it — you must run sp_dropserver and sp_addserver, then restart the service.', order: 0 },
          { question: 'Do I need to restart SQL Server after running sp_addserver?', answer: 'Yes. The change to @@SERVERNAME does not take effect until the Database Engine service is restarted.', order: 1 },
          { question: 'Does this procedure work on a clustered instance?', answer: 'No. On a Failover Cluster Instance the client-facing name is the cluster network name resource, which is changed through Windows Server Failover Clustering rather than sp_addserver.', order: 2 },
        ],
      },
    },
    update: { bodyHtml: SQL_ARTICLE_HTML, status: 'PUBLISHED' },
  });
  console.log(`  ✓ post: /blog/${articleSlug}`);

  // Redirects preserving equity from the current WordPress URLs.
  const redirects = [
    { fromPath: '/our-expertise', toPath: '/expertise' },
    { fromPath: '/about-us', toPath: '/about' },
    { fromPath: '/contact-us', toPath: '/contact' },
    // /pricing-and-plans keeps its WordPress URL and is now served directly, so
    // it needs no redirect. The shorter /pricing alias is handled statically in
    // the web middleware.
    { fromPath: '/managed-database-services', toPath: '/managed-database-services' },
    { fromPath: `/${articleSlug}`, toPath: `/blog/${articleSlug}` },
  ].filter((r) => r.fromPath !== r.toPath);

  for (const r of redirects) {
    await prisma.redirect.upsert({
      where: { fromPath: r.fromPath },
      create: { ...r, statusCode: 301 },
      update: { toPath: r.toPath },
    });
  }
  console.log(`  ✓ ${redirects.length} redirects`);

  // A redirect whose source is a live page slug is always a bug: the middleware
  // would bounce the URL away from the page it is meant to serve. This happens
  // when a page is renamed onto a path that used to redirect elsewhere.
  const conflicting = await prisma.redirect.deleteMany({
    where: { fromPath: { in: pages.map((p) => (p.slug === 'home' ? '/' : `/${p.slug}`)) } },
  });
  if (conflicting.count > 0) {
    console.log(`  ✓ removed ${conflicting.count} redirect(s) shadowing a live page`);
  }

  console.log('\n✓ Seed complete.\n');
  console.log('Next: npm run create:admin -- --email=you@onsys.com.au --name="Your Name"\n');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('✗ Seed failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
