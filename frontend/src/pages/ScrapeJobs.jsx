import { useEffect, useState } from 'react';
import { api } from '../api.js';

const SOURCES = [
  { id: 'google_maps', label: 'Google Maps' },
  { id: 'yellow_pages', label: 'Yellow Pages' },
  { id: 'facebook', label: 'Facebook (public)' },
];

function StatusPill({ status }) {
  const map = {
    queued: 'tag-blue', running: 'tag-yellow',
    done: 'tag-green', failed: 'tag-red', cancelled: 'tag-gray',
  };
  return <span className={`chip ${map[status] || 'tag-gray'}`}>{status}</span>;
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scrape jobs</h1>
      <form onSubmit={submit} className="card grid grid-cols-1 md:grid-cols-5 gap-3">
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
          <input className="input" placeholder="e.g. Manila, Dubai Marina" value={location} onChange={(e) => setLocation(e.target.value)} required />
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
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Queuing…' : 'Run scrape'}</button>
        </div>
        <div className="md:col-span-5 flex flex-wrap gap-3 items-center">
          <span className="label !mb-0">Sources:</span>
          {SOURCES.map((s) => (
            <label key={s.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={sources.includes(s.id)}
                onChange={() => setSources((curr) => curr.includes(s.id) ? curr.filter((x) => x !== s.id) : [...curr, s.id])}
              />
              {s.label}
            </label>
          ))}
        </div>
        {err && <div className="md:col-span-5 text-red-600 text-sm">{err}</div>}
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="th px-3 py-2">Created</th>
              <th className="th px-3 py-2">Country</th>
              <th className="th px-3 py-2">Niche</th>
              <th className="th px-3 py-2">Location</th>
              <th className="th px-3 py-2">Schedule</th>
              <th className="th px-3 py-2">Status</th>
              <th className="th px-3 py-2">Progress</th>
              <th className="th px-3 py-2">Found / Email</th>
              <th className="th px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="td px-3 py-2 text-xs text-slate-500">{new Date(j.created_at).toLocaleString()}</td>
                <td className="td px-3 py-2">{j.country}</td>
                <td className="td px-3 py-2">{j.niche}</td>
                <td className="td px-3 py-2">{j.location}</td>
                <td className="td px-3 py-2">{j.schedule || 'one-off'}</td>
                <td className="td px-3 py-2"><StatusPill status={j.status} /></td>
                <td className="td px-3 py-2">{j.progress_current}/{j.progress_total || '?'}</td>
                <td className="td px-3 py-2">{j.results_count} / {j.emails_found}</td>
                <td className="td px-3 py-2 text-right">
                  {(j.status === 'queued' || j.status === 'running') && (
                    <button className="btn-ghost" onClick={() => api.cancelScrapeJob(j.id).then(load)}>Cancel</button>
                  )}
                  <button className="btn-ghost" onClick={() => api.deleteScrapeJob(j.id).then(load)}>Delete</button>
                </td>
              </tr>
            ))}
            {!jobs.length && <tr><td className="td p-6 text-center text-slate-500" colSpan={9}>No jobs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
