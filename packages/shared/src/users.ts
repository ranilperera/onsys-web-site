import { z } from 'zod';

/**
 * Console accounts and what each role may do.
 *
 * Three roles, and the distance between them is the point:
 *
 *   ADMIN   runs the place. The only role that can reach accounts, delete
 *           anything, or change how the site is put together.
 *   EDITOR  works the whole console except account management and deletes —
 *           pages, posts, leads, applications, the lot.
 *   AUTHOR  writes blog articles and nothing else. No leads, no candidate CVs,
 *           no chat transcripts, no pages, no site settings.
 *
 * AUTHOR exists because the console's one existing distinction — admin or not
 * — forced a choice between giving a writer the key to every enquiry and CV in
 * the business, or having somebody paste their drafts in for them. The second
 * is what actually happened, which is why the blog is hard to keep fed.
 *
 * The restriction is enforced in the API, as a default-deny allowlist, not by
 * hiding links in the console. See `isAuthorPath` below: a route that nobody
 * has thought about is closed to an author, so adding an endpoint cannot
 * quietly widen what a writer can reach.
 */
export const ROLES = ['ADMIN', 'EDITOR', 'AUTHOR'] as const;
export type Role = (typeof ROLES)[number];

export const roleSchema = z.enum(ROLES);

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  EDITOR: 'Editor',
  AUTHOR: 'Author',
};

/** Shown beside the role on the account form, so the choice is made knowingly. */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN:
    'Everything, including accounts, deletions and site settings. Give this to as few people as the work allows.',
  EDITOR:
    'All content, leads, applications and chat. Cannot manage accounts or delete records.',
  AUTHOR:
    'Blog articles under their own byline, and their own account. Cannot see leads, candidate CVs, chat or any other section.',
};

/**
 * The admin console is the only client, so the password rule can be strict
 * without costing a conversion. Twelve is the floor the existing CLI enforces;
 * it is repeated here so the API, the console and the CLI cannot drift.
 */
export const MIN_PASSWORD_LENGTH = 12;

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(200);

/** What an administrator fills in to create an account. */
export const userInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(1, 'Name is required').max(120),
  role: roleSchema,
  /**
   * The byline this account writes under. Required for an AUTHOR, because the
   * whole of their access is defined by it: an author with no byline would see
   * an empty post list and be unable to create anything, which reads as a bug
   * rather than as a half-finished account.
   */
  authorId: z.string().trim().min(1).max(60).nullable().default(null),
});

export type UserInput = z.infer<typeof userInputSchema>;

/** Editing an existing account. Email is not here: see the note on the route. */
export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: roleSchema,
  authorId: z.string().trim().min(1).max(60).nullable().default(null),
  disabled: z.boolean().default(false),
});

export type UserUpdate = z.infer<typeof userUpdateSchema>;

/**
 * An AUTHOR account without a byline cannot do the one thing it is for.
 * Checked in the schema layer so the console and the API give the same answer.
 */
export function authorNeedsByline(input: { role: Role; authorId: string | null }): boolean {
  return input.role === 'AUTHOR' && !input.authorId;
}

export const userCreateSchema = userInputSchema.superRefine((value, ctx) => {
  if (authorNeedsByline(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['authorId'],
      message: 'An author account needs a byline — pick one, or create it under Authors first.',
    });
  }
});

export const userEditSchema = userUpdateSchema.superRefine((value, ctx) => {
  if (authorNeedsByline(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['authorId'],
      message: 'An author account needs a byline — pick one, or create it under Authors first.',
    });
  }
});

// ---------------------------------------------------------------
// What an author may reach
// ---------------------------------------------------------------

/**
 * The admin API paths an AUTHOR may call, as [method, pattern] pairs.
 *
 * Deliberately an allowlist rather than a blocklist. The admin router carries
 * leads, candidate CVs, chat transcripts and on-call enrolments — a blocklist
 * would have to be updated every time one of those grew a route, and the cost
 * of forgetting is a writer reading someone's CV.
 *
 * `:id` matches one path segment.
 */
const AUTHOR_ALLOWED: ReadonlyArray<readonly [string, string]> = [
  // Their own articles. Ownership is checked again inside each handler: this
  // layer says "authors may call the posts routes", not "this post is theirs".
  ['GET', '/posts'],
  ['POST', '/posts'],
  ['GET', '/posts/:id'],
  ['PUT', '/posts/:id'],
  ['PATCH', '/posts/:id/review'],
  // The byline dropdown. The response is filtered to their own row.
  ['GET', '/authors'],
  // The dashboard tiles, which count only their own drafts and articles.
  ['GET', '/stats'],
];

/** Turns '/posts/:id' into a regex anchored at both ends. */
function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map((segment) => (segment.startsWith(':') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${source}$`);
}

const AUTHOR_MATCHERS = AUTHOR_ALLOWED.map(
  ([method, pattern]) => [method, patternToRegExp(pattern)] as const,
);

/**
 * May an author call this admin path?
 *
 * `path` is the path within the admin router — '/posts/abc123', not
 * '/api/admin/posts/abc123' — and must not carry a query string.
 */
export function isAuthorPath(method: string, path: string): boolean {
  const normalised = path.replace(/\/+$/, '') || '/';
  const verb = method.toUpperCase();
  return AUTHOR_MATCHERS.some(([allowedMethod, re]) => allowedMethod === verb && re.test(normalised));
}

/**
 * The statuses each role may set on a post.
 *
 * An author drafts and submits; somebody else decides what the public sees.
 * That is an editorial judgement rather than a security one — the site's
 * argument for being trusted with production databases is the quality of what
 * it publishes, and a second reader is cheap next to that.
 */
export function assignableStatuses(role: Role): ReadonlyArray<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'> {
  return role === 'AUTHOR' ? ['DRAFT'] : ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
}

export function canPublish(role: Role): boolean {
  return role !== 'AUTHOR';
}

/** The console's label for where a draft has got to. */
export function reviewLabel(post: {
  status: string;
  submittedForReviewAt?: string | Date | null;
}): string | null {
  if (post.status !== 'DRAFT') return null;
  return post.submittedForReviewAt ? 'Ready for review' : 'Draft';
}
