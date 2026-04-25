import { Router } from 'express';
import { query } from '../db.js';
import { verifyUnsubToken } from '../email/unsubscribe.js';

const router = Router();

async function applyUnsubscribe(email) {
  await query(`INSERT INTO unsubscribes (email, reason) VALUES (LOWER($1), 'user_link')
               ON CONFLICT (email) DO NOTHING`, [email]);
  await query(`UPDATE leads SET email_status = 'unsubscribed' WHERE LOWER(email) = LOWER($1)`, [email]);
}

router.get('/', async (req, res) => {
  const token = String(req.query.token || '');
  const email = verifyUnsubToken(token);
  if (!email) {
    return res.status(400).send(renderPage('Invalid or expired unsubscribe link.'));
  }
  await applyUnsubscribe(email);
  res.send(renderPage(`You've been unsubscribed. We won't email ${email} again.`));
});

// One-click (RFC 8058) — Resend/GMail may POST here.
router.post('/', async (req, res) => {
  const token = String(req.query.token || req.body?.token || '');
  const email = verifyUnsubToken(token);
  if (!email) return res.status(400).json({ error: 'invalid_token' });
  await applyUnsubscribe(email);
  res.json({ ok: true });
});

function renderPage(msg) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribe</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:system-ui,Arial,sans-serif;background:#f7f7f8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:white;padding:40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:420px;text-align:center}
  h1{font-size:20px;margin:0 0 12px}</style></head>
  <body><div class="card"><h1>Unsubscribe</h1><p>${msg}</p></div></body></html>`;
}

export default router;
