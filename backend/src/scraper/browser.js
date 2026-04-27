import fs from 'node:fs';
import puppeteer from 'puppeteer';

let browserPromise = null;
let resolvedExecutablePath = null;

const FALLBACK_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/snap/bin/chromium',
];

function getExecutablePath() {
  if (resolvedExecutablePath !== null) return resolvedExecutablePath || undefined;
  const env = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
  if (env) {
    resolvedExecutablePath = env;
    console.log(`[scraper] using chromium from env at ${env}`);
    return env;
  }
  if (process.platform === 'linux') {
    for (const p of FALLBACK_PATHS) {
      try {
        if (fs.existsSync(p)) {
          resolvedExecutablePath = p;
          console.log(`[scraper] using chromium at ${p}`);
          return p;
        }
      } catch { /* ignore */ }
    }
  }
  console.warn('[scraper] no system chromium found — falling back to puppeteer-bundled binary');
  resolvedExecutablePath = '';
  return undefined;
}

export async function getBrowser() {
  if (!browserPromise) {
    const executablePath = getExecutablePath();
    console.log('[scraper] launching browser…');
    const launchPromise = puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS !== 'false',
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--hide-scrollbars',
        '--mute-audio',
        `--user-agent=${process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0'}`,
      ],
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Browser launch timed out after 30s')), 30000),
    );
    browserPromise = Promise.race([launchPromise, timeoutPromise])
      .then((b) => {
        console.log('[scraper] browser launched');
        return b;
      })
      .catch((err) => {
        console.error('[scraper] browser launch failed:', err.message);
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

export async function withPage(fn) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font'].includes(type)) return req.abort();
      req.continue();
    });
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

export async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b) await b.close().catch(() => {});
    browserPromise = null;
  }
}
