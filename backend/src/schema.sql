-- Lead generation platform schema

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id SERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  niche TEXT NOT NULL,
  location TEXT NOT NULL,
  sources TEXT[] NOT NULL DEFAULT ARRAY['google_maps']::TEXT[],
  status TEXT NOT NULL DEFAULT 'queued', -- queued | running | done | failed | cancelled
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER NOT NULL DEFAULT 0,
  emails_found INTEGER NOT NULL DEFAULT 0,
  results_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  schedule TEXT, -- NULL for one-off, 'daily' | 'weekly' for recurring
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_schedule ON scrape_jobs(schedule, next_run_at);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  business_name TEXT NOT NULL,
  category TEXT,
  country TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  website_status TEXT, -- none | broken | social_only | ok
  website_url TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- google_maps | yellow_pages | facebook | manual | import
  scrape_job_id INTEGER REFERENCES scrape_jobs(id) ON DELETE SET NULL,
  email_status TEXT NOT NULL DEFAULT 'not_sent', -- not_sent | sent | opened | bounced | unsubscribed
  email_sent_at TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  reply_received BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_leads_country ON leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_email_status ON leads(email_status);
CREATE INDEX IF NOT EXISTS idx_leads_website_status ON leads(website_status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_leads_bizcity ON leads(LOWER(business_name), LOWER(city));
CREATE INDEX IF NOT EXISTS idx_leads_is_duplicate ON leads(is_duplicate);

CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  hourly_limit INTEGER NOT NULL DEFAULT 50,
  batch_delay_ms INTEGER NOT NULL DEFAULT 2000,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | sending | paused | done | cancelled
  lead_filter JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed | bounced | opened | unsubscribed | skipped
  resend_message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  UNIQUE (campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_message ON campaign_recipients(resend_message_id);

CREATE TABLE IF NOT EXISTS email_events (
  id SERIAL PRIMARY KEY,
  recipient_id INTEGER REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- sent | delivered | opened | bounced | unsubscribed | complained | failed
  resend_message_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_message ON email_events(resend_message_id);

CREATE TABLE IF NOT EXISTS unsubscribes (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sequences (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  lead_filter JSONB NOT NULL DEFAULT '{}'::JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sequence_steps (
  id SERIAL PRIMARY KEY,
  sequence_id INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  day_offset INTEGER NOT NULL, -- days after enrollment
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  UNIQUE (sequence_id, step_order)
);

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id SERIAL PRIMARY KEY,
  sequence_id INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_step INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | done | stopped
  UNIQUE (sequence_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_active ON sequence_enrollments(status, sequence_id);

-- Email branding (added in v2). ALTER + IF NOT EXISTS makes this idempotent.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_color TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bg_color TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS text_color TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS font_family TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cta_url TEXT;
