import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function StatusBadge({ status }) {
  const map = {
    draft: 'tag-gray', scheduled: 'tag-yellow', sending: 'tag-blue',
    paused: 'tag-yellow', done: 'tag-green', cancelled: 'tag-red',
  };
  return <span className={`chip ${map[status] || 'tag-gray'}`}>{status}</span>;
}

export default function Campaigns() {
  const [rows, setRows] = useState([]);
  const load = async () => {
    try { const r = await api.listCampaigns(); setRows(r.rows || []); } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link to="/campaigns/new" className="btn-primary">New campaign</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="th px-3 py-2">Name</th>
              <th className="th px-3 py-2">Status</th>
              <th className="th px-3 py-2">Recipients</th>
              <th className="th px-3 py-2">Sent</th>
              <th className="th px-3 py-2">Opened</th>
              <th className="th px-3 py-2">Bounced</th>
              <th className="th px-3 py-2">Scheduled</th>
              <th className="th px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="td px-3 py-2 font-medium">
                  <Link className="text-brand-600 hover:underline" to={`/campaigns/${c.id}`}>{c.name}</Link>
                </td>
                <td className="td px-3 py-2"><StatusBadge status={c.status} /></td>
                <td className="td px-3 py-2">{c.total_recipients || 0}</td>
                <td className="td px-3 py-2">{c.sent || 0}</td>
                <td className="td px-3 py-2">{c.opened || 0}</td>
                <td className="td px-3 py-2">{c.bounced || 0}</td>
                <td className="td px-3 py-2 text-xs text-slate-500">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : '—'}</td>
                <td className="td px-3 py-2 text-right">
                  {c.status === 'sending' && <button className="btn-ghost" onClick={() => api.pauseCampaign(c.id).then(load)}>Pause</button>}
                  {c.status === 'paused' && <button className="btn-ghost" onClick={() => api.resumeCampaign(c.id).then(load)}>Resume</button>}
                  <button className="btn-ghost" onClick={() => { if (confirm('Delete?')) api.deleteCampaign(c.id).then(load); }}>Delete</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="td p-6 text-center text-slate-500" colSpan={8}>No campaigns yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
