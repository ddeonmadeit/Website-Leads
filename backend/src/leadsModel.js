import { pool, query, tx } from './db.js';

const LEAD_COLUMNS = [
  'id', 'created_at', 'business_name', 'category', 'country', 'city',
  'phone', 'email', 'website_status', 'website_url', 'source', 'scrape_job_id',
  'email_status', 'email_sent_at', 'notes', 'tags', 'is_duplicate', 'duplicate_of',
  'reply_received',
];

export async function findDuplicateId(client, { business_name, city, email }) {
  if (email) {
    const r = await client.query(
      'SELECT id FROM leads WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    if (r.rows[0]) return r.rows[0].id;
  }
  if (business_name && city) {
    const r = await client.query(
      'SELECT id FROM leads WHERE LOWER(business_name) = LOWER($1) AND LOWER(city) = LOWER($2) LIMIT 1',
      [business_name, city],
    );
    if (r.rows[0]) return r.rows[0].id;
  }
  return null;
}

export async function insertLead(lead, { scrapeJobId = null, skipDuplicates = false } = {}) {
  return tx(async (client) => {
    const dup = await findDuplicateId(client, lead);
    if (dup && skipDuplicates) return { skipped: true, duplicateOf: dup };
    const { rows } = await client.query(
      `INSERT INTO leads (
        business_name, category, country, city, phone, email,
        website_status, website_url, source, scrape_job_id, notes, tags,
        is_duplicate, duplicate_of
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        lead.business_name,
        lead.category || null,
        lead.country || null,
        lead.city || null,
        lead.phone || null,
        lead.email ? String(lead.email).toLowerCase() : null,
        lead.website_status || null,
        lead.website_url || null,
        lead.source || 'manual',
        scrapeJobId,
        lead.notes || null,
        Array.isArray(lead.tags) ? lead.tags : [],
        !!dup,
        dup,
      ],
    );
    return { lead: rows[0], duplicateOf: dup };
  });
}

function buildWhere(filter = {}) {
  const clauses = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    clauses.push(sql.replace('?', `$${params.length}`));
  };
  if (filter.country) add('country = ?', filter.country);
  if (filter.niche) add('category = ?', filter.niche);
  if (filter.email_status) add('email_status = ?', filter.email_status);
  if (filter.website_status) add('website_status = ?', filter.website_status);
  if (filter.has_email === 'true' || filter.has_email === true) clauses.push('email IS NOT NULL');
  if (filter.has_email === 'false' || filter.has_email === false) clauses.push('email IS NULL');
  if (filter.include_duplicates === 'false' || filter.include_duplicates === false) clauses.push('is_duplicate = FALSE');
  if (filter.date_from) add('created_at >= ?', filter.date_from);
  if (filter.date_to) add('created_at <= ?', filter.date_to);
  if (filter.tag) add('? = ANY(tags)', filter.tag);
  if (filter.search) {
    params.push(`%${filter.search}%`);
    const idx = `$${params.length}`;
    clauses.push(`(business_name ILIKE ${idx} OR email ILIKE ${idx} OR city ILIKE ${idx} OR phone ILIKE ${idx})`);
  }
  if (filter.ids && Array.isArray(filter.ids) && filter.ids.length) {
    params.push(filter.ids);
    clauses.push(`id = ANY($${params.length}::int[])`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
}

export async function listLeads(filter = {}, { limit = 50, offset = 0, sort = 'created_at', dir = 'desc' } = {}) {
  const { where, params } = buildWhere(filter);
  const safeSort = ['created_at', 'business_name', 'country', 'category', 'email_status', 'website_status'].includes(sort) ? sort : 'created_at';
  const safeDir = String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  params.push(limit); params.push(offset);
  const sql = `
    SELECT ${LEAD_COLUMNS.join(',')}, COUNT(*) OVER() AS total_count
    FROM leads ${where}
    ORDER BY ${safeSort} ${safeDir}, id DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const { rows } = await query(sql, params);
  const total = rows[0]?.total_count ? Number(rows[0].total_count) : 0;
  return { rows: rows.map((r) => { const { total_count, ...rest } = r; return rest; }), total };
}

export async function getLead(id) {
  const { rows } = await query(`SELECT ${LEAD_COLUMNS.join(',')} FROM leads WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function updateLead(id, patch) {
  const allowed = ['business_name', 'category', 'country', 'city', 'phone', 'email', 'notes', 'tags', 'website_status', 'website_url', 'reply_received'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (key in patch) {
      params.push(key === 'email' && patch[key] ? String(patch[key]).toLowerCase() : patch[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (!sets.length) return getLead(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE leads SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] || null;
}

export async function deleteLeads(ids) {
  if (!ids?.length) return 0;
  const { rowCount } = await query('DELETE FROM leads WHERE id = ANY($1::int[])', [ids]);
  return rowCount;
}

export async function bulkAssignTag(ids, tag) {
  if (!ids?.length || !tag) return 0;
  const { rowCount } = await query(
    `UPDATE leads SET tags = (
       SELECT ARRAY(SELECT DISTINCT UNNEST(tags || ARRAY[$2]))
     ) WHERE id = ANY($1::int[])`,
    [ids, tag],
  );
  return rowCount;
}

export async function idsFromFilter(filter) {
  const { where, params } = buildWhere(filter);
  const { rows } = await query(`SELECT id FROM leads ${where}`, params);
  return rows.map((r) => r.id);
}

export async function markDuplicateOfEmail(email) {
  if (!email) return;
  await query(
    `UPDATE leads SET is_duplicate = TRUE WHERE LOWER(email) = LOWER($1)
     AND id NOT IN (SELECT MIN(id) FROM leads WHERE LOWER(email) = LOWER($1))`,
    [email],
  );
}

export async function allStats() {
  const sql = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE email IS NOT NULL)::int AS with_email,
      COUNT(*) FILTER (WHERE email_status = 'sent')::int AS sent,
      COUNT(*) FILTER (WHERE email_status = 'opened')::int AS opened,
      COUNT(*) FILTER (WHERE email_status = 'bounced')::int AS bounced,
      COUNT(*) FILTER (WHERE email_status = 'unsubscribed')::int AS unsubscribed,
      COUNT(*) FILTER (WHERE is_duplicate = TRUE)::int AS duplicates
    FROM leads
  `;
  const { rows } = await query(sql);
  const r = rows[0] || {};
  const attempted = (r.sent || 0) + (r.opened || 0);
  const openRate = attempted > 0 ? (r.opened || 0) / attempted : 0;
  const bounceRate = attempted > 0 ? (r.bounced || 0) / attempted : 0;
  return { ...r, open_rate: openRate, bounce_rate: bounceRate };
}
