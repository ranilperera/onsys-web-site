import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUEUE,
  queueApiQuery,
  queueHref,
  queueSearch,
  readQueue,
  type QueueParams,
} from '../applicationQueue';

/**
 * The queue in the URL.
 *
 * The whole reason this module exists is the round trip: a reviewer filters
 * the list, opens a candidate, and comes back. If anything is lost in either
 * direction they are re-selecting "New" and the role a hundred times a day,
 * which is the complaint this was written to answer. So what is tested is the
 * round trip itself, in both directions.
 */

const read = (search: string) => readQueue(new URLSearchParams(search));

describe('readQueue', () => {
  it('gives the live queue when the URL says nothing', () => {
    expect(read('')).toEqual(DEFAULT_QUEUE);
  });

  it('reads every choice back', () => {
    expect(read('jobId=abc&status=NEW&q=perera&open=0&sort=oldest')).toEqual({
      jobId: 'abc',
      status: 'NEW',
      q: 'perera',
      openOnly: false,
      sort: 'oldest',
    });
  });

  it('treats a missing open flag as on, so old links still work', () => {
    expect(read('status=NEW').openOnly).toBe(true);
  });

  it('falls back rather than showing an empty table for a bad value', () => {
    // A truncated or hand-edited link should show a sensible queue. Passing
    // the rubbish through to the api would answer with nothing, and an empty
    // table reads as "every application has vanished".
    expect(read('status=NONSENSE').status).toBe('');
    expect(read('sort=sideways').sort).toBe('newest');
  });
});

describe('queueSearch', () => {
  it('writes nothing at all for the default queue', () => {
    // Keeps the common case as a bare /admin/applications, so the address bar
    // only ever carries choices somebody actually made.
    expect(queueSearch(DEFAULT_QUEUE)).toBe('');
  });

  it('omits a blank search but keeps a real one', () => {
    expect(queueSearch({ ...DEFAULT_QUEUE, q: '   ' })).toBe('');
    expect(queueSearch({ ...DEFAULT_QUEUE, q: ' perera ' })).toBe('q=perera');
  });
});

describe('the round trip', () => {
  const cases: QueueParams[] = [
    DEFAULT_QUEUE,
    { jobId: 'job_1', status: 'NEW', q: '', openOnly: false, sort: 'oldest' },
    { jobId: '', status: 'SHORTLISTED', q: "O'Brien", openOnly: true, sort: 'name' },
    { jobId: 'job_2', status: '', q: 'a b', openOnly: true, sort: 'role' },
  ];

  it.each(cases)('survives being written to a URL and read back: %j', (queue) => {
    expect(read(queueSearch(queue))).toEqual(queue);
  });
});

describe('queueHref', () => {
  it('links to the list, and to a candidate within it', () => {
    const queue: QueueParams = { ...DEFAULT_QUEUE, status: 'NEW', sort: 'oldest' };
    expect(queueHref(queue)).toBe('/admin/applications?status=NEW&sort=oldest');
    expect(queueHref(queue, 'app_7')).toBe('/admin/applications/app_7?status=NEW&sort=oldest');
  });

  it('leaves a default queue as a clean path', () => {
    expect(queueHref(DEFAULT_QUEUE)).toBe('/admin/applications');
  });
});

describe('queueApiQuery', () => {
  it('always states the sort, so the api never has to guess', () => {
    expect(queueApiQuery(DEFAULT_QUEUE)).toBe('sort=newest');
  });

  it('does not send openOnly', () => {
    // It is a filter over what came back, not one the api runs: the queue
    // needs the full counts to say "34 of 112" honestly.
    expect(queueApiQuery({ ...DEFAULT_QUEUE, openOnly: false })).not.toContain('open');
  });
});
