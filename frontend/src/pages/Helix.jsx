import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { I } from '../components/Icons.jsx';

// Tiered presets — keep in sync with backend/src/scraper/presets.js.
const PRESETS = {
  Philippines: {
    flag: '🇵🇭',
    tagline: 'Best volume + easiest closes',
    niches: [
      { name: 'Real Estate Agencies & Brokers', tier: 1 },
      { name: 'Clinics (Dental / Aesthetic / Medical)', tier: 1 },
      { name: 'Construction / Contractors', tier: 1 },
      { name: 'Resorts / Boutique Hotels', tier: 2 },
      { name: 'Logistics / Freight / Export', tier: 2 },
    ],
  },
  India: {
    flag: '🇮🇳',
    tagline: 'Massive — bad website / no ROI market',
    niches: [
      { name: 'Coaching Institutes / Education Businesses', tier: 1 },
      { name: 'Medical Clinics / Diagnostics', tier: 1 },
      { name: 'Real Estate Developers / Brokers', tier: 1 },
      { name: 'D2C Brands (Shopify Sellers / CRO)', tier: 2 },
      { name: 'Recruitment / Staffing Agencies', tier: 2 },
    ],
  },
  'South Africa': {
    flag: '🇿🇦',
    tagline: 'Underrated sweet spot',
    niches: [
      { name: 'Law Firms', tier: 1 },
      { name: 'Security Companies', tier: 1 },
      { name: 'Construction & Engineering', tier: 1 },
      { name: 'Accounting Firms', tier: 2 },
      { name: 'Insurance Brokers', tier: 2 },
    ],
  },
  UAE: {
    flag: '🇦🇪',
    tagline: 'Where you actually make real money',
    niches: [
      { name: 'Real Estate Agencies', tier: 1 },
      { name: 'Luxury Clinics / Car Rentals / Concierge', tier: 1 },
      { name: 'B2B Logistics / Trade / Consulting', tier: 1 },
    ],
  },
};

const COUNTRIES = Object.keys(PRESETS);

const SOURCES = [
  { id: 'google_maps', label: 'Google Maps' },
  { id: 'yellow_pages', label: 'Yellow Pages' },
  { id: 'facebook', label: 'Facebook' },
];

function formatElapsed(s) {
  if (!s) return '0s';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function StatusDot({ status }) {
  const map = {
    queued: 'bg-sky-400', running: 'bg-brand-400 animate-pulse',
    done: 'bg-emerald-400', failed: 'bg-red-400', cancelled: 'bg-charcoal-500',
    idle: 'bg-charcoal-500',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[status] || 'bg-charcoal-500'}`} />;
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-charcoal-800 bg-charcoal-850 p-4">
      <div className="text-[11px] uppercase tracking-wider text-charcoal-400 font-medium">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent || 'text-charcoal-100'}`}>{value}</div>
    </div>
  );
}

export default function Helix() {
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [niche, setNiche] = useState(PRESETS[COUNTRIES[0]].niches[0].name);
  const [location, setLocation] = useState('');
  const [sources, setSources] = useState(['google_maps', 'yellow_pages']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  // poll backend
  useEffect(() => {
    const tick = async () => {
      try {
        const [s, j, l] = await Promise.all([
          api.stats().catch(() => null),
          api.listScrapeJobs().catch(() => ({ rows: [] })),
          api.listLeads({ limit: 25, sort: 'created_at', dir: 'desc' }).catch(() => ({ rows: [] })),
        ]);
        if (s) setStats(s);
        setJobs(j?.rows || []);
        setLeads(l?.rows || []);
      } catch {/* ignore */}
    };
    tick();
    const id = setInterval(tick, 4000);
    const clk = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(id); clearInterval(clk); };
  }, []);

  const niches = PRESETS[country]?.niches || [];

  // when country changes, reset niche to first
  useEffect(() => {
    if (niches.length && !niches.find((n) => n.name === niche)) {
      setNiche(niches[0].name);
    }
  }, [country]);

  const activeJob = useMemo(() => jobs.find((j) => j.status === 'running' || j.status === 'queued'), [jobs]);
  const status = activeJob ? activeJob.status : 'idle';
  const progress = activeJob
    ? `${activeJob.progress_current || 0}/${activeJob.progress_total || '?'}`
    : '0/0';

  useEffect(() => {
    if (activeJob && activeJob.status === 'running' && !startedAt) {
      setStartedAt(new Date(activeJob.created_at).getTime());
    }
    if (!activeJob && startedAt) setStartedAt(null);
  }, [activeJob, startedAt]);

  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;

  const personalEmails = leads.filter((l) => l.email && !/^(info|contact|hello|admin|sales|support|hi)@/i.test(l.email)).length;
  const genericEmails = leads.filter((l) => l.email && /^(info|contact|hello|admin|sales|support|hi)@/i.test(l.email)).length;
  const domainsScraped = stats?.leads?.total || leads.length;

  const startScrape = async (e) => {
    e?.preventDefault?.();
    setErr('');
    if (!location.trim()) { setErr('Location is required'); return; }
    if (!sources.length) { setErr('Pick at least one source'); return; }
    setBusy(true);
    try {
      await api.createScrapeJob({ country, niche, location, sources, schedule: null });
      setStartedAt(Date.now());
    } catch (ex) {
      setErr(ex.message || 'Failed to start scrape');
    } finally { setBusy(false); }
  };

  const stopScrape = async () => {
    if (!activeJob) return;
    try { await api.cancelScrapeJob(activeJob.id); } catch (ex) { setErr(ex.message); }
  };

  const exportCsv = () => {
    const url = api.exportUrl({});
    window.open(url, '_blank');
  };

  const toggleSource = (id) => {
    setSources((curr) => curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]);
  };

  return (
    <div className="min-h-screen bg-charcoal-900 text-charcoal-100">
      {/* Header */}
      <header className="border-b border-charcoal-800 bg-charcoal-875 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">H</div>
          <div className="font-semibold tracking-tight">Helix Outreach</div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-charcoal-850 border border-charcoal-800">
              <StatusDot status={status} />
              <span className="capitalize text-charcoal-200">{status}</span>
              <span className="text-charcoal-500">•</span>
              <span className="text-charcoal-300">{progress}</span>
            </div>
            <Link to="/leads" className="text-charcoal-400 hover:text-brand-400 text-sm">Leads</Link>
            <Link to="/campaigns" className="text-charcoal-400 hover:text-brand-400 text-sm">Campaigns</Link>
            <Link to="/sequences" className="text-charcoal-400 hover:text-brand-400 text-sm">Sequences</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Leads Found" value={(stats?.leads?.total || 0).toLocaleString()} accent="text-brand-400" />
          <StatCard label="Personal Emails" value={personalEmails.toLocaleString()} />
          <StatCard label="Generic Emails" value={genericEmails.toLocaleString()} />
          <StatCard label="Domains Scraped" value={domainsScraped.toLocaleString()} />
          <StatCard label="Time Elapsed" value={formatElapsed(elapsed)} />
        </div>

        {/* Configuration */}
        <section className="rounded-xl border border-charcoal-800 bg-charcoal-850">
          <div className="px-5 py-4 border-b border-charcoal-800 flex items-center justify-between">
            <div>
              <div className="font-semibold">Configuration</div>
              <div className="text-xs text-charcoal-400 mt-0.5">{PRESETS[country]?.flag} {PRESETS[country]?.tagline}</div>
            </div>
            <div className="text-xs text-charcoal-500">Tier 1 = highest close rate</div>
          </div>
          <form onSubmit={startScrape} className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="label">Country</label>
                <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{PRESETS[c].flag} {c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Niche</label>
                <select className="input" value={niche} onChange={(e) => setNiche(e.target.value)}>
                  {niches.map((n) => (
                    <option key={n.name} value={n.name}>
                      {n.tier === 1 ? '★ ' : ''}{n.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" placeholder="e.g. Manila, Mumbai, Cape Town, Dubai Marina"
                  value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Sources</label>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((s) => {
                  const on = sources.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSource(s.id)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        on
                          ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                          : 'bg-charcoal-850 border-charcoal-700 text-charcoal-300 hover:bg-charcoal-800'
                      }`}>
                      {on ? '✓ ' : ''}{s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {err && <div className="text-sm text-red-400">{err}</div>}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-charcoal-800">
              <button type="submit" disabled={busy || !!activeJob} className="btn-primary">
                <I.Search /> {busy ? 'Starting…' : activeJob ? 'Scrape running' : 'Start Scraping'}
              </button>
              <button type="button" onClick={stopScrape} disabled={!activeJob} className="btn-secondary">
                Stop
              </button>
              <button type="button" onClick={exportCsv} className="btn-secondary">
                <I.Download /> Backup to CSV
              </button>
              <Link to="/scrape" className="btn-ghost ml-auto">Manage queue →</Link>
            </div>
          </form>
        </section>

        {/* Activity + Recent Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-xl border border-charcoal-800 bg-charcoal-850">
            <div className="px-5 py-4 border-b border-charcoal-800 flex items-center justify-between">
              <div className="font-semibold">Activity Log</div>
              <span className="chip chip-gray">{jobs.length}</span>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto">
              {jobs.slice(0, 12).map((j) => (
                <div key={j.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-charcoal-800/60 text-sm">
                  <StatusDot status={j.status} />
                  <span className="text-charcoal-100">{j.niche}</span>
                  <span className="text-charcoal-500">·</span>
                  <span className="text-charcoal-400">{j.location}</span>
                  <span className="ml-auto text-xs text-charcoal-500">
                    {j.progress_current}/{j.progress_total || '?'}
                  </span>
                </div>
              ))}
              {!jobs.length && (
                <div className="p-8 text-center text-sm text-charcoal-500">
                  <I.Search className="mx-auto mb-2 opacity-50" />
                  No activity yet. Start a scrape above.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-charcoal-800 bg-charcoal-850">
            <div className="px-5 py-4 border-b border-charcoal-800 flex items-center justify-between">
              <div className="font-semibold">Recent Leads</div>
              <Link to="/leads" className="text-brand-400 hover:text-brand-300 text-xs">View all →</Link>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-charcoal-850">
                  <tr className="border-b border-charcoal-800 text-left">
                    <th className="th">Email</th>
                    <th className="th">Business</th>
                    <th className="th">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 20).map((l) => (
                    <tr key={l.id} className="border-b border-charcoal-800/60">
                      <td className="td truncate max-w-[180px]" title={l.email}>{l.email || '—'}</td>
                      <td className="td truncate max-w-[160px] text-charcoal-300" title={l.business_name}>{l.business_name}</td>
                      <td className="td text-xs text-charcoal-400">{l.source || '—'}</td>
                    </tr>
                  ))}
                  {!leads.length && (
                    <tr><td colSpan={3} className="td text-center text-charcoal-500 py-8">
                      <I.Users className="mx-auto mb-2 opacity-50" />
                      No leads yet
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Outreach quick-links */}
        <section className="rounded-xl border border-charcoal-800 bg-charcoal-850 p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center">
              <I.Send />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Ready to send?</div>
              <div className="text-sm text-charcoal-400 mt-1">
                Build a personalised cold-email campaign or drip sequence with merge tags
                ({'{{business_name}}'}, {'{{city}}'}, {'{{niche}}'}). Resend handles delivery,
                bounces and unsubscribes.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/campaigns/new" className="btn-primary"><I.Plus /> New campaign</Link>
                <Link to="/sequences/new" className="btn-secondary"><I.Repeat /> New sequence</Link>
                <Link to="/leads" className="btn-ghost"><I.Users /> Manage leads</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
