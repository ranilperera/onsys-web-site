'use client';

import { useEffect, useState } from 'react';
import { siteConfig } from '@/lib/config';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  service: string | null;
  message: string | null;
  status: string;
  channel: string;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/leads`, { credentials: 'include' })
      .then((r) => (r.status === 401 ? (window.location.href = '/admin/login', null) : r.json()))
      .then((d) => d && setLeads(d.leads))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 22 }}>Leads</h1>
      {leads.length === 0 ? (
        <p style={{ color: 'var(--gray)' }}>No enquiries yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--gray-light)' }}>
                <th style={{ padding: 10 }}>Name</th>
                <th style={{ padding: 10 }}>Email</th>
                <th style={{ padding: 10 }}>Company</th>
                <th style={{ padding: 10 }}>Service</th>
                <th style={{ padding: 10 }}>Channel</th>
                <th style={{ padding: 10 }}>Received</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--gray-light)' }}>
                  <td style={{ padding: 10 }}>{l.name}</td>
                  <td style={{ padding: 10 }}>
                    <a href={`mailto:${l.email}`}>{l.email}</a>
                  </td>
                  <td style={{ padding: 10 }}>{l.company ?? '—'}</td>
                  <td style={{ padding: 10 }}>{l.service ?? '—'}</td>
                  <td style={{ padding: 10 }}>{l.channel}</td>
                  <td style={{ padding: 10 }}>{new Date(l.createdAt).toLocaleDateString('en-AU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
