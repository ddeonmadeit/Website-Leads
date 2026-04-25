import { Router } from 'express';
import { query, tx } from '../db.js';
import { idsFromFilter } from '../leadsModel.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, (SELECT COUNT(*)::int FROM sequence_steps WHERE sequence_id = s.id) AS step_count,
        (SELECT COUNT(*)::int FROM sequence_enrollments WHERE sequence_id = s.id AND status = 'active') AS active_enrolled
       FROM sequences s ORDER BY s.created_at DESC`,
    );
    res.json({ rows });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM sequences WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'not_found' });
    const steps = await query('SELECT * FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_order', [req.params.id]);
    res.json({ sequence: rows[0], steps: steps.rows });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name || !b.from_email || !b.from_name) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const result = await tx(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO sequences (name, from_name, from_email, reply_to, lead_filter, active)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [b.name, b.from_name, b.from_email, b.reply_to || null, JSON.stringify(b.lead_filter || {}), b.active !== false],
      );
      const seq = rows[0];
      if (Array.isArray(b.steps)) {
        for (let i = 0; i < b.steps.length; i += 1) {
          const s = b.steps[i];
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            `INSERT INTO sequence_steps (sequence_id, step_order, day_offset, subject, body_html, body_text)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [seq.id, i + 1, Number(s.day_offset || 0), s.subject, s.body_html, s.body_text || null],
          );
        }
      }
      return seq;
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    const allowed = ['name', 'from_name', 'from_email', 'reply_to', 'lead_filter', 'active'];
    const sets = []; const params = [];
    for (const k of allowed) {
      if (k in b) {
        params.push(k === 'lead_filter' ? JSON.stringify(b[k] || {}) : b[k]);
        sets.push(`${k} = $${params.length}`);
      }
    }
    if (sets.length) {
      params.push(req.params.id);
      await query(`UPDATE sequences SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }
    if (Array.isArray(b.steps)) {
      await tx(async (client) => {
        await client.query('DELETE FROM sequence_steps WHERE sequence_id = $1', [req.params.id]);
        for (let i = 0; i < b.steps.length; i += 1) {
          const s = b.steps[i];
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            `INSERT INTO sequence_steps (sequence_id, step_order, day_offset, subject, body_html, body_text)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.params.id, i + 1, Number(s.day_offset || 0), s.subject, s.body_html, s.body_text || null],
          );
        }
      });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/enroll', async (req, res, next) => {
  try {
    let ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : null;
    if ((!ids || !ids.length) && req.body?.filter) {
      ids = await idsFromFilter(req.body.filter);
    }
    if (!ids?.length) return res.status(400).json({ error: 'no_leads' });
    // Only enroll leads with email, not already unsubscribed/bounced
    const { rows } = await query(
      `SELECT id FROM leads WHERE id = ANY($1::int[])
         AND email IS NOT NULL AND email_status NOT IN ('bounced','unsubscribed')`,
      [ids],
    );
    const keep = rows.map((r) => r.id);
    if (!keep.length) return res.json({ enrolled: 0 });
    const values = keep.map((_, i) => `($1, $${i + 2})`).join(', ');
    const result = await query(
      `INSERT INTO sequence_enrollments (sequence_id, lead_id)
       VALUES ${values}
       ON CONFLICT (sequence_id, lead_id) DO NOTHING`,
      [req.params.id, ...keep],
    );
    res.json({ enrolled: result.rowCount });
  } catch (e) { next(e); }
});

router.post('/:id/stop', async (req, res, next) => {
  try {
    await query(`UPDATE sequences SET active = FALSE WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM sequences WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
