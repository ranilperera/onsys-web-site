import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <nav
        aria-label="Admin navigation"
        style={{
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--gray-light)',
          paddingBottom: 14,
          marginBottom: 28,
        }}
      >
        <Link href="/admin" style={{ fontWeight: 700, color: 'var(--navy)' }}>
          Dashboard
        </Link>
        <Link href="/admin/posts">Posts</Link>
        <Link href="/admin/leads">Leads</Link>
        <Link href="/admin/chat">Chat</Link>
      </nav>
      {children}
    </div>
  );
}
