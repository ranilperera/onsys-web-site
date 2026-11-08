'use client';

import { useEffect, useMemo, useState } from 'react';

export interface CheckItem {
  title: string;
  body: string;
  group?: string;
  tag?: string;
}

interface Props {
  anchor?: string;
  items: CheckItem[];
  highlights?: { value: string; label: string }[];
  /** Section heading, rendered by the caller's SectionHead. */
  head: React.ReactNode;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * A long checklist, grouped. Numbering stays global (1–20) because the report
 * and the script bundle refer to the points by number.
 *
 * Desktop: a sticky rail with the key figures and a link per group, which
 * follows the reader down the list. Phones: each group folds, first one open.
 * Folded groups are hidden with CSS only, so every point stays in the page.
 */
export function HealthChecks({ anchor, items, highlights, head }: Props) {
  const groups = useMemo(() => {
    const out: { name: string; id: string; items: (CheckItem & { n: number })[] }[] = [];
    items.forEach((item, i) => {
      const name = item.group ?? 'Checks';
      let g = out.find((x) => x.name === name);
      if (!g) {
        g = { name, id: `${anchor ?? 'checks'}-${slug(name)}`, items: [] };
        out.push(g);
      }
      g.items.push({ ...item, n: i + 1 });
    });
    return out;
  }, [items, anchor]);

  const [active, setActive] = useState(groups[0]?.id);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    groups[0] ? { [groups[0].id]: true } : {},
  );

  // Highlight the group currently being read: the last one whose top has
  // passed a line a third of the way down the screen.
  useEffect(() => {
    const els = groups
      .map((g) => document.getElementById(g.id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight / 3;
      let current = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [groups]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section className="hc" id={anchor}>
      <div className="wrap">
        {head}
        <div className="hc-layout">
          <aside className="hc-rail">
            {highlights && highlights.length > 0 && (
              <dl className="hc-stats">
                {highlights.map((h) => (
                  <div key={h.label}>
                    <dt>{h.label}</dt>
                    <dd>{h.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <nav className="hc-nav" aria-label="Checkpoint groups">
              {groups.map((g) => (
                <a
                  key={g.id}
                  href={`#${g.id}`}
                  className={active === g.id ? 'is-active' : undefined}
                  aria-current={active === g.id ? 'true' : undefined}
                >
                  <span>{g.name}</span>
                  <small>
                    {g.items.length === 1
                      ? pad(g.items[0].n)
                      : `${pad(g.items[0].n)}–${pad(g.items[g.items.length - 1].n)}`}
                  </small>
                </a>
              ))}
            </nav>
          </aside>

          <div className="hc-groups">
            {groups.map((g) => {
              const isOpen = !!open[g.id];
              return (
                <div className={`hc-group${isOpen ? ' is-open' : ''}`} id={g.id} key={g.id}>
                  <h3 className="hc-group-head">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`${g.id}-list`}
                      onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
                    >
                      <span className="hc-group-name">{g.name}</span>
                      <span className="hc-group-count">
                        {g.items.length} {g.items.length === 1 ? 'check' : 'checks'}
                      </span>
                      <svg className="hc-chev" viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M3 4.5l3 3 3-3" />
                      </svg>
                    </button>
                  </h3>
                  <ol className="hc-list" id={`${g.id}-list`} start={g.items[0].n}>
                    {g.items.map((item) => (
                      <li className="hc-item" key={item.title}>
                        <span className="hc-num" aria-hidden="true">
                          {pad(item.n)}
                        </span>
                        <div className="hc-text">
                          <h4>
                            {item.title}
                            {item.tag && <span className="hc-tag">{item.tag}</span>}
                          </h4>
                          <p>{item.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
