import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { Link } from 'react-router-dom';

const COUNTRIES = ['Philippines', 'India', 'South Africa', 'UAE'];
const WEBSITE_STATUSES = ['none', 'broken', 'social_only', 'ok'];
const EMAIL_STATUSES = ['not_sent', 'sent', 'opened', 'bounced', 'unsubscribed'];

function StatusBadge({ status }) {
  const map = {
    not_sent: 'tag-gray', sent: 'tag-blue', opened: 'tag-green',
    bounced: 'tag-red', unsubscribed: 'tag-yellow',
  };
  return <span className={`chip ${map[status] || 'tag-gray'}`}>{status || '—'}</span>;
}

function WebsiteBadge({ status }) {
  const map = { none: 'tag-red', broken: 'tag-red', social_only: 'tag-yellow', ok: 'tag-green' };
  return <span className={`chip ${map[status] || 'tag-gray'}`}>{status || '—'}</span>;
}

export default function Leads() {
  const [filter, setFilter] = useState({
    search: '', country: '', niche: '', email_status: '',
    website_status: '', has_email: '', tag: '',
    include_duplicates: 'false',
    date_from: '', date_to: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef();

  const params = useMemo(() => {
    const p = { ...filter, limit: pageSize, offset: page * pageSize };
    Object.keys(p).forEach((k) => { if (p[k] === '' || p[k] == null) delete p[k]; });
    return p;
  }, [filter, page, pageSize]);

  const load = async () => {
    setBusy(true);
    try { setData(await api.listLeads(params)); }
    catch (e) { console.error(e); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, [params]);

  const toggle = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((s) => {
      if (s.size === data.rows.length) return new Set();
      return new Set(data.rows.map((r) => r.id));
    });
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} leads?`)) return;
    await api.bulkDelete([...selected]);
    setSelected(new Set());
    load();
  };
  const bulkTag = async () => {
    const tag = prompt('Tag to add:');
    if (!tag) return;
    await api.bulkTag([...selected], tag);
    setSelected(new Set());
    load();
  };
  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg('Importing…');
    try {
      const r = await api.importLeads(file);
      setImportMsg(`Inserted ${r.inserted}, skipped ${r.duplicates} duplicates.`);
      load();
    } catch (ex) {
      setImportMsg(`Error: ${ex.message}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Leads <span className="text-slate-500 text-base font-normal">({data.total.toLocaleString()})</span></h1>
        <div className="flex gap-2 flex-wrap">
          <a className="btn-secondary" href={api.exportUrl(params)} download>Export CSV</a>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onImport} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>Import CSV</button>
        </div>
      </div>

      <div className="card grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div>
          <label className="label">Search</label>
          <input className="input" value={filter.search} onChange={(e) => { setFilter({ ...filter, search: e.target.value }); setPage(0); }} placeholder="name, email, city, phone" />
        </div>
        <div>
          <label className="label">Country</label>
          <select className="input" value={filter.country} onChange={(e) => { setFilter({ ...filter, country: e.target.value }); setPage(0); }}>
            <option value="">All</option>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Niche</label>
          <input className="input" value={filter.niche} onChange={(e) => { setFilter({ ...filter, niche: e.target.value }); setPage(0); }} placeholder="exact niche" />
        </div>
        <div>
          <label className="label">Email status</label>
          <select className="input" value={filter.email_status} onChange={(e) => { setFilter({ ...filter, email_status: e.target.value }); setPage(0); }}>
            <option value="">Any</option>
            {EMAIL_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Website</label>
          <select className="input" value={filter.website_status} onChange={(e) => { setFilter({ ...filter, website_status: e.target.value }); setPage(0); }}>
            <option value="">Any</option>
            {WEBSITE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Has email?</label>
          <select className="input" value={filter.has_email} onChange={(e) => { setFilter({ ...filter, has_email: e.target.value }); setPage(0); }}>
            <option value="">Any</option>
            <option value="true">With email</option>
            <option value="false">Missing email</option>
          </select>
        </div>
        <div>
          <label className="label">Tag</label>
          <input className="input" value={filter.tag} onChange={(e) => { setFilter({ ...filter, tag: e.target.value }); setPage(0); }} />
        </div>
        <div>
          <label className="label">From</label>
          <input className="input" type="date" value={filter.date_from} onChange={(e) => { setFilter({ ...filter, date_from: e.target.value }); setPage(0); }} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" type="date" value={filter.date_to} onChange={(e) => { setFilter({ ...filter, date_to: e.target.value }); setPage(0); }} />
        </div>
        <div>
          <label className="label">Include dupes</label>
          <select className="input" value={filter.include_duplicates} onChange={(e) => { setFilter({ ...filter, include_duplicates: e.target.value }); setPage(0); }}>
            <option value="false">Hide</option>
            <option value="true">Show</option>
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="card flex items-center gap-2 flex-wrap">
          <span className="text-sm">{selected.size} selected</span>
          <button className="btn-secondary" onClick={bulkTag}>Add tag</button>
          <Link className="btn-secondary" to="/campaigns/new" state={{ leadIds: [...selected] }}>Add to campaign</Link>
          <button className="btn-danger" onClick={bulkDelete}>Delete</button>
          <button className="btn-ghost ml-auto" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {importMsg && <div className="text-sm text-slate-500">{importMsg}</div>}

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="th px-3 py-2"><input type="checkbox" checked={selected.size === data.rows.length && data.rows.length > 0} onChange={toggleAll} /></th>
              <th className="th px-3 py-2">Business</th>
              <th className="th px-3 py-2">Niche</th>
              <th className="th px-3 py-2">Country</th>
              <th className="th px-3 py-2">City</th>
              <th className="th px-3 py-2">Email</th>
              <th className="th px-3 py-2">Phone</th>
              <th className="th px-3 py-2">Website</th>
              <th className="th px-3 py-2">Email status</th>
              <th className="th px-3 py-2">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.rows.map((r) => (
              <tr key={r.id} className={selected.has(r.id) ? 'bg-brand-50 dark:bg-brand-900/20' : ''}>
                <td className="td px-3 py-2"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td className="td px-3 py-2 font-medium flex items-center gap-2">
                  {r.business_name}
                  {r.is_duplicate && <span className="chip tag-yellow" title="Possible duplicate">dup</span>}
                </td>
                <td className="td px-3 py-2">{r.category}</td>
                <td className="td px-3 py-2">{r.country}</td>
                <td className="td px-3 py-2">{r.city}</td>
                <td className="td px-3 py-2">{r.email || <span className="text-slate-400">—</span>}</td>
                <td className="td px-3 py-2">{r.phone}</td>
                <td className="td px-3 py-2"><WebsiteBadge status={r.website_status} /></td>
                <td className="td px-3 py-2"><StatusBadge status={r.email_status} /></td>
                <td className="td px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(r.tags || []).map((t) => <span key={t} className="chip">{t}</span>)}
                  </div>
                </td>
              </tr>
            ))}
            {!data.rows.length && (
              <tr><td className="td p-6 text-center text-slate-500" colSpan={10}>No leads — run a scrape job to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button className="btn-secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
        <span className="text-sm text-slate-500">Page {page + 1}</span>
        <button className="btn-secondary" disabled={(page + 1) * pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
        {busy && <span className="text-xs text-slate-400 ml-2">Loading…</span>}
      </div>
    </div>
  );
}
