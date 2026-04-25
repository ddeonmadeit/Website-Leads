import { withPage } from './browser.js';
import { extractEmails } from '../utils/emailRegex.js';

const GM_SEARCH = (q) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`;

async function scrollResults(page, targetCount) {
  const feedSel = 'div[role="feed"]';
  await page.waitForSelector(feedSel, { timeout: 15000 });
  let prev = 0;
  let stable = 0;
  for (let i = 0; i < 40; i += 1) {
    const count = await page.$$eval('a.hfpxzc', (els) => els.length).catch(() => 0);
    if (count >= targetCount) break;
    if (count === prev) {
      stable += 1;
      if (stable >= 3) break;
    } else {
      stable = 0;
      prev = count;
    }
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollBy(0, 1500);
    }, feedSel);
    await new Promise((r) => setTimeout(r, 1200));
  }
}

async function extractDetail(page) {
  return page.evaluate(() => {
    const get = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
    const name = document.querySelector('h1')?.textContent?.trim() || '';
    const category = document.querySelector('button[jsaction*="category"]')?.textContent?.trim()
      || document.querySelector('button[jsaction$="pane.rating.category"]')?.textContent?.trim()
      || '';

    let website = '';
    const websiteBtn = Array.from(document.querySelectorAll('a[data-item-id="authority"]'));
    if (websiteBtn[0]) website = websiteBtn[0].href || websiteBtn[0].getAttribute('href') || '';

    let phone = '';
    const phoneBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
    if (phoneBtn) phone = phoneBtn.getAttribute('data-item-id').replace('phone:tel:', '').trim();
    if (!phone) {
      const el = Array.from(document.querySelectorAll('[aria-label^="Phone:"]'))[0];
      if (el) phone = el.getAttribute('aria-label').replace(/^Phone:\s*/i, '').trim();
    }

    let address = '';
    const addrBtn = document.querySelector('button[data-item-id="address"]');
    if (addrBtn) address = addrBtn.getAttribute('aria-label')?.replace(/^Address:\s*/i, '').trim() || '';

    const pageText = document.body.innerText || '';
    return { name, category, website, phone, address, pageText };
  });
}

export async function scrapeGoogleMaps({ query, limit = 30, onProgress }) {
  return withPage(async (page) => {
    const url = GM_SEARCH(query);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Accept consent if present
    try {
      await page.waitForSelector('button[aria-label*="Accept all"], button[aria-label*="Reject all"]', { timeout: 3000 });
      await page.click('button[aria-label*="Accept all"], button[aria-label*="Reject all"]');
    } catch { /* no consent */ }

    // Single place (no list) case: Google may redirect straight to a detail panel.
    const singlePlace = await page.$('h1.DUwDvf, h1.lfPIob');
    if (singlePlace) {
      const d = await extractDetail(page);
      const emails = extractEmails(d.pageText);
      return [toRecord(d, emails, url)];
    }

    await scrollResults(page, limit);
    const links = await page.$$eval('a.hfpxzc', (els, n) => els.slice(0, n).map((e) => e.href), limit);
    const results = [];
    for (let i = 0; i < links.length; i += 1) {
      try {
        await page.goto(links[i], { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {});
        const d = await extractDetail(page);
        if (!d.name) continue;
        const emails = extractEmails(d.pageText);
        results.push(toRecord(d, emails, links[i]));
      } catch (err) {
        // skip broken listing
      }
      onProgress?.({ current: i + 1, total: links.length, emails: results.filter((r) => r.email).length });
    }
    return results;
  });
}

function toRecord(d, emails, sourceUrl) {
  const city = (d.address || '').split(',').slice(-2, -1)[0]?.trim() || (d.address || '').split(',')[0]?.trim() || null;
  return {
    business_name: d.name,
    category: d.category || null,
    website_url: d.website || null,
    phone: d.phone || null,
    address: d.address || null,
    city,
    email: emails[0] || null,
    source: 'google_maps',
    source_url: sourceUrl,
  };
}
