/**
 * Chunks published content, embeds it, and stores the vectors in
 * content_chunks so the chatbot can retrieve and cite real answers.
 *
 *   npm run embeddings:build            # incremental — only new/changed content
 *   npm run embeddings:build -- --all   # wipe and rebuild everything
 *
 * Run this after any content import or significant edit.
 */
import { prisma } from '../lib/prisma';
import { env, aiConfigured } from '../lib/env';
import { embed } from '../services/rag.service';

const CHUNK_TARGET = 1200; // characters — roughly 300 tokens
const CHUNK_OVERLAP = 150; // keeps sentences from being orphaned across a boundary

const stripHtml = (html: string): string =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Split on paragraph boundaries where possible, falling back to hard slices. */
function chunkText(text: string): string[] {
  if (text.length <= CHUNK_TARGET) return text ? [text] : [];

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > CHUNK_TARGET && current) {
      chunks.push(current.trim());
      // Carry the tail forward so context is not lost at the seam.
      current = current.slice(-CHUNK_OVERLAP) + ' ' + sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 60); // drop scraps
}

/** Turn a page's block JSON into plain prose the model can read. */
function textFromBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  const parts: string[] = [];

  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      parts.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        // Skip presentational keys — they add noise, not meaning.
        if (['type', 'icon', 'color', 'coverColor', 'href', 'videoUrl'].includes(key)) continue;
        walk(v);
      }
    }
  };

  walk(blocks);
  return parts.join('. ').replace(/\s+/g, ' ').trim();
}

async function main(): Promise<void> {
  if (!aiConfigured) {
    console.error('✗ OPENAI_API_KEY is not set — cannot build embeddings.');
    process.exit(1);
  }

  const rebuildAll = process.argv.includes('--all');

  console.log(`\nBuilding chatbot embeddings (${env.OPENAI_EMBEDDING_MODEL})`);
  console.log(`  Mode: ${rebuildAll ? 'full rebuild' : 'incremental'}\n`);

  if (rebuildAll) {
    const { count } = await prisma.contentChunk.deleteMany({});
    console.log(`  Cleared ${count} existing chunks`);
  }

  const [pages, posts] = await Promise.all([
    prisma.page.findMany({
      where: { status: 'PUBLISHED' },
      include: { faqs: true, chunks: { select: { id: true } } },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      include: { faqs: true, chunks: { select: { id: true } } },
    }),
  ]);

  let embedded = 0;
  let skipped = 0;

  const storeChunk = async (
    content: string,
    sourceUrl: string,
    sourceTitle: string,
    link: { pageId?: string; postId?: string },
  ): Promise<void> => {
    const vector = await embed(content);

    // Prisma cannot write an Unsupported column, so insert then set the vector.
    const chunk = await prisma.contentChunk.create({
      data: {
        content,
        sourceUrl,
        sourceTitle,
        tokens: Math.round(content.length / 4),
        ...link,
      },
    });

    await prisma.$executeRaw`
      UPDATE content_chunks
      SET embedding = ${`[${vector.join(',')}]`}::vector
      WHERE id = ${chunk.id}
    `;

    embedded += 1;
    process.stdout.write('.');
  };

  for (const page of pages) {
    if (!rebuildAll && page.chunks.length > 0) {
      skipped += 1;
      continue;
    }
    if (rebuildAll === false && page.chunks.length === 0) {
      // fall through and embed
    }

    const url = page.slug === 'home' ? '/' : `/${page.slug}`;
    const body = [page.heading, page.lede ?? '', textFromBlocks(page.blocks)].join('. ');
    const faqText = page.faqs.map((f) => `Q: ${f.question} A: ${f.answer}`).join(' ');

    for (const chunk of chunkText(`${body} ${faqText}`)) {
      await storeChunk(chunk, url, page.title, { pageId: page.id });
    }
  }

  for (const post of posts) {
    if (!rebuildAll && post.chunks.length > 0) {
      skipped += 1;
      continue;
    }

    const url = `/blog/${post.slug}`;
    const body = [post.title, post.excerpt ?? '', stripHtml(post.bodyHtml)].join('. ');
    const faqText = post.faqs.map((f) => `Q: ${f.question} A: ${f.answer}`).join(' ');

    for (const chunk of chunkText(`${body} ${faqText}`)) {
      await storeChunk(chunk, url, post.title, { postId: post.id });
    }
  }

  console.log(`\n\n✓ Embedded ${embedded} chunks`);
  if (skipped) console.log(`  Skipped ${skipped} already-indexed items (use --all to rebuild)`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('\n✗ Embedding build failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
