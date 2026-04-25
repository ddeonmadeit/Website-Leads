import { Router } from 'express';
import { allStats } from '../leadsModel.js';
import { query } from '../db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const leads = await allStats();
    const { rows: jobRows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'running')::int AS running,
         COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
         COUNT(*) FILTER (WHERE status = 'done')::int AS done
       FROM scrape_jobs`);
    const { rows: campRows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'sending')::int AS sending,
         COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
         COUNT(*) FILTER (WHERE status = 'done')::int AS done
       FROM campaigns`);
    res.json({ leads, jobs: jobRows[0], campaigns: campRows[0] });
  } catch (e) { next(e); }
});

export default router;
