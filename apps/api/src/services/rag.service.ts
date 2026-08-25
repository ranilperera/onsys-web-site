import OpenAI from 'openai';
import type { Citation } from '@onsys/shared';
import { env, aiConfigured } from '../lib/env';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Retrieval-augmented answering over the site's own content.
 *
 * Content is chunked and embedded by scripts/build-embeddings.ts into
 * content_chunks.embedding (pgvector). At question time we embed the query,
 * pull the nearest chunks, and ground the model in them. If nothing clears
 * RAG_MIN_SCORE we refuse to guess and hand off to a human instead — a wrong
 * answer about someone's database SLA is worse than no answer.
 */

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

export async function embed(text: string): Promise<number[]> {
  const res = await openai().embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: text.replace(/\n/g, ' ').slice(0, 8000),
  });
  return res.data[0].embedding;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  sourceUrl: string;
  sourceTitle: string;
  score: number;
}

/**
 * Cosine-similarity search. pgvector's `<=>` returns cosine *distance*,
 * so similarity = 1 - distance.
 */
export async function retrieve(query: string, limit = 6): Promise<RetrievedChunk[]> {
  if (!aiConfigured) return [];

  const queryEmbedding = await embed(query);
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  const rows = await prisma.$queryRaw<
    Array<{ id: string; content: string; sourceUrl: string; sourceTitle: string; distance: number }>
  >`
    SELECT id,
           content,
           "sourceUrl",
           "sourceTitle",
           embedding <=> ${vectorLiteral}::vector AS distance
    FROM content_chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;

  return rows
    .map((r) => ({
      id: r.id,
      content: r.content,
      sourceUrl: r.sourceUrl,
      sourceTitle: r.sourceTitle,
      score: 1 - Number(r.distance),
    }))
    .filter((r) => r.score >= env.RAG_MIN_SCORE);
}

const SYSTEM_PROMPT = `You are the assistant on the Onsys Technologies website. Onsys is an Australian IT services company (Melbourne HQ, Colombo delivery centre) specialising in database management, infrastructure & cloud, software/data/AI, and cyber security.

Rules — follow these exactly:
1. Answer ONLY from the provided context. Never invent services, prices, SLAs, certifications, client names or capabilities.
2. If the context does not contain the answer, say you don't have that detail to hand and offer to connect the visitor with a consultant. Do not guess.
3. Never quote a specific price beyond what appears in the context. Pricing is scoped per environment — say so and offer the free consultation.
4. Be concise: 2-4 sentences typically. Use plain language, Australian English.
5. You are not a licensed advisor. For anything contractual, legal or security-incident related, recommend speaking to the team directly.
6. If the visitor asks for a human, is frustrated, or is reporting an active outage, set needsHuman to true.

Respond with strict JSON matching:
{"answer": string, "needsHuman": boolean}`;

export interface AnswerResult {
  answer: string;
  citations: Citation[];
  needsHuman: boolean;
}

const FALLBACK_ANSWER =
  "I don't have that detail to hand, but a senior consultant can answer it properly. Would you like me to put you through to the team?";

export async function answerQuestion(
  question: string,
  history: Array<{ role: string; content: string }> = [],
): Promise<AnswerResult> {
  if (!aiConfigured) {
    return { answer: FALLBACK_ANSWER, citations: [], needsHuman: true };
  }

  let chunks: RetrievedChunk[] = [];
  try {
    chunks = await retrieve(question);
  } catch (error) {
    logger.error({ err: error }, 'RAG retrieval failed');
  }

  // Nothing relevant in our own content — do not let the model freelance.
  if (chunks.length === 0) {
    return { answer: FALLBACK_ANSWER, citations: [], needsHuman: true };
  }

  const context = chunks
    .map((c, i) => `[${i + 1}] Source: ${c.sourceTitle} (${c.sourceUrl})\n${c.content}`)
    .join('\n\n---\n\n');

  // Keep the last few turns for pronoun resolution, but cap to bound tokens.
  const recent = history.slice(-6).map((m) => ({
    role: m.role === 'VISITOR' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));

  try {
    const completion = await openai().chat.completions.create({
      model: env.OPENAI_CHAT_MODEL,
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recent,
        { role: 'user', content: `Context:\n${context}\n\nVisitor question: ${question}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as { answer?: string; needsHuman?: boolean };

    const citations: Citation[] = Array.from(
      new Map(chunks.map((c) => [c.sourceUrl, { title: c.sourceTitle, url: c.sourceUrl }])).values(),
    ).slice(0, 3);

    return {
      answer: parsed.answer?.trim() || FALLBACK_ANSWER,
      citations,
      needsHuman: Boolean(parsed.needsHuman),
    };
  } catch (error) {
    logger.error({ err: error }, 'Chat completion failed');
    return { answer: FALLBACK_ANSWER, citations: [], needsHuman: true };
  }
}

// Escalation triage lives in lib/escalation.ts — pure, DB-free and unit tested.
export { wantsHuman } from '../lib/escalation';
