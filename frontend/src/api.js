// window.__API_BASE__ is injected at runtime by serve.js (standalone frontend service).
// VITE_API_BASE_URL is baked in at build time (set this in Railway if using two separate services).
// /api is the default for the combined single-service deployment (backend serves frontend).
const BASE = (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API_BASE_URL || '/api';

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const body = opts.body;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const resp = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    body: payload,
  });
  const text = await resp.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!resp.ok) {
    const err = new Error(data?.error || resp.statusText || 'request_failed');
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  stats: () => req('/stats'),

  listLeads: (params) => req(`/leads?${new URLSearchParams(params).toString()}`),
  getLead: (id) => req(`/leads/${id}`),
  updateLead: (id, patch) => req(`/leads/${id}`, { method: 'PATCH', body: patch }),
  deleteLead: (id) => req(`/leads/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids) => req('/leads/bulk/delete', { method: 'POST', body: { ids } }),
  bulkTag: (ids, tag) => req('/leads/bulk/tag', { method: 'POST', body: { ids, tag } }),
  resolveFilter: (filter) => req('/leads/bulk/resolve-filter', { method: 'POST', body: filter }),
  sendLeadEmail: (id, payload) => req(`/leads/${id}/send-email`, { method: 'POST', body: payload }),
  importLeads: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req('/leads/import', { method: 'POST', body: fd });
  },
  exportUrl: (params) => `${BASE}/leads/export.csv?${new URLSearchParams(params).toString()}`,

  scrapePresets: () => req('/scrape-jobs/presets'),
  listScrapeJobs: () => req('/scrape-jobs'),
  createScrapeJob: (body) => req('/scrape-jobs', { method: 'POST', body }),
  cancelScrapeJob: (id) => req(`/scrape-jobs/${id}/cancel`, { method: 'POST' }),
  deleteScrapeJob: (id) => req(`/scrape-jobs/${id}`, { method: 'DELETE' }),

  listCampaigns: () => req('/campaigns'),
  getCampaign: (id) => req(`/campaigns/${id}`),
  createCampaign: (body) => req('/campaigns', { method: 'POST', body }),
  updateCampaign: (id, body) => req(`/campaigns/${id}`, { method: 'PATCH', body }),
  deleteCampaign: (id) => req(`/campaigns/${id}`, { method: 'DELETE' }),
  addRecipients: (id, body) => req(`/campaigns/${id}/recipients`, { method: 'POST', body }),
  launchCampaign: (id, body) => req(`/campaigns/${id}/launch`, { method: 'POST', body }),
  pauseCampaign: (id) => req(`/campaigns/${id}/pause`, { method: 'POST' }),
  resumeCampaign: (id) => req(`/campaigns/${id}/resume`, { method: 'POST' }),
  spamCheck: (subject) => req('/campaigns/spam-check', { method: 'POST', body: { subject } }),
  previewCampaign: (body) => req('/campaigns/preview', { method: 'POST', body }),

  listSequences: () => req('/sequences'),
  getSequence: (id) => req(`/sequences/${id}`),
  createSequence: (body) => req('/sequences', { method: 'POST', body }),
  updateSequence: (id, body) => req(`/sequences/${id}`, { method: 'PATCH', body }),
  enroll: (id, body) => req(`/sequences/${id}/enroll`, { method: 'POST', body }),
  stopSequence: (id) => req(`/sequences/${id}/stop`, { method: 'POST' }),
  deleteSequence: (id) => req(`/sequences/${id}`, { method: 'DELETE' }),
};
