import { Router } from 'express';
import { query, tx } from '../db.js';
import { idsFromFilter } from '../leadsModel.js';
import { personalize } from '../email/sender.js';
import { scanSpamTriggers } from '../utils/spamWords.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
        (SELECT COUNT(*)::int FROM campaign_recipients cr WHERE cr.campaign_id = c.id) AS total_recipients,
        (SELECT COUNT(*)::int FROM campaign_recipients cr WHERE cr.campaign_id = c.id AND cr.status = 'sent') AS sent,
        (SELECT COUNT(*)::int FROM campaign_recipients cr WHERE cr.campaign_id = c.id AND cr.status = 'opened') AS opened,
        (SELECT COUNT(*)::int FROM campaign_recipients cr WHERE cr.campaign_id = c.id AND cr.status = 'bounced') AS bounced
       FROM campaigns c
       ORDER BY c.created_at DESC`,
    );
    res.json({ rows });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'not_found' });
    const recipients = await query(
      `SELECT cr.*, l.business_name, l.email, l.city, l.country
       FROM campaign_recipients cr
       JOIN leads l ON l.id = cr.lead_id
       WHERE cr.campaign_id = $1
       ORDER BY cr.id ASC LIMIT 500`,
      [req.params.id],
    );
    res.json({ campaign: rows[0], recipients: recipients.rows });
  } catch (e) { next(e); }
});

router.post('/spam-check', (req, res) => {
  const { subject } = req.body || {};
  res.json(scanSpamTriggers(String(subject || '')));
});

router.post('/preview', async (req, res, next) => {
  try {
    const {
      subject, body_html, body_text, lead_id,
      logo_url, brand_color, bg_color, text_color, font_family, cta_text, cta_url,
    } = req.body || {};
    let lead = {
      business_name: 'Acme Clinic', city: 'Manila', country: 'Philippines',
      category: 'Dental Clinic', email: 'sample@example.com', phone: '+63 2 123 4567',
    };
    if (lead_id) {
      const { rows } = await query('SELECT * FROM leads WHERE id = $1', [lead_id]);
      if (rows[0]) lead = rows[0];
    }
    const result = personalize({
      subject, bodyHtml: body_html, bodyText: body_text, lead,
      branding: { logo_url, brand_color, bg_color, text_color, font_family, cta_text, cta_url },
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name || !b.subject || !b.body_html || !b.from_email || !b.from_name) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }
    const { rows } = await query(
      `INSERT INTO campaigns
         (name, from_name, from_email, reply_to, subject, body_html, body_text,
          hourly_limit, batch_delay_ms, scheduled_at, status, lead_filter,
          logo_url, brand_color, bg_color, text_color, font_family, cta_text, cta_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [
        b.name, b.from_name, b.from_email, b.reply_to || null,
        b.subject, b.body_html, b.body_text || null,
        b.hourly_limit || Number(process.env.DEFAULT_HOURLY_SEND_LIMIT) || 50,
        b.batch_delay_ms || 2000,
        b.scheduled_at || null,
        'draft',
        JSON.stringify(b.lead_filter || {}),
        b.logo_url || null, b.brand_color || null, b.bg_color || null,
        b.text_color || null, b.font_family || null, b.cta_text || null, b.cta_url || null,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = [
      'name', 'from_name', 'from_email', 'reply_to', 'subject', 'body_html', 'body_text',
      'hourly_limit', 'batch_delay_ms', 'scheduled_at',
      'logo_url', 'brand_color', 'bg_color', 'text_color', 'font_family', 'cta_text', 'cta_url',
    ];
    const sets = []; const params = [];
    for (const k of allowed) {
      if (k in req.body) { params.push(req.body[k]); sets.push(`${k} = $${params.length}`); }
    }
    if (!sets.length) return res.json({ ok: true });
    params.push(req.params.id);
    const { rows } = await query(`UPDATE campaigns SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// Assign recipients from either explicit IDs or a filter
router.post('/:id/recipients', async (req, res, next) => {
  try {
    const campaignId = Number(req.params.id);
    let ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : null;
    if ((!ids || !ids.length) && req.body?.filter) {
      ids = await idsFromFilter(req.body.filter);
    }
    if (!ids?.length) return res.status(400).json({ error: 'no_recipients' });

    // Only leads with email, not bounced/unsubscribed, not duplicates
    const { rows } = await query(
      `SELECT id FROM leads
       WHERE id = ANY($1::int[])
         AND email IS NOT NULL
         AND email_status NOT IN ('bounced','unsubscribed')
         AND is_duplicate = FALSE`,
      [ids],
    );
    const filtered = rows.map((r) => r.id);
    if (!filtered.length) return res.json({ added: 0, skipped: ids.length });

    const values = filtered.map((_, i) => `($1, $${i + 2}, 'pending')`).join(', ');
    const params = [campaignId, ...filtered];
    const result = await query(
      `INSERT INTO campaign_recipients (campaign_id, lead_id, status)
       VALUES ${values}
       ON CONFLICT (campaign_id, lead_id) DO NOTHING`,
      params,
    );
    res.json({ added: result.rowCount, skipped: ids.length - result.rowCount });
  } catch (e) { next(e); }
});

// Launch / schedule a campaign
router.post('/:id/launch', async (req, res, next) => {
  try {
    const { scheduled_at } = req.body || {};
    const now = !scheduled_at || new Date(scheduled_at) <= new Date();
    await query(
      `UPDATE campaigns SET status = $2, scheduled_at = $3, started_at = CASE WHEN $2 = 'sending' THEN NOW() ELSE NULL END
       WHERE id = $1`,
      [req.params.id, now ? 'sending' : 'scheduled', scheduled_at || null],
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/pause', async (req, res, next) => {
  try {
    await query(`UPDATE campaigns SET status = 'paused' WHERE id = $1 AND status IN ('sending','scheduled')`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/resume', async (req, res, next) => {
  try {
    await query(`UPDATE campaigns SET status = 'sending' WHERE id = $1 AND status = 'paused'`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM campaigns WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
