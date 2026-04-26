import { Router } from 'express';
import multer from 'multer';
import {
  listLeads, getLead, updateLead, deleteLeads, bulkAssignTag, insertLead, idsFromFilter,
} from '../leadsModel.js';
import { parseCsv, stringifyCsv } from '../utils/csv.js';
import { sendDirectEmail } from '../email/sender.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, sort, dir, ...filter } = req.query;
    const data = await listLeads(filter, { limit: Math.min(500, Number(limit)), offset: Number(offset), sort, dir });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/export.csv', async (req, res, next) => {
  try {
    const { ...filter } = req.query;
    const { rows } = await listLeads(filter, { limit: 100000, offset: 0 });
    const columns = [
      'id', 'created_at', 'business_name', 'category', 'country', 'city',
      'phone', 'email', 'website_status', 'website_url', 'source',
      'email_status', 'email_sent_at', 'notes', 'tags', 'is_duplicate',
    ];
    const data = rows.map((r) => ({ ...r, tags: (r.tags || []).join('|') }));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(stringifyCsv(data, columns));
  } catch (e) { next(e); }
});

router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file_required' });
    const records = parseCsv(req.file.buffer);
    let inserted = 0;
    let duplicates = 0;
    for (const rec of records) {
      const lead = {
        business_name: rec.business_name || rec.name || rec.Business || rec.Name,
        category: rec.category || rec.niche || null,
        country: rec.country || null,
        city: rec.city || null,
        phone: rec.phone || null,
        email: rec.email || null,
        website_url: rec.website_url || rec.website || null,
        website_status: rec.website_status || null,
        source: 'import',
        notes: rec.notes || null,
        tags: rec.tags ? String(rec.tags).split('|').map((t) => t.trim()).filter(Boolean) : [],
      };
      if (!lead.business_name) continue;
      // eslint-disable-next-line no-await-in-loop
      const result = await insertLead(lead, { skipDuplicates: true });
      if (result.skipped) duplicates += 1; else inserted += 1;
    }
    res.json({ inserted, duplicates });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const result = await insertLead(req.body || {});
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const r = await getLead(Number(req.params.id));
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const r = await updateLead(Number(req.params.id), req.body || {});
    res.json(r);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteLeads([Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/bulk/delete', async (req, res, next) => {
  try {
    const ids = (req.body?.ids || []).map(Number).filter(Boolean);
    const n = await deleteLeads(ids);
    res.json({ deleted: n });
  } catch (e) { next(e); }
});

router.post('/bulk/tag', async (req, res, next) => {
  try {
    const ids = (req.body?.ids || []).map(Number).filter(Boolean);
    const tag = String(req.body?.tag || '').trim();
    if (!tag) return res.status(400).json({ error: 'tag_required' });
    const n = await bulkAssignTag(ids, tag);
    res.json({ updated: n });
  } catch (e) { next(e); }
});

router.post('/bulk/resolve-filter', async (req, res, next) => {
  try {
    const ids = await idsFromFilter(req.body || {});
    res.json({ ids });
  } catch (e) { next(e); }
});

// Send a one-off email to a single lead (no campaign row).
router.post('/:id/send-email', async (req, res, next) => {
  try {
    const lead = await getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ error: 'lead_not_found' });
    if (!lead.email) return res.status(400).json({ error: 'lead_has_no_email' });

    const b = req.body || {};
    if (!b.subject || !b.body_html || !b.from_name || !b.from_email) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const result = await sendDirectEmail({
      lead,
      subject: b.subject,
      bodyHtml: b.body_html,
      bodyText: b.body_text,
      fromName: b.from_name,
      fromEmail: b.from_email,
      replyTo: b.reply_to,
      branding: {
        logo_url: b.logo_url,
        brand_color: b.brand_color,
        bg_color: b.bg_color,
        text_color: b.text_color,
        font_family: b.font_family,
        cta_text: b.cta_text,
        cta_url: b.cta_url,
      },
    });
    if (result?.skipped) return res.status(400).json({ error: 'lead_blocked_or_unsubscribed' });
    res.json(result);
  } catch (e) { next(e); }
});

export default router;
