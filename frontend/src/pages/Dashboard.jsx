import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Link } from 'react-router-dom';

function Stat({ label, value, hint }) {
  return (
    <div className="card">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function pct(x) {
  return `${Math.round((Number(x) || 0) * 1000) / 10}%`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try { setStats(await api.stats()); } catch (e) { setErr(e.message); }
  };
  useEffect(() => {
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!stats) return <div className="text-slate-500">Loading…</div>;
  const l = stats.leads || {};
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        <div className="flex gap-2">
          <Link to="/scrape" className="btn-secondary">New scrape</Link>
          <Link to="/campaigns/new" className="btn-primary">New campaign</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Stat label="Total leads" value={l.total || 0} />
        <Stat label="With email" value={l.with_email || 0} />
        <Stat label="Emails sent" value={l.sent || 0} />
        <Stat label="Opens" value={l.opened || 0} />
        <Stat label="Bounces" value={l.bounced || 0} />
        <Stat label="Open rate" value={pct(l.open_rate)} />
        <Stat label="Bounce rate" value={pct(l.bounce_rate)} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="card">
          <div className="font-semibold mb-2">Scrape jobs</div>
          <div className="text-sm text-slate-500">
            Running: {stats.jobs?.running || 0} · Queued: {stats.jobs?.queued || 0} · Completed: {stats.jobs?.done || 0}
          </div>
          <Link to="/scrape" className="text-brand-600 text-sm mt-2 inline-block">Manage →</Link>
        </div>
        <div className="card">
          <div className="font-semibold mb-2">Campaigns</div>
          <div className="text-sm text-slate-500">
            Sending: {stats.campaigns?.sending || 0} · Scheduled: {stats.campaigns?.scheduled || 0} · Done: {stats.campaigns?.done || 0}
          </div>
          <Link to="/campaigns" className="text-brand-600 text-sm mt-2 inline-block">Manage →</Link>
        </div>
      </div>
    </div>
  );
}
