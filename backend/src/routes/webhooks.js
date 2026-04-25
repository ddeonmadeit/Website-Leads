import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';

const router = Router();

// Raw body parser for signature verification
router.use('/resend', (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => { req.rawBody = data; next(); });
});

function verifyResendSignature(req) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // allow if not configured
  // Resend uses svix-style: svix-id, svix-timestamp, svix-signature
  const id = req.headers['svix-id'];
  const ts = req.headers['svix-timestamp'];
  const sig = req.headers['svix-signature'];
  if (!id || !ts || !sig) return false;
  const payload = `${id}.${ts}.${req.rawBody}`;
  const keyBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', keyBytes).update(payload).digest('base64');
  const parts = String(sig).split(' ');
  return parts.some((p) => {
    const [, s] = p.split(',');
    return s && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected));
  });
}

router.post('/resend', async (req, res) => {
  try {
    if (!verifyResendSignature(req)) return res.status(401).json({ error: 'invalid_signature' });
    const evt = JSON.parse(req.rawBody || '{}');
    const type = evt.type || evt.event || '';
    const data = evt.data || evt;
    const messageId = data.email_id || data.id || data.message_id;
    const email = data.to?.[0] || data.to || data.recipient || data.email;

    // Find recipient row if any
    let recipientId = null; let campaignId = null; let leadId = null;
    if (messageId) {
      const { rows } = await query(
        `SELECT cr.id, cr.campaign_id, cr.lead_id FROM campaign_recipients cr
         WHERE cr.resend_message_id = $1 LIMIT 1`, [messageId],
      );
      if (rows[0]) { recipientId = rows[0].id; campaignId = rows[0].campaign_id; leadId = rows[0].lead_id; }
    }
    if (!leadId && email) {
      const { rows } = await query('SELECT id FROM leads WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
      if (rows[0]) leadId = rows[0].id;
    }

    const insertEvent = (eventType) => query(
      `INSERT INTO email_events (recipient_id, lead_id, campaign_id, event_type, resend_message_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [recipientId, leadId, campaignId, eventType, messageId || null, JSON.stringify(evt)],
    );

    if (type.includes('delivered')) {
      await insertEvent('delivered');
    } else if (type.includes('opened')) {
      await insertEvent('opened');
      if (recipientId) await query(`UPDATE campaign_recipients SET status = 'opened', opened_at = NOW() WHERE id = $1 AND status != 'bounced'`, [recipientId]);
      if (leadId) await query(`UPDATE leads SET email_status = 'opened' WHERE id = $1 AND email_status IN ('sent','not_sent')`, [leadId]);
    } else if (type.includes('bounced') || type === 'email.bounced') {
      await insertEvent('bounced');
      if (recipientId) await query(`UPDATE campaign_recipients SET status = 'bounced', bounced_at = NOW() WHERE id = $1`, [recipientId]);
      if (leadId) await query(`UPDATE leads SET email_status = 'bounced' WHERE id = $1`, [leadId]);
    } else if (type.includes('unsubscribed') || type.includes('complaint')) {
      await insertEvent('unsubscribed');
      if (email) {
        await query(`INSERT INTO unsubscribes (email, reason) VALUES (LOWER($1), $2)
                     ON CONFLICT (email) DO NOTHING`, [email, type]);
      }
      if (leadId) await query(`UPDATE leads SET email_status = 'unsubscribed' WHERE id = $1`, [leadId]);
      if (recipientId) await query(`UPDATE campaign_recipients SET status = 'unsubscribed' WHERE id = $1`, [recipientId]);
    } else if (type.includes('failed')) {
      await insertEvent('failed');
    } else {
      await insertEvent(type || 'unknown');
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[webhook] resend error', err);
    res.status(200).json({ ok: true }); // always 200 so Resend doesn't retry storm
  }
});

export default router;
