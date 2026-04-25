import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import ScrapeJobs from './pages/ScrapeJobs.jsx';
import Campaigns from './pages/Campaigns.jsx';
import CampaignBuilder from './pages/CampaignBuilder.jsx';
import Sequences from './pages/Sequences.jsx';
import SequenceBuilder from './pages/SequenceBuilder.jsx';

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <button className="btn-ghost" onClick={() => setDark((d) => !d)} title="Toggle theme">
      {dark ? '☀' : '☾'}
    </button>
  );
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const link = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${isActive
      ? 'bg-brand-600 text-white'
      : 'text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'}`;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="font-bold text-lg text-brand-600">LeadScout</div>
          <nav className="flex gap-1 flex-wrap">
            <NavLink to="/" className={link} end>Dashboard</NavLink>
            <NavLink to="/leads" className={link}>Leads</NavLink>
            <NavLink to="/scrape" className={link}>Scrape</NavLink>
            <NavLink to="/campaigns" className={link}>Campaigns</NavLink>
            <NavLink to="/sequences" className={link}>Sequences</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <button className="btn-secondary" onClick={async () => { await logout(); nav('/login'); }}>Log out</button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <Protected>
              <Shell>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/scrape" element={<ScrapeJobs />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/campaigns/new" element={<CampaignBuilder />} />
                  <Route path="/campaigns/:id" element={<CampaignBuilder />} />
                  <Route path="/sequences" element={<Sequences />} />
                  <Route path="/sequences/new" element={<SequenceBuilder />} />
                  <Route path="/sequences/:id" element={<SequenceBuilder />} />
                </Routes>
              </Shell>
            </Protected>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
