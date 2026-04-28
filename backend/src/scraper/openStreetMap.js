// OpenStreetMap Overpass API scraper.
// Why this exists: Google Maps and Google Search aggressively block datacenter IPs
// (Railway, AWS, GCP). Overpass is a public read-only API with no rate-limit on
// modest queries, no auth, no JS rendering — pure HTTP + JSON.
//
// Coverage varies by region: dense in major cities (Dubai, Manila, Mumbai,
// Johannesburg) and reasonable for our four target countries. Records often
// include website, phone, and sometimes email; missing email is fine because
// we still want "no website" leads for the cold-call pitch.

import { extractEmails } from '../utils/emailRegex.js';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

// Map our niche labels to OSM key/value tag combinations.
// Matches are loose by design — we'd rather over-collect than miss legitimate
// businesses, and the website filter trims later.
const NICHE_TAGS = {
  // Real estate
  'Real Estate Agencies & Brokers': [['office', 'estate_agent']],
  'Real Estate Agencies': [['office', 'estate_agent']],
  'Real Estate Developers / Brokers': [['office', 'estate_agent'], ['office', 'property_management']],

  // Medical / clinics
  'Clinics (Dental / Aesthetic / Medical)': [
    ['amenity', 'clinic'], ['amenity', 'dentist'], ['amenity', 'doctors'],
    ['healthcare', 'clinic'], ['healthcare', 'dentist'], ['healthcare', 'doctor'],
  ],
  'Medical Clinics / Diagnostics': [
    ['amenity', 'clinic'], ['amenity', 'doctors'], ['healthcare', 'clinic'],
    ['healthcare', 'laboratory'], ['healthcare', 'centre'],
  ],
  'Luxury Clinics / Car Rentals / Concierge': [
    ['amenity', 'clinic'], ['amenity', 'car_rental'], ['healthcare', 'clinic'],
  ],

  // Construction
  'Construction / Contractors': [['craft', 'builder'], ['office', 'company'], ['shop', 'trade']],
  'Construction & Engineering': [['craft', 'builder'], ['office', 'engineer'], ['office', 'company']],

  // Legal / professional services
  'Law Firms': [['office', 'lawyer']],
  'Accounting Firms': [['office', 'accountant'], ['office', 'tax_advisor']],
  'Insurance Brokers': [['office', 'insurance']],

  // Hospitality
  'Resorts / Boutique Hotels': [['tourism', 'hotel'], ['tourism', 'resort'], ['tourism', 'guest_house']],

  // Logistics / B2B
  'Logistics / Freight / Export': [['office', 'logistics'], ['office', 'company'], ['industrial', 'logistics']],
  'B2B Logistics / Trade / Consulting': [['office', 'logistics'], ['office', 'company'], ['office', 'consulting']],

  // Education
  'Coaching Institutes / Education Businesses': [
    ['amenity', 'school'], ['amenity', 'college'], ['amenity', 'language_school'],
    ['amenity', 'training'], ['office', 'educational_institution'],
  ],

  // E-commerce / D2C — OSM has limited coverage; fall back to retail shops
  'D2C Brands (Shopify Sellers / CRO)': [['shop', 'clothes'], ['shop', 'cosmetics'], ['shop', 'general']],

  // Recruitment
  'Recruitment / Staffing Agencies': [['office', 'employment_agency']],

  // Security
  'Security Companies': [['office', 'security'], ['office', 'company']],
};

function tagsForNiche(niche) {
  const exact = NICHE_TAGS[niche];
  if (exact) return exact;
  // Loose substring fallback — covers tiny variations between UI label and preset
  const lower = niche.toLowerCase();
  for (const [label, tags] of Object.entries(NICHE_TAGS)) {
    if (label.toLowerCase().includes(lower) || lower.includes(label.toLowerCase().split(/[\s/(]/)[0])) {
      return tags;
    }
  }
  // Generic catch-all: any office or shop
  return [['office', 'company']];
}

function buildOverpassQuery({ niche, location, country }) {
  const tags = tagsForNiche(niche);
  // Build alternative tag filters — a place matches if ANY tag combination matches
  const filters = tags.flatMap(([k, v]) => [
    `node["${k}"="${v}"](area.searchArea);`,
    `way["${k}"="${v}"](area.searchArea);`,
    `relation["${k}"="${v}"](area.searchArea);`,
  ]).join('\n  ');

  // Try a city-level area first; if Overpass can't find it, the query simply
  // returns no elements, and we fall back to country-level on retry.
  // We escape quotes in the location name for safety.
  const safeLocation = String(location || '').replace(/"/g, '\\"');
  const safeCountry = String(country || '').replace(/"/g, '\\"');
  return `
[out:json][timeout:60];
(
  area["name"="${safeLocation}"]["place"~"city|town|suburb|district|municipality"];
  area["name:en"="${safeLocation}"]["place"~"city|town|suburb|district|municipality"];
  area["name"="${safeLocation}"];
)->.cityArea;
area["name"="${safeCountry}"]["admin_level"="2"]->.countryArea;
(
  ${filters.replace(/area\.searchArea/g, 'area.cityArea')}
);
out tags center 200;
`.trim();
}

function buildOverpassQueryCountryOnly({ niche, country }) {
  const tags = tagsForNiche(niche);
  const filters = tags.flatMap(([k, v]) => [
    `node["${k}"="${v}"](area.countryArea);`,
    `way["${k}"="${v}"](area.countryArea);`,
  ]).join('\n  ');
  const safeCountry = String(country || '').replace(/"/g, '\\"');
  return `
[out:json][timeout:60];
area["name"="${safeCountry}"]["admin_level"="2"]->.countryArea;
(
  ${filters}
);
out tags center 200;
`.trim();
}

async function postOverpass(queryBody, timeoutMs = 60_000) {
  let lastErr = null;
  for (const ep of OVERPASS_ENDPOINTS) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await fetch(ep, {
        method: 'POST',
        body: queryBody,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'helix-leadgen/1.0 (contact: support@example.com)',
        },
        signal: ctrl.signal,
      });
      if (!resp.ok) {
        lastErr = new Error(`Overpass ${ep} HTTP ${resp.status}`);
        continue;
      }
      const json = await resp.json();
      return json;
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr || new Error('Overpass: all endpoints failed');
}

function elementToLead(el, niche, fallbackCity, fallbackCountry) {
  const tags = el.tags || {};
  const name = tags.name || tags['name:en'] || tags.brand;
  if (!name) return null;
  const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null;
  const email = tags.email || tags['contact:email'] || null;
  const website = tags.website || tags['contact:website'] || tags.url || null;
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const address = [street, tags['addr:suburb'], tags['addr:city'], tags['addr:postcode']]
    .filter(Boolean).join(', ');
  // Pull any embedded emails from the description/operator field as a bonus
  const blob = `${tags.description || ''} ${tags.operator || ''}`;
  const extraEmail = email || extractEmails(blob)[0] || null;
  return {
    business_name: String(name).trim(),
    category: tags.shop || tags.amenity || tags.office || tags.craft || niche,
    country: fallbackCountry,
    city: tags['addr:city'] || fallbackCity,
    phone,
    email: extraEmail,
    website_url: website,
    address: address || null,
    source: 'openstreetmap',
    source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

export async function scrapeOpenStreetMap({ niche, location, country, limit = 50, onProgress }) {
  console.log(`[osm] querying for ${niche} in ${location}, ${country}`);

  // Try city-level first
  let json;
  try {
    json = await postOverpass(buildOverpassQuery({ niche, location, country }));
  } catch (err) {
    console.error('[osm] city-level query failed:', err.message);
    json = { elements: [] };
  }

  let elements = Array.isArray(json.elements) ? json.elements : [];
  console.log(`[osm] city-level returned ${elements.length} elements`);

  // If city-level returned little, broaden to country
  if (elements.length < 10) {
    console.log('[osm] falling back to country-level query');
    try {
      const countryJson = await postOverpass(buildOverpassQueryCountryOnly({ niche, country }));
      const countryElements = Array.isArray(countryJson.elements) ? countryJson.elements : [];
      // Prefer ones that mention the city in their address tags
      const matchingCity = countryElements.filter((el) => {
        const c = (el.tags?.['addr:city'] || '').toLowerCase();
        return c && c.includes(String(location).toLowerCase().split(' ')[0]);
      });
      elements = [...elements, ...matchingCity, ...countryElements];
      console.log(`[osm] country-level added ${countryElements.length} elements (${matchingCity.length} match city)`);
    } catch (err) {
      console.error('[osm] country-level query failed:', err.message);
    }
  }

  // Dedup by OSM id and convert
  const seen = new Set();
  const leads = [];
  for (const el of elements) {
    const key = `${el.type}:${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const lead = elementToLead(el, niche, location, country);
    if (!lead) continue;
    leads.push(lead);
    if (leads.length >= limit * 4) break; // collect oversample for the website filter
    if (leads.length % 25 === 0) {
      onProgress?.({ current: leads.length, total: limit, emails: leads.filter((l) => l.email).length });
    }
  }
  console.log(`[osm] returning ${leads.length} usable leads (asked for ${limit})`);
  onProgress?.({ current: leads.length, total: limit, emails: leads.filter((l) => l.email).length });
  return leads;
}
