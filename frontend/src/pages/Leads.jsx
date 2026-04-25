import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Layout from '../components/Layout.jsx';
import { I } from '../components/Icons.jsx';

const COUNTRIES = ['Philippines', 'India', 'South Africa', 'UAE'];
const WEBSITE_STATUSES = ['none', 'broken', 'social_only', 'ok'];
const EMAIL_STATUSES = ['not_sent', 'sent', 'opened', 'bounced', 'unsubscribed'];

function StatusBadge({ status }) {
  const map = {
    not_sent: 'chip-gray', sent: 'chip-blue', opened: 'chip-green',
    bounced: 'chip-red', unsubscribed: 'chip-yellow',
  };
  return <span className={`chip ${map[status] || 'chip-gray'}`}>{status || '—'}</span>;
}

function WebsiteBadge({ status }) {
  const map = { none: 'chip-red', broken: 'chip-red', social_only: 'chip-yellow', ok: 'chip-green' };
  return <span className={`chip ${map[status] || 'chip-gray'}`}>{status || '—'}</span>;
}

export default function Leads() {
  const [filter, setFilter] = useState({
    search: '', country: '', niche: '', email_status: '',
    website_status: '', has_email: '', tag: '',
    include_duplicates: 'false',
    date_from: '', date_to: '',
  });
  const [showFilters, setShowFilters] = useState(false);
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

  const actions = (
    <>
      <button className="btn-secondary" onClick={() => setShowFilters((v) => !v)}>
        <I.Filter /> Filter
      </button>
      <a className="btn-secondary" href={api.exportUrl(params)} download>
        <I.Download /> Export
      </a>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onImport} />
      <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
        <I.Upload /> Import
      </button>
    </>
  );

  return (
    <Layout
      breadcrumb={['Leads', 'All']}
      title={<>Leads <span className="text-charcoal-500 text-base font-normal ml-2">({data.total.toLocaleString()})</span></>}
      actions={actions}
    >
      {showFilters && (
        <div className="card mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="label">Search</label>
            <input className="input" value={filter.search} onChange={(e) => { setFilter({ ...filter, search: e.target.value }); setPage(0); }} placeholder="name, email, city…" />
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
      )}

      {selected.size > 0 && (
        <div className="card mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-charcoal-200">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-secondary" onClick={bulkTag}><I.Tag /> Add tag</button>
            <Link className="btn-secondary" to="/campaigns/new" state={{ leadIds: [...selected] }}>
              <I.Send /> Add to campaign
            </Link>
            <button className="btn-danger" onClick={bulkDelete}><I.Trash /> Delete</button>
            <button className="btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {importMsg && <div className="text-sm text-charcoal-400 mb-3">{importMsg}</div>}

      <div className="card-flat overflow-x-auto p-0">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-charcoal-800">
              <th className="th w-10"><input type="checkbox" className="accent-brand-500" checked={selected.size === data.rows.length && data.rows.length > 0} onChange={toggleAll} /></th>
              <th className="th">Business</th>
              <th className="th">Niche</th>
              <th className="th">Country</th>
              <th className="th">City</th>
              <th className="th">Email</th>
              <th className="th">Phone</th>
              <th className="th">Website</th>
              <th className="th">Email status</th>
              <th className="th">Tags</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className={`border-b border-charcoal-800/60 hover:bg-charcoal-850/60 ${selected.has(r.id) ? 'bg-brand-500/5' : ''}`}>
                <td className="td"><input type="checkbox" className="accent-brand-500" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td className="td font-medium">
                  <div className="flex items-center gap-2">
                    {r.business_name}
                    {r.is_duplicate && <span className="chip chip-yellow" title="Possible duplicate">dup</span>}
                  </div>
                </td>
                <td className="td text-charcoal-300">{r.category}</td>
                <td className="td text-charcoal-300">{r.country}</td>
                <td className="td text-charcoal-300">{r.city}</td>
                <td className="td text-charcoal-300">{r.email || <span className="text-charcoal-500">—</span>}</td>
                <td className="td text-charcoal-300">{r.phone}</td>
                <td className="td"><WebsiteBadge status={r.website_status} /></td>
                <td className="td"><StatusBadge status={r.email_status} /></td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {(r.tags || []).map((t) => <span key={t} className="chip">{t}</span>)}
                  </div>
                </td>
              </tr>
            ))}
            {!data.rows.length && (
              <tr><td className="td p-12 text-center text-charcoal-400" colSpan={10}>
                <I.Inbox className="mx-auto mb-3 opacity-50" width={32} height={32} />
                No leads yet — run a scrape job to get started.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end mt-4">
        <button className="btn-secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
        <span className="text-sm text-charcoal-400">Page {page + 1}</span>
        <button className="btn-secondary" disabled={(page + 1) * pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
        {busy && <span className="text-xs text-charcoal-500 ml-2">Loading…</span>}
      </div>
    </Layout>
  );
}
