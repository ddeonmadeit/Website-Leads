import { PRESETS } from './presets.js';
import { scrapeGoogleMaps } from './googleMaps.js';
import { scrapeYellowPages } from './yellowPages.js';
import { scrapeFacebook } from './facebook.js';
import { classifyUrl, headCheck } from './websiteCheck.js';

export { PRESETS };

export async function runScrape({ country, niche, location, sources = ['google_maps'], limit = 30, onProgress }) {
  const preset = PRESETS[country];
  if (!preset) throw new Error(`Unknown country preset: ${country}`);
  const query = `${niche} in ${location}`;
  const all = [];
  const totalSources = sources.length;
  for (let s = 0; s < sources.length; s += 1) {
    const source = sources[s];
    const perSourceProgress = ({ current, total, emails }) => {
      onProgress?.({
        current: Math.round(((s + (current / Math.max(total, 1))) / totalSources) * limit),
        total: limit,
        emails: all.filter((r) => r.email).length + (emails || 0),
        stage: source,
      });
    };
    try {
      if (source === 'google_maps') {
        const list = await scrapeGoogleMaps({ query, limit, onProgress: perSourceProgress });
        all.push(...list);
      } else if (source === 'yellow_pages') {
        const list = await scrapeYellowPages({
          host: preset.yellowPagesHost, query: niche, location, limit,
          onProgress: perSourceProgress,
        });
        all.push(...list);
      } else if (source === 'facebook') {
        const list = await scrapeFacebook({ query: niche, location, limit, onProgress: perSourceProgress });
        all.push(...list);
      }
    } catch (err) {
      console.error(`[scraper] ${source} failed:`, err.message);
    }
  }

  // Enrich: classify website
  for (const r of all) {
    const initial = classifyUrl(r.website_url);
    if (initial === 'none') {
      r.website_status = 'none';
    } else if (initial === 'social_only') {
      r.website_status = 'social_only';
    } else {
      // Candidate — HEAD check
      // eslint-disable-next-line no-await-in-loop
      r.website_status = await headCheck(r.website_url);
    }
    r.country = preset.country;
    r.city = r.city || location;
  }

  // We only keep leads that fit "no website" criteria per spec:
  // none | broken | social_only -> flag as lead. ok websites are dropped.
  const filtered = all.filter((r) =>
    ['none', 'broken', 'social_only'].includes(r.website_status)
    && r.business_name && r.business_name.length > 1
  );

  return filtered;
}
