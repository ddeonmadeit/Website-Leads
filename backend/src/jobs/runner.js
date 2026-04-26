import { query } from '../db.js';
import { runScrape } from '../scraper/index.js';
import { insertLead } from '../leadsModel.js';

let running = false;

async function pickNextJob() {
  const { rows } = await query(
    `UPDATE scrape_jobs SET status = 'running', started_at = NOW()
     WHERE id = (
       SELECT id FROM scrape_jobs
       WHERE status = 'queued'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
  );
  return rows[0] || null;
}

async function updateProgress(id, current, total, emails) {
  await query(
    `UPDATE scrape_jobs SET progress_current = $2, progress_total = $3, emails_found = $4
     WHERE id = $1`,
    [id, current, total, emails],
  );
}

async function finishJob(id, count, error = null) {
  await query(
    `UPDATE scrape_jobs
     SET status = $2, results_count = $3, error = $4, finished_at = NOW()
     WHERE id = $1`,
    [id, error ? 'failed' : 'done', count, error],
  );
}

async function executeJob(job) {
  let count = 0;
  const target = job.target_count || 50;
  try {
    // Seed progress with target so the bar shows X/target right away
    await updateProgress(job.id, 0, target, 0).catch(() => {});
    const results = await runScrape({
      country: job.country,
      niche: job.niche,
      location: job.location,
      sources: job.sources || ['google_maps'],
      targetCount: target,
      onProgress: ({ current, total, emails }) =>
        updateProgress(job.id, current || 0, total || target, emails || 0).catch(() => {}),
    });
    for (const r of results) {
      // eslint-disable-next-line no-await-in-loop
      await insertLead({
        business_name: r.business_name,
        category: r.category || job.niche,
        country: r.country || job.country,
        city: r.city || job.location,
        phone: r.phone,
        email: r.email,
        website_url: r.website_url,
        website_status: r.website_status,
        source: r.source,
      }, { scrapeJobId: job.id, skipDuplicates: true });
      count += 1;
    }
    await finishJob(job.id, count);
  } catch (err) {
    console.error('[jobs] job failed', job.id, err);
    await finishJob(job.id, count, err.message || 'unknown_error');
  }
}

export async function startJobRunner() {
  if (running) return;
  running = true;
  const loop = async () => {
    while (running) {
      try {
        const job = await pickNextJob();
        if (!job) {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        await executeJob(job);
      } catch (err) {
        console.error('[jobs] loop error', err);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };
  loop();
}

export function stopJobRunner() { running = false; }

// Reset jobs that were 'running' when the previous container died so the
// runner picks them up again instead of leaving them orphaned forever.
export async function reclaimOrphanedJobs() {
  const { rowCount } = await query(
    `UPDATE scrape_jobs
       SET status = 'queued', started_at = NULL, progress_current = 0, error = NULL
     WHERE status = 'running'`,
  );
  if (rowCount > 0) console.log(`[jobs] reclaimed ${rowCount} orphaned running job(s)`);
}
