import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { I } from '../components/Icons.jsx';

// Tiered presets — keep in sync with backend/src/scraper/presets.js.
const PRESETS = {
  Philippines: {
    flag: '🇵🇭',
    tagline: 'Best volume + easiest closes',
    cities: [
      'Manila', 'Quezon City', 'Makati', 'Bonifacio Global City (Taguig)',
      'Pasig', 'Cebu City', 'Davao City', 'Iloilo City', 'Baguio',
      'Cagayan de Oro', 'Mandaue', 'Antipolo', 'Bacolod',
    ],
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
    cities: [
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
      'Pune', 'Ahmedabad', 'Gurgaon', 'Noida', 'Jaipur', 'Chandigarh',
      'Surat', 'Lucknow', 'Indore', 'Kochi',
    ],
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
    cities: [
      'Johannesburg', 'Cape Town', 'Durban', 'Pretoria',
      'Port Elizabeth (Gqeberha)', 'Bloemfontein', 'East London',
      'Polokwane', 'Stellenbosch', 'Sandton', 'Centurion',
    ],
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
    cities: [
      'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah',
      'Fujairah', 'Dubai Marina', 'Downtown Dubai', 'Business Bay',
      'Jumeirah Lake Towers (JLT)', 'Deira', 'Al Barsha', 'Jumeirah',
    ],
    niches: [
      { name: 'Real Estate Agencies', tier: 1 },
      { name: 'Luxury Clinics / Car Rentals / Concierge', tier: 1 },
      { name: 'B2B Logistics / Trade / Consulting', tier: 1 },
    ],
  },
};

const CUSTOM = '__custom__';

const COUNTRIES = Object.keys(PRESETS);

const SOURCES = [
  { id: 'openstreetmap', label: 'OpenStreetMap', recommended: true },
  { id: 'yellow_pages', label: 'Yellow Pages' },
  { id: 'google_maps', label: 'Google Maps (often blocked)' },
  { id: 'facebook', label: 'Facebook (often blocked)' },
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

const NAV_GROUPS = [
  {
    label: 'Leads',
    items: [
      { to: '/leads', label: 'All leads' },
      { to: '/scrape', label: 'Scrape jobs' },
    ],
  },
  {
    label: 'Outreach',
    items: [
      { to: '/campaigns', label: 'Campaigns' },
      { to: '/sequences', label: 'Sequences' },
    ],
  },
];

function HelixHeader({ status, progress }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-charcoal-800 bg-charcoal-875 sticky top-0 z-20 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold shrink-0">H</div>
        <div className="font-semibold tracking-tight truncate">Helix Outreach</div>

        <div className="ml-auto flex items-center gap-2 md:gap-4 text-sm">
          <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-md bg-charcoal-850 border border-charcoal-800">
            <StatusDot status={status} />
            <span className="capitalize text-charcoal-200 hidden sm:inline">{status}</span>
            <span className="text-charcoal-500 hidden sm:inline">•</span>
            <span className="text-charcoal-300 text-xs">{progress}</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="relative group">
                <button className="text-charcoal-300 hover:text-brand-400 text-sm flex items-center gap-1">
                  {g.label}
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><path d="M6 9L1 4h10z"/></svg>
                </button>
                <div className="absolute right-0 top-full pt-2 hidden group-hover:block min-w-[160px]">
                  <div className="rounded-lg border border-charcoal-800 bg-charcoal-875 shadow-lg py-1">
                    {g.items.map((it) => (
                      <Link key={it.to} to={it.to}
                        className="block px-3 py-2 text-sm text-charcoal-300 hover:bg-charcoal-800 hover:text-brand-300">
                        {it.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </nav>

          {/* Mobile burger */}
          <button type="button" className="md:hidden btn-icon" onClick={() => setOpen(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-charcoal-875 border-l border-charcoal-800 p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-charcoal-100">Menu</div>
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="mb-4">
                <div className="text-[11px] uppercase tracking-wider text-charcoal-500 mb-1.5">{g.label}</div>
                {g.items.map((it) => (
                  <Link key={it.to} to={it.to} onClick={() => setOpen(false)}
                    className="block px-3 py-2 rounded-lg text-charcoal-200 hover:bg-charcoal-800">
                    {it.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
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
  const [city, setCity] = useState(PRESETS[COUNTRIES[0]].cities[0]);
  const [customCity, setCustomCity] = useState('');
  const [targetCount, setTargetCount] = useState(50);
  const [sources, setSources] = useState(['openstreetmap', 'yellow_pages']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState('');
  const [lastSubmittedAt, setLastSubmittedAt] = useState(0);
  const [runner, setRunner] = useState(null);

  // poll backend
  const refreshAll = async () => {
    try {
      const [s, j, l, r] = await Promise.all([
        api.stats().catch(() => null),
        api.listScrapeJobs().catch(() => ({ rows: [] })),
        api.listLeads({ limit: 25, sort: 'created_at', dir: 'desc' }).catch(() => ({ rows: [] })),
        api.runnerStatus().catch(() => null),
      ]);
      if (s) setStats(s);
      setJobs(j?.rows || []);
      setLeads(l?.rows || []);
      setRunner(r);
    } catch {/* ignore */}
  };

  useEffect(() => {
    refreshAll();
    const id = setInterval(refreshAll, 3000);
    const clk = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(id); clearInterval(clk); };
  }, []);

  const niches = PRESETS[country]?.niches || [];
  const cities = PRESETS[country]?.cities || [];

  // when country changes, reset niche + city to defaults for that country
  useEffect(() => {
    if (niches.length && !niches.find((n) => n.name === niche)) {
      setNiche(niches[0].name);
    }
    if (cities.length && city !== CUSTOM && !cities.includes(city)) {
      setCity(cities[0]);
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
    setToast('');
    const loc = city === CUSTOM ? customCity.trim() : city;
    if (!loc) { setErr('Location is required'); return; }
    if (!sources.length) { setErr('Pick at least one source'); return; }
    const tc = Math.max(1, Math.min(1000, Number(targetCount) || 50));
    setBusy(true);
    try {
      const job = await api.createScrapeJob({
        country, niche, location: loc, sources,
        target_count: tc, schedule: null,
      });
      setStartedAt(Date.now());
      setLastSubmittedAt(Date.now());
      setToast(`✓ Scrape job #${job?.id || ''} queued — picking up shortly`);
      // Refresh immediately so the user sees the queued job appear without waiting for the next poll
      await refreshAll();
      setTimeout(() => setToast(''), 6000);
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
      <HelixHeader status={status} progress={progress} />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Toast / status banner */}
        {toast && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {toast}
          </div>
        )}

        {/* Active job banner (queued or running) */}
        {activeJob && (
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 md:p-5">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center shrink-0">
                <I.Search />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusDot status={activeJob.status} />
                  <span className="text-sm font-semibold text-charcoal-100 capitalize">
                    {activeJob.status === 'queued' ? 'Queued — waiting for worker' : 'Scraping live'}
                  </span>
                  <span className="text-xs text-charcoal-400">
                    · {activeJob.country} · {activeJob.niche} · {activeJob.location}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-charcoal-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(((activeJob.progress_current || 0) / Math.max(1, activeJob.progress_total || activeJob.target_count || 50)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-charcoal-400">
                  <span>{activeJob.progress_current || 0} / {activeJob.progress_total || activeJob.target_count || 50} candidates</span>
                  <span>{activeJob.emails_found || 0} with email · {formatElapsed(elapsed)}</span>
                </div>
              </div>
              <button type="button" className="btn-secondary" onClick={stopScrape}>Stop</button>
            </div>
          </div>
        )}

        {/* Runner-down warning — only when we got a real JSON response that
            explicitly says running:false. Avoids false-positive when the
            endpoint is missing (server returns the SPA HTML). */}
        {runner && typeof runner === 'object' && runner.running === false && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="font-semibold text-amber-200">Background worker is not running</div>
            <div className="text-amber-300/90 mt-1 text-xs">
              Scrape jobs won't start until the worker is alive. Check Railway logs.
              {runner.bootTime && (
                <span className="block mt-1 text-charcoal-500 font-mono">boot: {runner.bootTime}</span>
              )}
            </div>
          </div>
        )}

        {/* SerpAPI hint — surface when the user picks Google Maps but the key
            isn't configured. Without the key, Puppeteer is the only option and
            Google blocks Railway's IP range outright. */}
        {runner && runner.serpApiConfigured === false && sources.includes('google_maps') && (
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm">
            <div className="font-semibold text-sky-200">Google Maps needs SerpAPI on Railway</div>
            <div className="text-sky-300/90 mt-1 text-xs leading-relaxed">
              Google blocks scraping from datacenter IPs (Railway, AWS, GCP) — there is no way around this without
              a residential proxy or a paid Google Maps API. The cheapest fix:
              <ol className="list-decimal list-inside mt-1.5 space-y-0.5">
                <li>Sign up at <a className="underline" href="https://serpapi.com" target="_blank" rel="noreferrer">serpapi.com</a> (free tier: 250 searches/month)</li>
                <li>Copy your API key from the dashboard</li>
                <li>In Railway → backend service → Variables, add <code className="font-mono px-1 rounded bg-sky-500/20">SERPAPI_KEY</code> with your key as the value</li>
                <li>Railway redeploys automatically; Google Maps starts working immediately</li>
              </ol>
              For now, your scrape will use OpenStreetMap (free, no key needed, but limited contact info).
            </div>
          </div>
        )}

        {/* Last-job result banner — covers both 'failed' and 'done with 0 leads' */}
        {!activeJob && jobs[0] && jobs[0].status === 'failed' && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
            <div className="font-semibold text-red-200">Last scrape failed</div>
            <div className="text-red-300 mt-1 break-words font-mono text-xs">{jobs[0].error || 'unknown_error'}</div>
            <div className="text-charcoal-400 mt-2 text-xs">
              Check Railway logs. Try a different city or fewer sources.
            </div>
          </div>
        )}
        {!activeJob && jobs[0] && jobs[0].status === 'done' && (jobs[0].results_count || 0) === 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="font-semibold text-amber-200">Last scrape finished with 0 leads</div>
            <div className="text-amber-300/90 mt-1 text-xs">
              The sources returned nothing matching the filter (Google Maps may be blocking the
              datacenter IP, or every result already has a working website). Try a different
              niche/city, or add Yellow Pages / Facebook as additional sources.
            </div>
          </div>
        )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <select
                  className="input"
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                >
                  <option value={10}>10 leads</option>
                  <option value={25}>25 leads</option>
                  <option value={50}>50 leads</option>
                  <option value={100}>100 leads</option>
                  <option value={200}>200 leads</option>
                  <option value={500}>500 leads</option>
                  <option value={1000}>1000 leads (max)</option>
                </select>
                <div className="text-[11px] text-charcoal-500 mt-1">
                  Scraper keeps going until it hits this many qualified leads.
                </div>
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
                    <th className="th">Business</th>
                    <th className="th">Email</th>
                    <th className="th">Phone</th>
                    <th className="th hidden sm:table-cell">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 20).map((l) => (
                    <tr key={l.id} className="border-b border-charcoal-800/60">
                      <td className="td truncate max-w-[160px] text-charcoal-100" title={l.business_name}>{l.business_name || '—'}</td>
                      <td className="td truncate max-w-[180px] text-charcoal-300" title={l.email}>{l.email || '—'}</td>
                      <td className="td whitespace-nowrap text-charcoal-300">{l.phone || '—'}</td>
                      <td className="td text-xs text-charcoal-400 hidden sm:table-cell">{l.source || '—'}</td>
                    </tr>
                  ))}
                  {!leads.length && (
                    <tr><td colSpan={4} className="td text-center text-charcoal-500 py-8">
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
