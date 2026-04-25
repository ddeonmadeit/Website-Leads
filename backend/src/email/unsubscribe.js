import crypto from 'node:crypto';
import { htmlEscape } from '../utils/html.js';

function secret() {
  return process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';
}

export function signUnsubToken(email) {
  const b64 = Buffer.from(String(email || '').toLowerCase()).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(b64).digest('hex').slice(0, 24);
  return `${b64}.${sig}`;
}

export function verifyUnsubToken(token) {
  if (!token) return null;
  const [b64, sig] = String(token).split('.');
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(b64).digest('hex').slice(0, 24);
  if (expected !== sig) return null;
  try {
    return Buffer.from(b64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export function unsubscribeUrl(email) {
  const base = process.env.PUBLIC_BACKEND_URL || '';
  return `${base.replace(/\/$/, '')}/unsubscribe?token=${signUnsubToken(email)}`;
}

export function appendUnsubscribeFooterHtml(html, email) {
  const url = unsubscribeUrl(email);
  const footer = `
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee" />
    <p style="font-size:12px;color:#888;font-family:Arial,sans-serif">
      You are receiving this email because we believed it may be relevant to your business.
      If you'd rather not hear from us,
      <a href="${htmlEscape(url)}" style="color:#888">unsubscribe here</a>.
    </p>`;
  return `${html || ''}${footer}`;
}

export function appendUnsubscribeFooterText(text, email) {
  const url = unsubscribeUrl(email);
  return `${text || ''}\n\n---\nUnsubscribe: ${url}\n`;
}
