'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/admin';

interface NavLink {
  id: string;
  group: string;
  groupOrder: number;
  label: string;
  href: string;
  order: number;
  visible: boolean;
}

interface PageOption {
  id: string;
  slug: string;
  title: string;
  status: string;
}

/**
 * One full-width field inside the site's form grid.
 *
 * `.form-row` is a two-column grid and `.form-field` is the cell that carries
 * the label and input styling — putting a label straight into the row lands it
 * in column one with its input in column two, which is not a form layout.
 */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="form-row">
      <div className="form-field full">{children}</div>
    </div>
  );
}

export default function FooterNavPage() {
  const [links, setLinks] = useState<NavLink[]>([]);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // New-link form.
  const [newGroup, setNewGroup] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newHref, setNewHref] = useState('');

  useEffect(() => {
    Promise.all([
      adminFetch<{ links: NavLink[] }>('/nav'),
      adminFetch<{ pages: PageOption[] }>('/pages'),
    ])
      .then(([l, p]) => {
        setLinks(l.links);
        setPages(p.pages);
        setNewGroup(l.links[0]?.group ?? 'Services');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the footer.'))
      .finally(() => setLoading(false));
  }, []);

  /** Columns in the order they appear in the footer, each with its links. */
  const columns = useMemo(() => {
    const map = new Map<string, NavLink[]>();
    for (const link of [...links].sort(
      (a, b) => a.groupOrder - b.groupOrder || a.group.localeCompare(b.group) || a.order - b.order,
    )) {
      const list = map.get(link.group);
      if (list) list.push(link);
      else map.set(link.group, [link]);
    }
    return [...map.entries()];
  }, [links]);

  const groupNames = useMemo(() => [...new Set(links.map((l) => l.group))], [links]);

  /**
   * Published pages not already in the footer.
   *
   * A picker that offers a page already linked invites the duplicate entries
   * that the footer collected by hand — the same page under two labels in two
   * columns.
   */
  const addablePages = useMemo(() => {
    const linked = new Set(links.map((l) => l.href));
    return pages
      .filter((p) => p.status === 'PUBLISHED' && !linked.has(`/${p.slug}`))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [pages, links]);

  function flash(message: string) {
    setNotice(message);
    setError(null);
    window.setTimeout(() => setNotice(null), 2500);
  }

  async function addLink() {
    const label = newLabel.trim();
    const href = newHref.trim();
    if (!label || !href || !newGroup.trim()) {
      setError('Give the link a column, a label and a target.');
      return;
    }

    setBusy('new');
    setError(null);
    try {
      const siblings = links.filter((l) => l.group === newGroup);
      const { link } = await adminFetch<{ link: NavLink }>('/nav', {
        method: 'POST',
        body: JSON.stringify({
          group: newGroup.trim(),
          // A brand-new column goes to the end of the footer.
          groupOrder: siblings[0]?.groupOrder ?? groupNames.length,
          label,
          href,
          order: siblings.length,
          visible: true,
        }),
      });
      setLinks((rows) => [...rows, link]);
      setNewLabel('');
      setNewHref('');
      setNewPageSlug('');
      flash(`Added “${label}”.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that link.');
    } finally {
      setBusy(null);
    }
  }

  async function saveLink(link: NavLink, patch: Partial<NavLink>) {
    const next = { ...link, ...patch };
    setBusy(link.id);
    setError(null);
    setLinks((rows) => rows.map((r) => (r.id === link.id ? next : r)));

    try {
      await adminFetch(`/nav/${link.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          group: next.group,
          groupOrder: next.groupOrder,
          label: next.label,
          href: next.href,
          order: next.order,
          visible: next.visible,
        }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that link.');
      setLinks((rows) => rows.map((r) => (r.id === link.id ? link : r)));
    } finally {
      setBusy(null);
    }
  }

  async function move(group: string, index: number, delta: number) {
    const list = columns.find(([g]) => g === group)?.[1] ?? [];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;

    const reordered = [...list];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    const previous = links;
    setLinks((rows) =>
      rows.map((r) => {
        const at = reordered.findIndex((x) => x.id === r.id);
        return at === -1 ? r : { ...r, order: at };
      }),
    );

    setBusy(group);
    try {
      await adminFetch('/nav/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ ids: reordered.map((l) => l.id) }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reorder that column.');
      setLinks(previous);
    } finally {
      setBusy(null);
    }
  }

  async function remove(link: NavLink) {
    if (!window.confirm(`Remove “${link.label}” from the footer?`)) return;
    setBusy(link.id);
    try {
      await adminFetch(`/nav/${link.id}`, { method: 'DELETE' });
      setLinks((rows) => rows.filter((r) => r.id !== link.id));
      flash(`Removed “${link.label}”.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that link.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Footer</h1>
          <p style={{ color: 'var(--gray)', fontSize: 14, margin: 0 }}>
            The columns and links at the bottom of every page. Changes go live within five minutes.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="form-status success" role="status">
          {notice}
        </div>
      )}

      {links.length === 0 && (
        <div className="form-status" role="status">
          No footer links stored yet, so the site is still rendering its built-in list. Run{' '}
          <code>npm run seed:nav</code> to import that list, or add links below — the first link
          you add replaces the built-in footer entirely.
        </div>
      )}

      <section className="admin-card">
        <h2 className="admin-card-title">Add a link</h2>

        <Row>
          <label htmlFor="new-page">Pick a published page</label>
          <select
            id="new-page"
            value={newPageSlug}
            onChange={(e) => {
              const slug = e.target.value;
              setNewPageSlug(slug);
              const page = pages.find((p) => p.slug === slug);
              if (page) {
                setNewLabel(page.title);
                setNewHref(`/${page.slug}`);
              }
            }}
          >
            <option value="">— choose a page, or type a link below —</option>
            {addablePages.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.title} (/{p.slug})
              </option>
            ))}
          </select>
          {addablePages.length === 0 && (
            <small style={{ color: 'var(--gray)' }}>
              Every published page is already linked from the footer.
            </small>
          )}
        </Row>

        <Row>
          <label htmlFor="new-group">Column</label>
          <input
            id="new-group"
            list="footer-groups"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            aria-describedby="new-group-help"
          />
          <datalist id="footer-groups">
            {groupNames.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <small id="new-group-help" style={{ color: 'var(--gray)' }}>
            Pick an existing column or type a new name to create one.
          </small>
        </Row>

        <Row>
          <label htmlFor="new-label">Label</label>
          <input id="new-label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        </Row>

        <Row>
          <label htmlFor="new-href">Link</label>
          <input
            id="new-href"
            value={newHref}
            onChange={(e) => setNewHref(e.target.value)}
            placeholder="/about"
            aria-describedby="new-href-help"
          />
          <small id="new-href-help" style={{ color: 'var(--gray)' }}>
            A path like <code>/about</code>, or a full https:// address for an external site.
          </small>
        </Row>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy === 'new'}
          onClick={() => void addLink()}
        >
          {busy === 'new' ? 'Adding…' : 'Add to footer'}
        </button>
      </section>

      {columns.map(([group, list]) => (
        <section className="admin-card" key={group}>
          <h2 className="admin-card-title">{group}</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--gray-light)' }}>
                <th style={{ padding: '8px 6px' }}>Label</th>
                <th style={{ padding: '8px 6px' }}>Link</th>
                <th style={{ padding: '8px 6px' }}>Shown</th>
                <th style={{ padding: '8px 6px' }} />
              </tr>
            </thead>
            <tbody>
              {list.map((link, index) => (
                <tr key={link.id} style={{ borderBottom: '1px solid var(--gray-light)' }}>
                  <td style={{ padding: '6px' }}>
                    <label htmlFor={`label-${link.id}`} className="sr-only">
                      Label
                    </label>
                    <input
                      id={`label-${link.id}`}
                      defaultValue={link.label}
                      onBlur={(e) => {
                        if (e.target.value !== link.label) {
                          void saveLink(link, { label: e.target.value });
                        }
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <label htmlFor={`href-${link.id}`} className="sr-only">
                      Link
                    </label>
                    <input
                      id={`href-${link.id}`}
                      defaultValue={link.href}
                      onBlur={(e) => {
                        if (e.target.value !== link.href) {
                          void saveLink(link, { href: e.target.value });
                        }
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input
                      type="checkbox"
                      checked={link.visible}
                      aria-label={`Show ${link.label} in the footer`}
                      onChange={(e) => void saveLink(link, { visible: e.target.checked })}
                    />
                  </td>
                  <td style={{ padding: '6px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={index === 0 || busy === group}
                      aria-label={`Move ${link.label} up`}
                      onClick={() => void move(group, index, -1)}
                    >
                      ↑
                    </button>{' '}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={index === list.length - 1 || busy === group}
                      aria-label={`Move ${link.label} down`}
                      onClick={() => void move(group, index, 1)}
                    >
                      ↓
                    </button>{' '}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busy === link.id}
                      onClick={() => void remove(link)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
