import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import leadsRoutes from './routes/leads.js';
import scrapeJobsRoutes from './routes/scrapeJobs.js';
import campaignsRoutes from './routes/campaigns.js';
import sequencesRoutes from './routes/sequences.js';
import webhooksRoutes from './routes/webhooks.js';
import statsRoutes from './routes/stats.js';
import unsubscribeRoutes from './routes/unsubscribe.js';
import { startJobRunner, reclaimOrphanedJobs, runnerStatus } from './jobs/runner.js';
import { startCron } from './jobs/cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolves to the frontend/dist directory relative to backend/src/index.js
const FRONTEND_DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('tiny'));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// Webhook routes need raw body for signature verification, mount before JSON parser.
app.use('/webhooks', webhooksRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/api/debug/runner', (_req, res) => res.json({ ...runnerStatus(), uptime: Math.floor(process.uptime()) }));
app.use('/unsubscribe', unsubscribeRoutes);

// API routes — prefixed with /api so they don't conflict with React Router paths
app.use('/api/leads', leadsRoutes);
app.use('/api/scrape-jobs', scrapeJobsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/sequences', sequencesRoutes);
app.use('/api/stats', statsRoutes);

// Serve built frontend if dist exists (combined deploy), otherwise API-only.
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Error handler — must be registered last (4-arg signature)
app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(err.status || 500).json({ error: err.message || 'internal_error' });
});

app.listen(PORT, async () => {
  console.log(`[api] listening on ${PORT}`);
  // Reclaim any scrape job left in 'running' by a previous container so it
  // resumes instead of being orphaned. Campaigns naturally resume because the
  // email loop already picks up rows still marked 'sending'.
  await reclaimOrphanedJobs().catch((e) => console.error('[jobs] reclaim failed', e));
  startJobRunner().catch((e) => console.error('[jobs] runner failed', e));
  startCron();
});
