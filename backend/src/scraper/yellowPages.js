import * as cheerio from 'cheerio';
import { extractEmails } from '../utils/emailRegex.js';
import { withPage } from './browser.js';

const UA = process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0';

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Generic directory scraping with a few common host-specific tweaks.
export async function scrapeYellowPages({ host, query, location, limit = 30, onProgress }) {
  const searchUrl = buildSearchUrl(host, query, location);
  let html = await fetchHtml(searchUrl);
  if (!html) {
    // Fall back to Puppeteer for JS-heavy directories (justdial)
    html = await withPage(async (page) => {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2000));
      return page.content();
    }).catch(() => null);
  }
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = extractListings($, host).slice(0, limit);
  const results = [];
  for (let i = 0; i < items.length; i += 1) {
    const entry = items[i];
    let detailHtml = '';
    if (entry.url) {
      detailHtml = await fetchHtml(entry.url) || '';
    }
    const combined = `${html.substring(0, 0)}\n${detailHtml}`;
    const emails = extractEmails(`${entry.raw || ''}\n${combined}`);
    results.push({
      business_name: entry.name,
      category: entry.category || query,
      city: location,
      phone: entry.phone || null,
      email: emails[0] || null,
      website_url: entry.website || null,
      source: 'yellow_pages',
      source_url: entry.url || searchUrl,
    });
    onProgress?.({ current: i + 1, total: items.length, emails: results.filter((r) => r.email).length });
  }
  return results;
}

function buildSearchUrl(host, query, location) {
  const q = encodeURIComponent(query);
  const l = encodeURIComponent(location || '');
  if (host.includes('justdial')) {
    return `https://www.justdial.com/${l || 'India'}/${q}`;
  }
  if (host.includes('yellowpages.co.za')) {
    return `https://www.yellowpages.co.za/search?what=${q}&where=${l}`;
  }
  if (host.includes('yellow-pages.ph')) {
    return `https://www.yellow-pages.ph/search?q=${q}&loc=${l}`;
  }
  if (host.includes('yellowpages-uae')) {
    return `https://www.yellowpages-uae.com/search?q=${q}&loc=${l}`;
  }
  // Generic fallback
  return `https://${host}/search?q=${q}&location=${l}`;
}

function extractListings($, host) {
  const out = [];
  // Heuristic: look for listing-card-like containers.
  const selectors = [
    '.result, .listing, .search-result, .business-card, .resultbox, .cardbox, .cont_sw_addr',
    'article, li.listing-item, div.v-card, div[class*="ListItem"], div[class*="listing"]',
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const name = $el.find('h2, h3, .business-name, .lng_cont_name, .resultbox_title').first().text().trim()
        || $el.find('a[title]').first().attr('title') || '';
      if (!name || name.length < 2) return;
      const phone = $el.find('[class*="phone"], [class*="mobilesv"], a[href^="tel:"]').first().text().trim()
        || $el.find('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') || '';
      const link = $el.find('a').first().attr('href') || '';
      const website = $el.find('a[rel*="nofollow"], a[class*="website"], a[title*="Website" i]').first().attr('href') || '';
      const category = $el.find('[class*="category"], .resultbox_cat').first().text().trim() || '';
      out.push({
        name,
        phone,
        website,
        category,
        url: link && /^https?:\/\//.test(link) ? link : (link && host ? new URL(link, `https://${host}`).toString() : ''),
        raw: $el.text(),
      });
    });
    if (out.length) break;
  }
  // de-duplicate by name
  const seen = new Set();
  return out.filter((o) => {
    const k = o.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
