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
const BOOT_TIME = new Date().toISOString();
app.get('/api/debug/runner', (_req, res) => {
  const status = runnerStatus();
  // Self-heal: if the runner is somehow not alive when this is hit, kick it.
  // Idempotent — startJobRunner() returns early if running===true.
  if (!status.running) startJobRunner().catch(() => {});
  res.json({
    ...status,
    uptime: Math.floor(process.uptime()),
    bootTime: BOOT_TIME,
    serpApiConfigured: Boolean(process.env.SERPAPI_KEY),
  });
});
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

// Start background workers at module load time — not inside app.listen
// callback, which can silently fail to execute on Railway if the TCP
// bind is slow or the callback throws before reaching these lines.
console.log('[startup] launching job runner and cron…');
startJobRunner().catch((e) => console.error('[jobs] runner failed at startup', e));
reclaimOrphanedJobs().catch((e) => console.error('[jobs] reclaim failed at startup', e));
startCron();

app.listen(PORT, () => {
  console.log(`[api] listening on ${PORT}`);
});
