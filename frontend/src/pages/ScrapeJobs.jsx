import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Layout from '../components/Layout.jsx';
import { I } from '../components/Icons.jsx';

const SOURCES = [
  { id: 'google_maps', label: 'Google Maps' },
  { id: 'yellow_pages', label: 'Yellow Pages' },
  { id: 'facebook', label: 'Facebook (public)' },
];

// Fallback presets — keep in sync with backend/src/scraper/presets.js so the
// dropdowns are populated even if the /presets request hasn't returned yet.
// Niches are objects { name, tier } where tier 1 = highest close rate.
const FALLBACK_PRESETS = {
  countries: ['Philippines', 'India', 'South Africa', 'UAE'],
  presets: {
    Philippines: {
      cities: ['Manila', 'Quezon City', 'Makati', 'Bonifacio Global City (Taguig)', 'Pasig', 'Cebu City', 'Davao City', 'Iloilo City', 'Baguio', 'Cagayan de Oro', 'Mandaue', 'Antipolo', 'Bacolod'],
      niches: [
        { name: 'Real Estate Agencies & Brokers', tier: 1 },
        { name: 'Clinics (Dental / Aesthetic / Medical)', tier: 1 },
        { name: 'Construction / Contractors', tier: 1 },
        { name: 'Resorts / Boutique Hotels', tier: 2 },
        { name: 'Logistics / Freight / Export', tier: 2 },
      ],
    },
    India: {
      cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Gurgaon', 'Noida', 'Jaipur', 'Chandigarh', 'Surat', 'Lucknow', 'Indore', 'Kochi'],
      niches: [
        { name: 'Coaching Institutes / Education Businesses', tier: 1 },
        { name: 'Medical Clinics / Diagnostics', tier: 1 },
        { name: 'Real Estate Developers / Brokers', tier: 1 },
        { name: 'D2C Brands (Shopify Sellers / CRO)', tier: 2 },
        { name: 'Recruitment / Staffing Agencies', tier: 2 },
      ],
    },
    'South Africa': {
      cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth (Gqeberha)', 'Bloemfontein', 'East London', 'Polokwane', 'Stellenbosch', 'Sandton', 'Centurion'],
      niches: [
        { name: 'Law Firms', tier: 1 },
        { name: 'Security Companies', tier: 1 },
        { name: 'Construction & Engineering', tier: 1 },
        { name: 'Accounting Firms', tier: 2 },
        { name: 'Insurance Brokers', tier: 2 },
      ],
    },
    UAE: {
      cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Dubai Marina', 'Downtown Dubai', 'Business Bay', 'Jumeirah Lake Towers (JLT)', 'Deira', 'Al Barsha', 'Jumeirah'],
      niches: [
        { name: 'Real Estate Agencies', tier: 1 },
        { name: 'Luxury Clinics / Car Rentals / Concierge', tier: 1 },
        { name: 'B2B Logistics / Trade / Consulting', tier: 1 },
      ],
    },
  },
};

const CUSTOM = '__custom__';
const nicheName = (n) => (typeof n === 'string' ? n : n?.name);

function StatusPill({ status }) {
  const map = {
    queued: 'chip-blue', running: 'chip-orange',
    done: 'chip-green', failed: 'chip-red', cancelled: 'chip-gray',
  };
  return <span className={`chip ${map[status] || 'chip-gray'}`}>{status}</span>;
}

export default function ScrapeJobs() {
  const [presets, setPresets] = useState(FALLBACK_PRESETS);
  const [jobs, setJobs] = useState([]);
  const initialCountry = FALLBACK_PRESETS.countries[0];
  const [country, setCountry] = useState(initialCountry);
  const [niche, setNiche] = useState(nicheName(FALLBACK_PRESETS.presets[initialCountry].niches[0]));
  const [city, setCity] = useState(FALLBACK_PRESETS.presets[initialCountry].cities[0]);
  const [customCity, setCustomCity] = useState('');
  const [targetCount, setTargetCount] = useState(50);
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
      if (r?.countries?.length) setPresets(r);
    }).catch(() => {});
    load();
    const i = setInterval(load, 4000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const ns = presets.presets?.[country]?.niches || [];
    const names = ns.map(nicheName);
    if (names.length && !names.includes(niche)) setNiche(names[0]);
    const cs = presets.presets?.[country]?.cities || [];
    if (cs.length && city !== CUSTOM && !cs.includes(city)) setCity(cs[0]);
  }, [country, presets]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const loc = city === CUSTOM ? customCity.trim() : city;
    if (!loc) { setErr('Location is required'); setBusy(false); return; }
    const tc = Math.max(1, Math.min(1000, Number(targetCount) || 50));
    try {
      await api.createScrapeJob({
        country, niche, location: loc, sources,
        target_count: tc, schedule: schedule || null,
      });
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally { setBusy(false); }
  };

  const niches = presets.presets?.[country]?.niches || [];
  const cities = presets.presets?.[country]?.cities || [];

  return (
    <Layout breadcrumb={['Leads', 'Scrape jobs']} title="Scrape jobs">
      <form onSubmit={submit} className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="label">Country</label>
            <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {(presets.countries || []).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Niche</label>
            <select className="input" value={niche} onChange={(e) => setNiche(e.target.value)}>
              {niches.map((n) => {
                const name = nicheName(n);
                const tier = typeof n === 'object' ? n.tier : null;
                return (
                  <option key={name} value={name}>{tier === 1 ? '★ ' : ''}{name}</option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value={CUSTOM}>Custom location…</option>
            </select>
            {city === CUSTOM && (
              <input className="input mt-2" placeholder="Type a location"
                value={customCity} onChange={(e) => setCustomCity(e.target.value)} />
            )}
          </div>
          <div>
            <label className="label">Target leads</label>
            <input className="input" type="number" min="1" max="1000" step="10"
              value={targetCount} onChange={(e) => setTargetCount(e.target.value)} />
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
              <th className="th">Target</th>
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
                <td className="td text-charcoal-300">{j.target_count || 50}</td>
                <td className="td text-charcoal-300">{j.schedule || 'one-off'}</td>
                <td className="td"><StatusPill status={j.status} /></td>
                <td className="td text-charcoal-300">{j.progress_current}/{j.progress_total || j.target_count || '?'}</td>
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
              <tr><td className="td p-12 text-center text-charcoal-400" colSpan={10}>
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
