import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Layout from '../components/Layout.jsx';
import { I } from '../components/Icons.jsx';

export default function Sequences() {
  const [rows, setRows] = useState([]);
  const load = () => api.listSequences().then((r) => setRows(r.rows || [])).catch(() => {});
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);

  const actions = (
    <Link to="/sequences/new" className="btn-primary">
      <I.Plus /> New sequence
    </Link>
  );

  return (
    <Layout breadcrumb={['Outreach', 'Sequences']} title="Follow-up sequences" actions={actions}>
      <div className="card-flat overflow-x-auto p-0">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-charcoal-800">
              <th className="th">Name</th>
              <th className="th">Steps</th>
              <th className="th">Active enrolled</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-charcoal-800/60 hover:bg-charcoal-850/60">
                <td className="td font-medium">
                  <Link className="text-brand-400 hover:text-brand-300 hover:underline" to={`/sequences/${s.id}`}>{s.name}</Link>
                </td>
                <td className="td text-charcoal-300">{s.step_count}</td>
                <td className="td text-charcoal-300">{s.active_enrolled}</td>
                <td className="td">
                  <span className={`chip ${s.active ? 'chip-green' : 'chip-gray'}`}>{s.active ? 'active' : 'paused'}</span>
                </td>
                <td className="td text-right">
                  {s.active && <button className="btn-ghost" onClick={() => api.stopSequence(s.id).then(load)}>Stop</button>}
                  <button className="btn-ghost text-red-400" onClick={() => { if (confirm('Delete?')) api.deleteSequence(s.id).then(load); }}>Delete</button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="td p-12 text-center text-charcoal-400" colSpan={5}>
                <I.Repeat className="mx-auto mb-3 opacity-50" width={32} height={32} />
                No sequences yet.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
