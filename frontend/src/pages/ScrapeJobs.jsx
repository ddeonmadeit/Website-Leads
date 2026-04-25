import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Layout from '../components/Layout.jsx';
import { I } from '../components/Icons.jsx';

const SOURCES = [
  { id: 'google_maps', label: 'Google Maps' },
  { id: 'yellow_pages', label: 'Yellow Pages' },
  { id: 'facebook', label: 'Facebook (public)' },
];

function StatusPill({ status }) {
  const map = {
    queued: 'chip-blue', running: 'chip-orange',
    done: 'chip-green', failed: 'chip-red', cancelled: 'chip-gray',
  };
  return <span className={`chip ${map[status] || 'chip-gray'}`}>{status}</span>;
}

export default function ScrapeJobs() {
  const [presets, setPresets] = useState({ countries: [], presets: {} });
  const [jobs, setJobs] = useState([]);
  const [country, setCountry] = useState('');
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [sources, setSources] = useState(['google_maps']);
  const [schedule, setSchedule] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const r = await api.listScrapeJobs();
      setJobs(r.rows || []);
    } catch (e) { console.error(e); }
  };
  useEffect(() => {
    api.scrapePresets().then((r) => {
      setPresets(r);
      if (r.countries?.[0]) setCountry(r.countries[0]);
    }).catch(() => {});
    load();
    const i = setInterval(load, 4000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const niches = presets.presets?.[country]?.niches || [];
    if (niches.length) setNiche((n) => n || niches[0]);
  }, [country, presets]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await api.createScrapeJob({ country, niche, location, sources, schedule: schedule || null });
      setLocation('');
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally { setBusy(false); }
  };

  const niches = presets.presets?.[country]?.niches || [];

  return (
    <Layout breadcrumb={['Leads', 'Scrape jobs']} title="Scrape jobs">
      <form onSubmit={submit} className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="label">Country</label>
            <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {(presets.countries || []).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Niche</label>
            <select className="input" value={niche} onChange={(e) => setNiche(e.target.value)}>
              {niches.map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" placeholder="Manila, Dubai Marina" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>
          <div>
            <label className="label">Schedule</label>
            <select className="input" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              <option value="">One-off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={busy} className="btn-primary w-full">
              <I.Search /> {busy ? 'Queuing…' : 'Run scrape'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <span className="label !mb-0">Sources:</span>
          {SOURCES.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5 text-sm text-charcoal-200">
              <input
                type="checkbox"
                className="accent-brand-500"
                checked={sources.includes(s.id)}
                onChange={() => setSources((curr) => curr.includes(s.id) ? curr.filter((x) => x !== s.id) : [...curr, s.id])}
              />
              {s.label}
            </label>
          ))}
        </div>
        {err && <div className="text-red-400 text-sm mt-3">{err}</div>}
      </form>

      <div className="card-flat overflow-x-auto p-0">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-charcoal-800">
              <th className="th">Created</th>
              <th className="th">Country</th>
              <th className="th">Niche</th>
              <th className="th">Location</th>
              <th className="th">Schedule</th>
              <th className="th">Status</th>
              <th className="th">Progress</th>
              <th className="th">Found / Email</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-charcoal-800/60 hover:bg-charcoal-850/60">
                <td className="td text-xs text-charcoal-400">{new Date(j.created_at).toLocaleString()}</td>
                <td className="td">{j.country}</td>
                <td className="td text-charcoal-300">{j.niche}</td>
                <td className="td text-charcoal-300">{j.location}</td>
                <td className="td text-charcoal-300">{j.schedule || 'one-off'}</td>
                <td className="td"><StatusPill status={j.status} /></td>
                <td className="td text-charcoal-300">{j.progress_current}/{j.progress_total || '?'}</td>
                <td className="td text-charcoal-300">{j.results_count} / {j.emails_found}</td>
                <td className="td text-right">
                  {(j.status === 'queued' || j.status === 'running') && (
                    <button className="btn-ghost" onClick={() => api.cancelScrapeJob(j.id).then(load)}>Cancel</button>
                  )}
                  <button className="btn-ghost text-red-400" onClick={() => api.deleteScrapeJob(j.id).then(load)}>Delete</button>
                </td>
              </tr>
            ))}
            {!jobs.length && (
              <tr><td className="td p-12 text-center text-charcoal-400" colSpan={9}>
                <I.Search className="mx-auto mb-3 opacity-50" width={32} height={32} />
                No scrape jobs yet.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
