import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  ROLES,
  ROLE_LABELS,
  assignableStatuses,
  authorNeedsByline,
  canPublish,
  isAuthorPath,
  reviewLabel,
  userCreateSchema,
  userEditSchema,
} from '@onsys/shared';

/**
 * The author role: what it can reach, and what it must not.
 *
 * These tests are the specification for the restriction, not a description of
 * it. The admin router serves leads, candidate CVs, chat transcripts and
 * on-call enrolments from the same mount point as the blog, so "can an author
 * call this?" has to have a stated answer for every shape of path rather than
 * whatever the regexes happen to do.
 */

describe('the roles', () => {
  it('has exactly three, and labels every one', () => {
    expect([...ROLES]).toEqual(['ADMIN', 'EDITOR', 'AUTHOR']);
    for (const role of ROLES) expect(ROLE_LABELS[role]).toBeTruthy();
  });
});

describe('what an author may call', () => {
  it('opens their own articles', () => {
    expect(isAuthorPath('GET', '/posts')).toBe(true);
    expect(isAuthorPath('POST', '/posts')).toBe(true);
    expect(isAuthorPath('GET', '/posts/clz123')).toBe(true);
    expect(isAuthorPath('PUT', '/posts/clz123')).toBe(true);
    expect(isAuthorPath('PATCH', '/posts/clz123/review')).toBe(true);
  });

  it('refuses everything that carries somebody personal information', () => {
    /*
     * The list that made the role worth building. Each of these is a route an
     * EDITOR uses daily and a contributor has no business seeing: enquiries
     * with names and phone numbers, candidate CVs, chat transcripts, and the
     * addresses of companies paying for on-call cover.
     */
    for (const path of [
      '/leads',
      '/leads/abc',
      '/applications',
      '/applications/abc',
      '/applications/abc/cv',
      '/chat',
      '/chat/abc',
      '/users',
      '/users/abc',
    ]) {
      expect(isAuthorPath('GET', path), `GET ${path} must be refused`).toBe(false);
      expect(isAuthorPath('POST', path), `POST ${path} must be refused`).toBe(false);
      expect(isAuthorPath('DELETE', path), `DELETE ${path} must be refused`).toBe(false);
    }
  });

  it('refuses the rest of the site: pages, nav, redirects, jobs, case studies', () => {
    for (const path of ['/pages', '/pages/abc', '/nav', '/redirects', '/jobs', '/case-studies']) {
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        expect(isAuthorPath(method, path), `${method} ${path} must be refused`).toBe(false);
      }
    }
  });

  it('cannot publish or delete through a method the allowlist never named', () => {
    // The list grants GET/POST/PUT on posts and PATCH on /review only. The
    // status route — the one that puts an article on the public site — is
    // absent, and so is every delete.
    expect(isAuthorPath('PATCH', '/posts/abc/status')).toBe(false);
    expect(isAuthorPath('DELETE', '/posts/abc')).toBe(false);
    expect(isAuthorPath('PATCH', '/posts/abc')).toBe(false);
  });

  it('reads the byline list but cannot change it', () => {
    expect(isAuthorPath('GET', '/authors')).toBe(true);
    expect(isAuthorPath('POST', '/authors')).toBe(false);
    expect(isAuthorPath('PUT', '/authors/abc')).toBe(false);
    expect(isAuthorPath('DELETE', '/authors/abc')).toBe(false);
    // Somebody else's byline detail is not on the list either.
    expect(isAuthorPath('GET', '/authors/abc')).toBe(false);
  });

  it('is not fooled by a path that merely starts with an allowed one', () => {
    /*
     * The failure this guards against is a prefix match. '/posts' must not
     * open '/posts-secret' or '/postsomething', and ':id' is one segment: it
     * must not swallow '/posts/abc/cv' or a deeper path.
     */
    expect(isAuthorPath('GET', '/posts-secret')).toBe(false);
    expect(isAuthorPath('GET', '/postsomething')).toBe(false);
    expect(isAuthorPath('GET', '/posts/abc/history')).toBe(false);
    expect(isAuthorPath('GET', '/posts/abc/def')).toBe(false);
    expect(isAuthorPath('GET', '/leads/../posts')).toBe(false);
  });

  it('ignores case on the method and a trailing slash on the path', () => {
    expect(isAuthorPath('get', '/posts')).toBe(true);
    expect(isAuthorPath('GET', '/posts/')).toBe(true);
    expect(isAuthorPath('GET', '/leads/')).toBe(false);
  });

  it('refuses an unknown path, which is the whole point of an allowlist', () => {
    // The regression this exists for: somebody adds /admin/invoices next year
    // and does not think about roles. Default-deny means they do not have to.
    expect(isAuthorPath('GET', '/invoices')).toBe(false);
    expect(isAuthorPath('GET', '/anything-at-all')).toBe(false);
    expect(isAuthorPath('GET', '/')).toBe(false);
  });
});

describe('what an author may set', () => {
  it('can draft, and cannot publish', () => {
    expect([...assignableStatuses('AUTHOR')]).toEqual(['DRAFT']);
    expect(canPublish('AUTHOR')).toBe(false);
  });

  it('leaves editors and admins alone', () => {
    for (const role of ['ADMIN', 'EDITOR'] as const) {
      expect([...assignableStatuses(role)]).toEqual(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
      expect(canPublish(role)).toBe(true);
    }
  });

  it('names where a draft has got to, and says nothing about a live article', () => {
    expect(reviewLabel({ status: 'DRAFT', submittedForReviewAt: null })).toBe('Draft');
    expect(reviewLabel({ status: 'DRAFT', submittedForReviewAt: new Date() })).toBe(
      'Ready for review',
    );
    expect(reviewLabel({ status: 'PUBLISHED', submittedForReviewAt: null })).toBeNull();
    expect(reviewLabel({ status: 'ARCHIVED', submittedForReviewAt: new Date() })).toBeNull();
  });
});

describe('creating an account', () => {
  const valid = {
    email: 'A.Writer@Onsys.com.au',
    name: 'A Writer',
    role: 'AUTHOR' as const,
    authorId: 'aut_123',
  };

  it('normalises the address, because it is the identity everything hangs off', () => {
    expect(userCreateSchema.parse(valid).email).toBe('a.writer@onsys.com.au');
  });

  it('refuses an author with no byline', () => {
    /*
     * Not a nicety. An author's post list is scoped to their byline and
     * creating an article without one is refused by the API, so the account
     * would sign in to an empty screen and a save button that always fails.
     */
    expect(authorNeedsByline({ role: 'AUTHOR', authorId: null })).toBe(true);
    const result = userCreateSchema.safeParse({ ...valid, authorId: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).join(' ')).toMatch(/byline/i);
    }
  });

  it('does not require a byline of an administrator or an editor', () => {
    for (const role of ['ADMIN', 'EDITOR'] as const) {
      expect(authorNeedsByline({ role, authorId: null })).toBe(false);
      expect(userCreateSchema.safeParse({ ...valid, role, authorId: null }).success).toBe(true);
    }
  });

  it('applies the same byline rule when the account is edited', () => {
    const edit = { name: 'A Writer', role: 'AUTHOR' as const, authorId: null, disabled: false };
    expect(userEditSchema.safeParse(edit).success).toBe(false);
    expect(userEditSchema.safeParse({ ...edit, authorId: 'aut_123' }).success).toBe(true);
  });

  it('has no email field on the edit form', () => {
    /*
     * Changing an address would silently move the identity that the password,
     * the MFA enrolment and every audit line hang off. A new address is a new
     * account; the old one is suspended.
     */
    expect(Object.keys(userEditSchema._def.schema.shape)).not.toContain('email');
  });

  it('rejects a role that is not one of the three', () => {
    expect(userCreateSchema.safeParse({ ...valid, role: 'SUPERUSER' }).success).toBe(false);
  });

  it('keeps one password rule for the API, the console and the CLI', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
  });
});
