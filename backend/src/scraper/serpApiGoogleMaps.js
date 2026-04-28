// Google Maps via SerpAPI.
// Why this exists: Puppeteer-based Google Maps scraping fails on Railway/AWS
// datacenter IPs (Google blocks the user-agent + IP combo). SerpAPI runs the
// query from residential infrastructure and returns clean JSON with name,
// phone, website, address, category — exactly what we need.
//
// Setup: get a free key at https://serpapi.com (250 searches/month free,
// then paid). Set SERPAPI_KEY in Railway → service variables. The scraper
// transparently falls back to OpenStreetMap if the key is missing.

import { extractEmails } from '../utils/emailRegex.js';

const ENDPOINT = 'https://serpapi.com/search.json';

export function isSerpApiConfigured() {
  return Boolean(process.env.SERPAPI_KEY);
}

async function fetchPage({ query, location, start = 0 }) {
  const params = new URLSearchParams({
    engine: 'google_maps',
    q: query,
    api_key: process.env.SERPAPI_KEY,
    type: 'search',
    start: String(start),
  });
  if (location) params.set('location', location);
  const url = `${ENDPOINT}?${params.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const resp = await fetch(url, { signal: ctrl.signal });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`SerpAPI HTTP ${resp.status}: ${body.substring(0, 200)}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(t);
  }
}

function placeToLead(p, fallbackCity, fallbackCountry, niche) {
  if (!p?.title) return null;
  const website = p.website || p.links?.website || null;
  const phone = p.phone || null;
  // SerpAPI doesn't always return email; pull from any embedded text fields.
  const blob = `${p.description || ''} ${p.snippet || ''} ${p.address || ''}`;
  const email = extractEmails(blob)[0] || null;
  return {
    business_name: String(p.title).trim(),
    category: p.type || p.types?.[0] || niche,
    country: fallbackCountry,
    city: p.address?.split(',')?.slice(-2, -1)[0]?.trim() || fallbackCity,
    phone,
    email,
    website_url: website,
    address: p.address || null,
    source: 'google_maps',
    source_url: p.link || `https://www.google.com/maps/place/?q=place_id:${p.place_id || ''}`,
  };
}

export async function scrapeGoogleMapsViaSerpApi({
  niche, location, country, limit = 50, onProgress,
}) {
  if (!isSerpApiConfigured()) {
    console.warn('[serpapi] SERPAPI_KEY is not set; skipping');
    return [];
  }
  const query = `${niche} in ${location}`;
  console.log(`[serpapi] querying google_maps for "${query}"`);

  const collected = [];
  let start = 0;
  // SerpAPI returns ~20 results per page; loop until we hit the limit or
  // run out of pages. Cap at 5 pages = 100 results to keep the credit cost low.
  for (let page = 0; page < 5; page += 1) {
    if (collected.length >= limit) break;
    let json;
    try {
      // eslint-disable-next-line no-await-in-loop
      json = await fetchPage({ query, location, start });
    } catch (err) {
      console.error(`[serpapi] page ${page} failed:`, err.message);
      break;
    }
    const places = json.local_results || json.place_results || [];
    if (!places.length) {
      console.log(`[serpapi] no more results at start=${start}`);
      break;
    }
    for (const p of places) {
      const lead = placeToLead(p, location, country, niche);
      if (lead) collected.push(lead);
      if (collected.length >= limit) break;
    }
    onProgress?.({ current: collected.length, total: limit, emails: collected.filter((l) => l.email).length });
    start += places.length;
  }
  console.log(`[serpapi] returning ${collected.length} leads`);
  return collected;
}
