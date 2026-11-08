'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';

export type TechGroupView = {
  title: string;
  icon: string;
  chips: Array<{ key: string; name: string; detail?: string; icon: string; href?: string }>;
};

/**
 * Platform groups as cards. On desktop every group shows side by side; on a
 * phone the same markup becomes tabs, so a visitor sees one group at a time
 * instead of scrolling through every entry. Without JavaScript the first tab
 * shows on phones and everything shows on desktop.
 */
export function TechGroups({ groups }: { groups: TechGroupView[] }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const pathname = usePathname();

  return (
    <div className="tg">
      {groups.length > 1 && (
        <div className="tg-tabs" role="tablist" aria-label="Platform groups">
          {groups.map((group, i) => (
            <button
              key={group.title}
              type="button"
              role="tab"
              id={`${base}-tab-${i}`}
              aria-controls={`${base}-panel-${i}`}
              aria-selected={active === i}
              className="tg-tab"
              onClick={() => setActive(i)}
            >
              <svg aria-hidden="true">
                <use href={`#${group.icon}`} />
              </svg>
              {shortTitle(group.title)}
            </button>
          ))}
        </div>
      )}

      <div className="tech-groups">
        {groups.map((group, i) => (
          <div
            className={`tech-card tg-card tg-accent-${i % 3}`}
            key={group.title}
            id={`${base}-panel-${i}`}
            role="tabpanel"
            aria-labelledby={`${base}-tab-${i}`}
            data-active={active === i}
          >
            <div className="tg-head">
              <span className="tg-head-ic" aria-hidden="true">
                <svg>
                  <use href={`#${group.icon}`} />
                </svg>
              </span>
              <h3 className="tg-title">{group.title}</h3>
              <span className="tg-count">{group.chips.length}</span>
            </div>
            <ul className="tg-list">
              {group.chips.map((chip) => {
                // No link back to the page the visitor is already on.
                const href = chip.href && chip.href !== pathname ? chip.href : undefined;
                const body = (
                  <>
                    <span className="tg-glyph" aria-hidden="true">
                      <svg>
                        <use href={`#${chip.icon}`} />
                      </svg>
                    </span>
                    <span className="tg-text">
                      <span className="tg-name">{chip.name}</span>
                      {chip.detail && <span className="tg-detail">{chip.detail}</span>}
                    </span>
                    {href && (
                      <svg className="tg-arrow" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" />
                      </svg>
                    )}
                  </>
                );
                return (
                  <li key={chip.key}>
                    {href ? (
                      <Link className="tg-row tg-row--link" href={href}>
                        {body}
                      </Link>
                    ) : (
                      <div className="tg-row">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tabs are narrow on a phone, so each shows its title up to the first
 * separator: "High availability & DR" becomes "High availability".
 */
function shortTitle(title: string): string {
  return title.split(/\s*(?:,|&|—|\band\b)\s*/)[0].trim() || title;
}
