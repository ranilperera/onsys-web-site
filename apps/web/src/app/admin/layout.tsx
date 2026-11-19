import type { Metadata } from 'next';
import { AdminNav } from './AdminNav';
import { FirstRunGate } from './FirstRunGate';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <AdminNav />
      <FirstRunGate>{children}</FirstRunGate>
    </div>
  );
}
