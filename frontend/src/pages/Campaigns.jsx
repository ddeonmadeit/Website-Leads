import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Layout from '../components/Layout.jsx';
import { I } from '../components/Icons.jsx';

function StatusBadge({ status }) {
  const map = {
    draft: 'chip-gray', scheduled: 'chip-yellow', sending: 'chip-orange',
    paused: 'chip-yellow', done: 'chip-green', cancelled: 'chip-red',
  };
  return <span className={`chip ${map[status] || 'chip-gray'}`}>{status}</span>;
}

export default function Campaigns() {
  const [rows, setRows] = useState([]);
  const load = async () => {
    try { const r = await api.listCampaigns(); setRows(r.rows || []); } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);

  const actions = (
    <Link to="/campaigns/new" className="btn-primary">
      <I.Plus /> New campaign
    </Link>
  );

  return (
    <Layout breadcrumb={['Outreach', 'Campaigns']} title="Campaigns" actions={actions}>
      <div className="card-flat overflow-x-auto p-0">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-charcoal-800">
              <th className="th">Name</th>
              <th className="th">Status</th>
              <th className="th">Recipients</th>
              <th className="th">Sent</th>
              <th className="th">Opened</th>
              <th className="th">Bounced</th>
              <th className="th">Scheduled</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-charcoal-800/60 hover:bg-charcoal-850/60">
                <td className="td font-medium">
                  <Link className="text-brand-400 hover:text-brand-300 hover:underline" to={`/campaigns/${c.id}`}>{c.name}</Link>
                </td>
                <td className="td"><StatusBadge status={c.status} /></td>
                <td className="td text-charcoal-300">{c.total_recipients || 0}</td>
                <td className="td text-charcoal-300">{c.sent || 0}</td>
                <td className="td text-charcoal-300">{c.opened || 0}</td>
                <td className="td text-charcoal-300">{c.bounced || 0}</td>
                <td className="td text-xs text-charcoal-400">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : '—'}</td>
                <td className="td text-right">
                  {c.status === 'sending' && <button className="btn-ghost" onClick={() => api.pauseCampaign(c.id).then(load)}>Pause</button>}
                  {c.status === 'paused' && <button className="btn-ghost" onClick={() => api.resumeCampaign(c.id).then(load)}>Resume</button>}
                  <button className="btn-ghost text-red-400" onClick={() => { if (confirm('Delete?')) api.deleteCampaign(c.id).then(load); }}>Delete</button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="td p-12 text-center text-charcoal-400" colSpan={8}>
                <I.Send className="mx-auto mb-3 opacity-50" width={32} height={32} />
                No campaigns yet.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
