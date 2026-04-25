import { withPage } from './browser.js';
import { extractEmails } from '../utils/emailRegex.js';

// Public FB pages only — NO login. We search via Google's site: operator since FB's search requires auth.
export async function scrapeFacebook({ query, location, limit = 20, onProgress }) {
  return withPage(async (page) => {
    const q = encodeURIComponent(`site:facebook.com "${query}" ${location || ''} contact`);
    const searchUrl = `https://www.google.com/search?q=${q}&num=${Math.min(limit * 2, 50)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try {
      await page.waitForSelector('button[aria-label*="Accept all"]', { timeout: 2000 });
      await page.click('button[aria-label*="Accept all"]');
    } catch { /* no consent */ }
    const links = await page.$$eval('a', (els) => {
      const out = [];
      for (const a of els) {
        const href = a.getAttribute('href') || '';
        const m = href.match(/https?:\/\/[^&"]*facebook\.com\/[^&"?#]+/);
        if (m) out.push(m[0]);
      }
      return [...new Set(out)];
    });
    const pageLinks = links
      .filter((u) => !/\/sharer|\/login|\/plugins|\/tr\?|\/pages\/category|\/policies/i.test(u))
      .slice(0, limit);

    const results = [];
    for (let i = 0; i < pageLinks.length; i += 1) {
      try {
        await page.goto(pageLinks[i], { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 1500));
        const data = await page.evaluate(() => {
          const text = document.body.innerText || '';
          const title = document.title.replace(/\s*\|.*$/, '').replace(/\s*-\s*Home.*$/, '').trim();
          return { text, title };
        });
        const emails = extractEmails(data.text);
        const phoneMatch = data.text.match(/(\+?\d[\d\s().-]{7,}\d)/);
        if (!data.title) continue;
        results.push({
          business_name: data.title,
          category: query,
          city: location || null,
          phone: phoneMatch ? phoneMatch[1].trim() : null,
          email: emails[0] || null,
          website_url: pageLinks[i],
          source: 'facebook',
          source_url: pageLinks[i],
        });
      } catch { /* skip */ }
      onProgress?.({ current: i + 1, total: pageLinks.length, emails: results.filter((r) => r.email).length });
    }
    return results;
  });
}
