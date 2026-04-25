import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';

import leadsRoutes from './routes/leads.js';
import scrapeJobsRoutes from './routes/scrapeJobs.js';
import campaignsRoutes from './routes/campaigns.js';
import sequencesRoutes from './routes/sequences.js';
import webhooksRoutes from './routes/webhooks.js';
import statsRoutes from './routes/stats.js';
import unsubscribeRoutes from './routes/unsubscribe.js';
import { startJobRunner } from './jobs/runner.js';
import { startCron } from './jobs/cron.js';

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

app.use('/unsubscribe', unsubscribeRoutes);

app.use('/leads', leadsRoutes);
app.use('/scrape-jobs', scrapeJobsRoutes);
app.use('/campaigns', campaignsRoutes);
app.use('/sequences', sequencesRoutes);
app.use('/stats', statsRoutes);

app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(err.status || 500).json({ error: err.message || 'internal_error' });
});

app.listen(PORT, () => {
  console.log(`[api] listening on ${PORT}`);
  startJobRunner().catch((e) => console.error('[jobs] runner failed', e));
  startCron();
});
