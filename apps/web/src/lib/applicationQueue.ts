import {
  APPLICATION_SORTS,
  APPLICATION_STATUSES,
  type ApplicationSort,
  type ApplicationStatusValue,
} from '@onsys/shared';

/**
 * The state of somebody's place in the application queue.
 *
 * It lives in the URL rather than in component state, and that is the whole
 * point of this module. Filters held in React are lost the moment you open a
 * candidate and come back, so working a hundred applications meant choosing
 * "New" and the role again on every single return trip. In the URL the same
 * choices survive the round trip, the browser's own Back button, a reload, and
 * being sent to a colleague — "here is the list I am working from" becomes a
 * link rather than a set of instructions.
 *
 * Both screens read and write the same names, so the detail page can rebuild
 * the exact queue it was opened from and offer the next candidate in it.
 */
export interface QueueParams {
  jobId: string;
  status: '' | ApplicationStatusValue;
  q: string;
  openOnly: boolean;
  sort: ApplicationSort;
}

export const DEFAULT_QUEUE: QueueParams = {
  jobId: '',
  status: '',
  q: '',
  /** Only live applications, which is what somebody signing in wants to see. */
  openOnly: true,
  sort: 'newest',
};

function isStatus(v: string): v is ApplicationStatusValue {
  return (APPLICATION_STATUSES as readonly string[]).includes(v);
}

function isSort(v: string): v is ApplicationSort {
  return (APPLICATION_SORTS as readonly string[]).includes(v);
}

/**
 * Read the queue out of a URL.
 *
 * Unknown values fall back to the default rather than being passed on. A
 * hand-edited or truncated link should show a sensible queue, not an empty
 * table that looks like every application has vanished.
 */
export function readQueue(search: URLSearchParams): QueueParams {
  const status = search.get('status') ?? '';
  const sort = search.get('sort') ?? '';
  return {
    jobId: search.get('jobId') ?? '',
    status: isStatus(status) ? status : '',
    q: search.get('q') ?? '',
    // Absent means the default, which is on. Only an explicit "0" turns it off,
    // so an old bookmark without the parameter still opens the live queue.
    openOnly: (search.get('open') ?? '1') !== '0',
    sort: isSort(sort) ? sort : 'newest',
  };
}

/**
 * Write the queue back into a query string, omitting anything at its default.
 *
 * Keeps the common case — the live queue, newest first — as a bare
 * /admin/applications, so the address bar only ever carries choices somebody
 * actually made.
 */
export function queueSearch(queue: QueueParams): string {
  const params = new URLSearchParams();
  if (queue.jobId) params.set('jobId', queue.jobId);
  if (queue.status) params.set('status', queue.status);
  if (queue.q.trim()) params.set('q', queue.q.trim());
  if (!queue.openOnly) params.set('open', '0');
  if (queue.sort !== 'newest') params.set('sort', queue.sort);
  return params.toString();
}

/** The queue as the console's own link, for Back and for Previous/Next. */
export function queueHref(queue: QueueParams, id?: string): string {
  const search = queueSearch(queue);
  const base = id ? `/admin/applications/${id}` : '/admin/applications';
  return search ? `${base}?${search}` : base;
}

/**
 * The query the api is asked for this queue.
 *
 * `openOnly` is deliberately not sent: it is a filter over what came back, not
 * a filter the api runs, because the queue also needs the full counts to say
 * "34 of 112" honestly. The two screens must agree on this, which is why it is
 * here and not written out twice.
 */
export function queueApiQuery(queue: QueueParams): string {
  const params = new URLSearchParams();
  if (queue.jobId) params.set('jobId', queue.jobId);
  if (queue.status) params.set('status', queue.status);
  if (queue.q.trim()) params.set('q', queue.q.trim());
  params.set('sort', queue.sort);
  return params.toString();
}
