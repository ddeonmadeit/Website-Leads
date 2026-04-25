import cron from 'node-cron';
import { query } from '../db.js';
import { tickSequences } from './sequenceTick.js';
import { startEmailLoop } from '../email/sender.js';

async function enqueueRecurringScrapes() {
  // Find recurring jobs whose next_run_at is past — re-queue a new run by resetting status to queued
  await query(
    `UPDATE scrape_jobs
     SET status = 'queued',
         progress_current = 0,
         progress_total = 0,
         results_count = 0,
         error = NULL,
         last_run_at = NOW(),
         next_run_at = CASE schedule
           WHEN 'daily'  THEN NOW() + INTERVAL '1 day'
           WHEN 'weekly' THEN NOW() + INTERVAL '7 days'
           ELSE NULL END
     WHERE schedule IS NOT NULL
       AND next_run_at IS NOT NULL
       AND next_run_at <= NOW()
       AND status IN ('done','failed','cancelled')`,
  );
}

export function startCron() {
  // Every 15 minutes: consider recurring scrapes
  cron.schedule('*/15 * * * *', () => {
    enqueueRecurringScrapes().catch((e) => console.error('[cron] scrapes', e));
  });

  // Daily at 09:00 server time: advance sequences
  cron.schedule('0 9 * * *', () => {
    tickSequences().catch((e) => console.error('[cron] sequences', e));
  });

  // Kick the email loop for any pending/scheduled campaigns
  startEmailLoop().catch((e) => console.error('[cron] email loop', e));

  // Run a sequence tick once at boot for fast visibility in dev
  setTimeout(() => tickSequences().catch(() => {}), 30_000);
}
