import puppeteer from 'puppeteer';

let browserPromise = null;

function getExecutablePath() {
  return process.env.PUPPETEER_EXECUTABLE_PATH
    || process.env.CHROMIUM_PATH
    || (process.platform === 'linux' ? '/usr/bin/chromium' : undefined);
}

export function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS !== 'false',
      executablePath: getExecutablePath(),
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
    const b = await browserPromise;
    await b.close().catch(() => {});
    browserPromise = null;
  }
}
