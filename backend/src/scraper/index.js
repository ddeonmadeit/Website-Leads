import { PRESETS } from './presets.js';
import { scrapeGoogleMaps } from './googleMaps.js';
import { scrapeYellowPages } from './yellowPages.js';
import { scrapeFacebook } from './facebook.js';
import { scrapeOpenStreetMap } from './openStreetMap.js';
import { scrapeGoogleMapsViaSerpApi, isSerpApiConfigured } from './serpApiGoogleMaps.js';
import { classifyUrl, headCheck } from './websiteCheck.js';

export { PRESETS };

const MAX_PER_SOURCE = 400;
const OVERSAMPLE = 4;

function dedupKey(r) {
  if (r.email) return `e:${r.email.toLowerCase()}`;
  return `b:${(r.business_name || '').toLowerCase()}|${(r.city || '').toLowerCase()}`;
}

export async function runScrape({
  country, niche, location, sources = ['openstreetmap'],
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

  console.log(`[scraper] start country=${country} niche="${niche}" location="${location}" target=${target} sources=${sources.join(',')}`);

  for (const source of sources) {
    if (collected.length >= target) break;
    const need = target - collected.length;
    const ask = Math.min(MAX_PER_SOURCE, Math.max(perSourceLimit, need * OVERSAMPLE));
    console.log(`[scraper] running source=${source} ask=${ask} (collected=${collected.length}/${target})`);

    const onSourceProgress = () => reportProgress();

    try {
      let batch = [];
      if (source === 'openstreetmap') {
        batch = await scrapeOpenStreetMap({
          niche, location, country: preset.country, limit: ask, onProgress: onSourceProgress,
        });
      } else if (source === 'google_maps') {
        if (isSerpApiConfigured()) {
          batch = await scrapeGoogleMapsViaSerpApi({
            niche, location, country: preset.country, limit: ask, onProgress: onSourceProgress,
          });
        } else {
          // No API key — Puppeteer fallback. Will likely fail on Railway/AWS
          // datacenter IPs, but we try. The job error message will surface the
          // actual failure so the user can install SERPAPI_KEY.
          batch = await scrapeGoogleMaps({ query: `${niche} in ${location}`, limit: ask, onProgress: onSourceProgress });
        }
      } else if (source === 'yellow_pages') {
        if (!preset.yellowPagesHost) {
          console.warn(`[scraper] no yellowPagesHost configured for ${country} — skipping`);
          batch = [];
        } else {
          batch = await scrapeYellowPages({
            host: preset.yellowPagesHost, query: niche, location, limit: ask, onProgress: onSourceProgress,
          });
        }
      } else if (source === 'facebook') {
        batch = await scrapeFacebook({ query: niche, location, limit: ask, onProgress: onSourceProgress });
      }

      console.log(`[scraper] source=${source} returned ${batch.length} candidates`);

      for (const raw of batch) {
        if (collected.length >= target * OVERSAMPLE) break;
        const k = dedupKey(raw);
        if (seen.has(k)) continue;
        seen.add(k);
        collected.push(raw);
      }
      reportProgress();
    } catch (err) {
      console.error(`[scraper] ${source} failed:`, err.stack || err.message);
    }
  }

  console.log(`[scraper] enriching ${collected.length} candidates with website checks…`);

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

  // Save EVERY lead with a name and at least one contact channel. The
  // "no working website" classification is preserved on each row via
  // website_status, so the user can filter in the UI without us silently
  // discarding 80% of legitimate businesses just because they have a working
  // website.
  const usable = collected.filter((r) =>
    r.business_name && r.business_name.length > 1
    && (r.email || r.phone || r.website_url),
  );

  const final = usable.slice(0, target);
  const noWebsiteCount = final.filter((r) => ['none', 'broken', 'social_only'].includes(r.website_status)).length;
  console.log(`[scraper] done — ${final.length} usable leads (${noWebsiteCount} with no working website) out of ${collected.length} candidates`);
  onProgress?.({ current: final.length, total: target, emails: final.filter((r) => r.email).length });
  return final;
}
