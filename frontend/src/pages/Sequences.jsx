import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Sequences() {
  const [rows, setRows] = useState([]);
  const load = () => api.listSequences().then((r) => setRows(r.rows || [])).catch(() => {});
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Follow-up sequences</h1>
        <Link to="/sequences/new" className="btn-primary">New sequence</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="th px-3 py-2">Name</th>
              <th className="th px-3 py-2">Steps</th>
              <th className="th px-3 py-2">Active enrolled</th>
              <th className="th px-3 py-2">Status</th>
              <th className="th px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="td px-3 py-2 font-medium">
                  <Link className="text-brand-600 hover:underline" to={`/sequences/${s.id}`}>{s.name}</Link>
                </td>
                <td className="td px-3 py-2">{s.step_count}</td>
                <td className="td px-3 py-2">{s.active_enrolled}</td>
                <td className="td px-3 py-2">
                  <span className={`chip ${s.active ? 'tag-green' : 'tag-gray'}`}>{s.active ? 'active' : 'paused'}</span>
                </td>
                <td className="td px-3 py-2 text-right">
                  {s.active && <button className="btn-ghost" onClick={() => api.stopSequence(s.id).then(load)}>Stop</button>}
                  <button className="btn-ghost" onClick={() => { if (confirm('Delete?')) api.deleteSequence(s.id).then(load); }}>Delete</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="td p-6 text-center text-slate-500" colSpan={5}>No sequences yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
