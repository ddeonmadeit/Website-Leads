import { Router } from 'express';
import { query } from '../db.js';
import { PRESETS, COUNTRIES } from '../scraper/presets.js';

const router = Router();

router.get('/presets', (_req, res) => {
  res.json({ countries: COUNTRIES, presets: PRESETS });
});

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const { rows } = await query(
      `SELECT * FROM scrape_jobs ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    res.json({ rows });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM scrape_jobs WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { country, niche, location, sources, schedule } = req.body || {};
    if (!country || !niche || !location) {
      return res.status(400).json({ error: 'country_niche_location_required' });
    }
    if (!PRESETS[country]) return res.status(400).json({ error: 'unknown_country' });
    const { rows } = await query(
      `INSERT INTO scrape_jobs (country, niche, location, sources, schedule, next_run_at, status)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 IS NOT NULL THEN NOW() + INTERVAL '1 minute' ELSE NULL END, 'queued')
       RETURNING *`,
      [country, niche, location, sources || ['google_maps'], schedule || null],
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    await query(
      `UPDATE scrape_jobs SET status = 'cancelled' WHERE id = $1 AND status IN ('queued','running')`,
      [req.params.id],
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM scrape_jobs WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
