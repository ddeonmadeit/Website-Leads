// Given a URL string, determine: none | social_only | broken | ok.
const SOCIAL_HOSTS = [
  'facebook.com', 'fb.com', 'fb.me', 'instagram.com', 'instagr.am',
  'tiktok.com', 'linkedin.com', 'twitter.com', 'x.com', 'linktr.ee',
  'wa.me', 'whatsapp.com', 't.me', 'youtube.com', 'youtu.be',
];

export function classifyUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return 'none';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`))) return 'social_only';
    return 'candidate';
  } catch {
    return 'broken';
  }
}

export async function headCheck(url, timeoutMs = 7000) {
  const c = classifyUrl(url);
  if (c !== 'candidate') return c;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url.startsWith('http') ? url : `https://${url}`, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0' },
    });
    if (!resp.ok) return 'broken';
    const finalHost = new URL(resp.url).hostname.toLowerCase().replace(/^www\./, '');
    if (SOCIAL_HOSTS.some((s) => finalHost === s || finalHost.endsWith(`.${s}`))) return 'social_only';
    return 'ok';
  } catch {
    return 'broken';
  } finally {
    clearTimeout(t);
  }
}
