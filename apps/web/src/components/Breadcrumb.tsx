import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} style={{ display: 'contents' }}>
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span className="current" aria-current="page">
              {item.label}
            </span>
          )}
          {i < items.length - 1 && (
            <span className="sep" aria-hidden="true">
              /
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
