import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import ScrapeJobs from './pages/ScrapeJobs.jsx';
import Campaigns from './pages/Campaigns.jsx';
import CampaignBuilder from './pages/CampaignBuilder.jsx';
import Sequences from './pages/Sequences.jsx';
import SequenceBuilder from './pages/SequenceBuilder.jsx';

export default function App() {
  return (
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
  );
}
