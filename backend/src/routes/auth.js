import { Router } from 'express';
import { checkCredentials, issueToken, setSessionCookie, clearSessionCookie, verifyToken } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!checkCredentials(username, password)) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  const token = issueToken();
  setSessionCookie(res, token);
  res.json({ ok: true, token });
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies?.leadgen_session || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'unauthorized' });
  res.json({ user: payload.u });
});

export default router;
