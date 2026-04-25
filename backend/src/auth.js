import crypto from 'node:crypto';

const SESSION_COOKIE = 'leadgen_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  return process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

export function issueToken() {
  const payload = JSON.stringify({ u: process.env.AUTH_USER || 'admin', exp: Date.now() + SESSION_TTL_MS });
  const b64 = Buffer.from(payload).toString('base64url');
  return `${b64}.${sign(b64)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;
  if (sign(b64) !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function requireAuth(req, res, next) {
  const bypass = req.path.startsWith('/webhooks/') || req.path === '/healthz' || req.path.startsWith('/auth/') || req.path.startsWith('/unsubscribe');
  if (bypass) return next();
  const token = req.cookies?.[SESSION_COOKIE] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'unauthorized' });
  req.user = payload;
  next();
}

export function checkCredentials(username, password) {
  const U = process.env.AUTH_USER || 'admin';
  const P = process.env.AUTH_PASSWORD || 'admin';
  // constant-time compare
  const a = Buffer.from(String(username));
  const b = Buffer.from(U);
  const c = Buffer.from(String(password));
  const d = Buffer.from(P);
  if (a.length !== b.length || c.length !== d.length) return false;
  return crypto.timingSafeEqual(a, b) && crypto.timingSafeEqual(c, d);
}
