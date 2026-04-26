import { PRESETS } from './presets.js';
import { scrapeGoogleMaps } from './googleMaps.js';
import { scrapeYellowPages } from './yellowPages.js';
import { scrapeFacebook } from './facebook.js';
import { classifyUrl, headCheck } from './websiteCheck.js';

export { PRESETS };

const MAX_PER_SOURCE = 400; // safety ceiling so a huge target can't run forever
const OVERSAMPLE = 4;       // most candidates have a working website and get filtered out

function dedupKey(r) {
  if (r.email) return `e:${r.email.toLowerCase()}`;
  return `b:${(r.business_name || '').toLowerCase()}|${(r.city || '').toLowerCase()}`;
}

export async function runScrape({
  country, niche, location, sources = ['google_maps'],
  targetCount = 50, onProgress,
}) {
  const preset = PRESETS[country];
  if (!preset) throw new Error(`Unknown country preset: ${country}`);
  const target = Math.max(1, Math.min(1000, Number(targetCount) || 50));
  const perSourceLimit = Math.min(MAX_PER_SOURCE, Math.ceil((target * OVERSAMPLE) / sources.length));

  const collected = [];
  const seen = new Set();

  const reportProgress = () => {
    onProgress?.({
      current: Math.min(collected.length, target),
      total: target,
      emails: collected.filter((r) => r.email).length,
    });
  };

  for (const source of sources) {
    if (collected.length >= target) break;
    const need = target - collected.length;
    // Per-source ask grows when other sources came up short.
    const ask = Math.min(MAX_PER_SOURCE, Math.max(perSourceLimit, need * OVERSAMPLE));

    const onSourceProgress = () => reportProgress();

    try {
      let batch = [];
      if (source === 'google_maps') {
        batch = await scrapeGoogleMaps({ query: `${niche} in ${location}`, limit: ask, onProgress: onSourceProgress });
      } else if (source === 'yellow_pages') {
        batch = await scrapeYellowPages({
          host: preset.yellowPagesHost, query: niche, location, limit: ask, onProgress: onSourceProgress,
        });
      } else if (source === 'facebook') {
        batch = await scrapeFacebook({ query: niche, location, limit: ask, onProgress: onSourceProgress });
      }

      for (const raw of batch) {
        if (collected.length >= target * OVERSAMPLE) break; // hard cap on candidates
        const k = dedupKey(raw);
        if (seen.has(k)) continue;
        seen.add(k);
        collected.push(raw);
      }
      reportProgress();
    } catch (err) {
      console.error(`[scraper] ${source} failed:`, err.message);
    }
  }

  // Enrich + classify website for each candidate
  for (const r of collected) {
    const initial = classifyUrl(r.website_url);
    if (initial === 'none') {
      r.website_status = 'none';
    } else if (initial === 'social_only') {
      r.website_status = 'social_only';
    } else {
      // eslint-disable-next-line no-await-in-loop
      r.website_status = await headCheck(r.website_url);
    }
    r.country = preset.country;
    r.city = r.city || location;
  }

  // Only keep "no working website" leads (the whole pitch).
  const filtered = collected.filter((r) =>
    ['none', 'broken', 'social_only'].includes(r.website_status)
    && r.business_name && r.business_name.length > 1,
  );

  // Cap to target so we don't return wildly more than asked.
  const final = filtered.slice(0, target);
  onProgress?.({ current: final.length, total: target, emails: final.filter((r) => r.email).length });
  return final;
}
