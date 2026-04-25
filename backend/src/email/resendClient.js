import { Resend } from 'resend';

let client = null;

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY missing — sending disabled.');
    return null;
  }
  if (!client) client = new Resend(key);
  return client;
}
