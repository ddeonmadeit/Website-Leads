import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Layout from '../components/Layout.jsx';
import StatCard from '../components/StatCard.jsx';
import { I } from '../components/Icons.jsx';

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

  const l = stats?.leads || {};

  const actions = (
    <>
      <Link to="/scrape" className="btn-secondary">
        <I.Search /> New scrape
      </Link>
      <Link to="/campaigns/new" className="btn-primary">
        <I.Plus /> New campaign
      </Link>
    </>
  );

  return (
    <Layout breadcrumb={['Dashboard', 'Overview']} title="Analytics" actions={actions}>
      {err && <div className="card mb-4 text-red-300">{err}</div>}

      <div className="card-flat p-5 mb-6 flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center">
          <I.Zap />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-charcoal-100">Find businesses without websites</div>
          <div className="text-sm text-charcoal-400 mt-1">
            Scrape Google Maps, Yellow Pages and public Facebook pages across PH, IN, ZA, UAE.
            Filter, tag, and launch personalised cold-email campaigns through Resend.
          </div>
          <div className="mt-3 flex gap-2">
            <Link to="/scrape" className="btn-primary"><I.Search /> Run a scrape</Link>
            <Link to="/leads" className="btn-secondary"><I.Users /> View leads</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total leads" value={(l.total || 0).toLocaleString()} hint={`${l.with_email || 0} with email`} />
        <StatCard label="Emails sent" value={(l.sent || 0).toLocaleString()} hint="across all campaigns" />
        <StatCard label="Opens" value={(l.opened || 0).toLocaleString()} hint={pct(l.open_rate) + ' open rate'} />
        <StatCard label="Bounces" value={(l.bounced || 0).toLocaleString()} hint={pct(l.bounce_rate) + ' bounce rate'} color="#ef4444" />
        <StatCard label="Unsubscribed" value={(l.unsubscribed || 0).toLocaleString()} color="#f59e0b" />
        <StatCard label="Duplicates" value={(l.duplicates || 0).toLocaleString()} hint="auto-flagged" color="#94a3b8" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-charcoal-100">Scrape jobs</div>
              <div className="text-xs text-charcoal-400 mt-0.5">Background queue</div>
            </div>
            <I.Search className="text-charcoal-500" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-charcoal-400">Running</div>
              <div className="text-lg font-semibold text-brand-400">{stats?.jobs?.running || 0}</div>
            </div>
            <div>
              <div className="text-xs text-charcoal-400">Queued</div>
              <div className="text-lg font-semibold">{stats?.jobs?.queued || 0}</div>
            </div>
            <div>
              <div className="text-xs text-charcoal-400">Completed</div>
              <div className="text-lg font-semibold">{stats?.jobs?.done || 0}</div>
            </div>
          </div>
          <Link to="/scrape" className="text-brand-400 text-sm mt-4 inline-block hover:text-brand-300">Manage →</Link>
        </div>
        <div className="card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-charcoal-100">Campaigns</div>
              <div className="text-xs text-charcoal-400 mt-0.5">Sending pipeline</div>
            </div>
            <I.Send className="text-charcoal-500" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-charcoal-400">Sending</div>
              <div className="text-lg font-semibold text-brand-400">{stats?.campaigns?.sending || 0}</div>
            </div>
            <div>
              <div className="text-xs text-charcoal-400">Scheduled</div>
              <div className="text-lg font-semibold">{stats?.campaigns?.scheduled || 0}</div>
            </div>
            <div>
              <div className="text-xs text-charcoal-400">Completed</div>
              <div className="text-lg font-semibold">{stats?.campaigns?.done || 0}</div>
            </div>
          </div>
          <Link to="/campaigns" className="text-brand-400 text-sm mt-4 inline-block hover:text-brand-300">Manage →</Link>
        </div>
      </div>
    </Layout>
  );
}
