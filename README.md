# LeadScout

Full-stack lead generation + cold email outreach platform. Finds local businesses **without
websites** in target markets, lets you store and tag them, and sends personalised cold-email
campaigns and follow-up sequences via Resend.

```
backend/    Express API · Postgres · Puppeteer scraper · Resend sender · cron jobs
frontend/   Vite + React + Tailwind dashboard with TipTap editor and live preview
```

## Features

- **Automated lead scraper** — Google Maps, Yellow Pages variants, public Facebook pages
  (Puppeteer + Cheerio, no paid APIs).
- **Country / niche presets** for Philippines, India, South Africa, UAE.
- **"No website" detection** — flags listings with no website URL, social-only links,
  or broken URLs (HEAD probe with timeout/redirect handling).
- **Async job queue** with progress, recurring scrapes (daily / weekly).
- **Leads dashboard** — sort, filter, search, bulk select, bulk tag/delete/add-to-campaign,
  CSV import & export, automatic duplicate detection.
- **Stats bar** — total / with email / sent / open rate / bounce rate.
- **Campaign builder** — TipTap rich editor, merge tags, HTML toggle, **live desktop /
  mobile preview**, plain-text auto-generated, unsubscribe link auto-appended.
- **Spam-prevention guards** — subject-line trigger detector, hourly rate limiter,
  `List-Unsubscribe` and `List-Unsubscribe-Post` headers, hard-block sending to bounced
  / unsubscribed leads, Resend webhook ingestion.
- **Follow-up sequences** — per-step day offsets, daily cron tick, auto-stop on reply /
  bounce / unsubscribe.
- **Dark mode**, mobile-responsive UI, simple env-var login.

## Stack

- Node 20 · Express · Postgres (Railway)
- Puppeteer + Cheerio for scraping
- Resend for sending + webhooks
- React 18 + Vite + Tailwind + TipTap

## Required environment variables

| Name | Where | Notes |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string. Railway PG plugin sets this. |
| `AUTH_USER` | backend | Login username |
| `AUTH_PASSWORD` | backend | Login password |
| `SESSION_SECRET` | backend | Long random string. Used to sign sessions and unsubscribe tokens. |
| `RESEND_API_KEY` | backend | From Resend dashboard |
| `RESEND_FROM_EMAIL` | backend | A verified sender on your domain |
| `RESEND_FROM_NAME` | backend | Display name |
| `RESEND_WEBHOOK_SECRET` | backend | The signing secret of the webhook (begins with `whsec_`) |
| `PUBLIC_BACKEND_URL` | backend | e.g. `https://leadscout-api.up.railway.app` (used in unsubscribe links) |
| `PUBLIC_FRONTEND_URL` | backend | Allow-listed for CORS |
| `DEFAULT_HOURLY_SEND_LIMIT` | backend | default 50 |
| `PUPPETEER_HEADLESS` | backend | default `true` |
| `VITE_API_BASE_URL` | frontend (build) | Public URL of the backend service |

A `.env.example` is provided at the repo root.

## Local development

```bash
# Postgres (any way you like)
createdb leads

# Backend
cd backend
cp ../.env.example .env   # edit DATABASE_URL, AUTH_USER, AUTH_PASSWORD
npm install
npm run migrate           # creates schema
npm run dev               # http://localhost:4000

# Frontend (separate terminal)
cd frontend
echo 'VITE_API_BASE_URL=http://localhost:4000' > .env.local
npm install
npm run dev               # http://localhost:5173
```

Sign in with whatever you put in `AUTH_USER` / `AUTH_PASSWORD`.

## Deploying to Railway

The repo is structured as a monorepo with two services: **backend** and **frontend**.

### 1. Create a Railway project

1. Push this repo to GitHub.
2. In Railway → New Project → "Deploy from GitHub repo".
3. Add the **Postgres** plugin. Railway sets `DATABASE_URL` for any service in the project.

### 2. Create the backend service

1. In the Railway project, click **+ New → GitHub Repo** (the same repo).
2. **Settings → Service → Root Directory:** `backend`.
3. Nixpacks will read `backend/nixpacks.toml`, install Chromium for Puppeteer, run
   `npm install`, then on start run `node src/migrate.js && node src/index.js`.
4. **Variables:** add the backend env vars from the table above. `DATABASE_URL` is auto-injected
   by the Postgres plugin if you reference it (`${{Postgres.DATABASE_URL}}`).
5. **Networking:** generate a public domain. Copy that URL into `PUBLIC_BACKEND_URL`.

### 3. Create the frontend service

1. Again click **+ New → GitHub Repo**, same repo.
2. **Settings → Service → Root Directory:** `frontend`.
3. Nixpacks runs `npm install && npm run build`, then `npm run preview` (serves `dist/`).
4. **Variables:**
   - `VITE_API_BASE_URL=<backend public URL>`
5. Generate a public domain. Copy that URL into the **backend's** `PUBLIC_FRONTEND_URL`.

### 4. Configure Resend

1. Go to <https://resend.com> → **Domains** → Add your sending domain.
2. Add the **SPF**, **DKIM** and **DMARC** DNS records Resend shows you. Wait for them to
   verify (≤ 24 h). This is what lets your mail land in inboxes — Resend cannot send on
   your behalf without it.
3. Create an **API key**, paste it into Railway as `RESEND_API_KEY`.
4. **Webhooks:** Resend → Webhooks → Add endpoint:
   - URL: `${PUBLIC_BACKEND_URL}/webhooks/resend`
   - Events: `email.delivered`, `email.opened`, `email.bounced`, `email.complained`,
     `email.failed`.
   - Copy the signing secret (`whsec_…`) into Railway as `RESEND_WEBHOOK_SECRET`.
5. Make sure the `from` address you set in campaigns is on a verified Resend domain.

### 5. First run

- Open the frontend URL and log in with the credentials you set.
- Go to **Scrape** → pick a country/niche/location → run a scrape. Watch the progress.
- Open **Leads**, filter / tag / select rows, then **Add to campaign**.
- In **Campaigns**, fill in `from name`, `from email`, subject, body. Use merge tags
  (`{{business_name}}`, `{{city}}`, `{{niche}}`, etc.) and check the live preview.
- Click **Send now** or schedule. Sending respects the per-campaign hourly limit.

## How "no website" detection works

For each scraped business:
1. If Google Maps shows no website field → `none`.
2. If website is a Facebook / Instagram / TikTok / WhatsApp / LinkedIn URL → `social_only`.
3. Otherwise a `HEAD` request is made (7 s timeout, follows redirects).
   - non-2xx, timeout, or DNS failure → `broken`.
   - resolves to a social host after redirects → `social_only`.
   - 2xx on the original domain → `ok` (these leads are dropped — they have a working site).

## Deliverability checklist

- ✅ Resend domain authenticated (SPF, DKIM, DMARC).
- ✅ Plain-text part auto-generated for every email.
- ✅ Unsubscribe link in every email footer.
- ✅ `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers.
- ✅ Per-campaign hourly rate limit (default 50/hr) and per-email send delay.
- ✅ Subject scanned for common spam triggers (warning shown in builder).
- ✅ Bounced / unsubscribed addresses are hard-blocked from any future send.
- ✅ Webhook sets lead status on bounce / open / unsubscribe / complaint.

## Cost

The only ongoing cost is Railway compute and Postgres. Resend has a generous free tier.
No paid third-party APIs are used anywhere.

## Notes on scraping

The scrapers use public, unauthenticated pages. They aim to be polite (single concurrency
by default, only HEAD requests for website checks, image/font/media blocked in Puppeteer).
You are responsible for complying with each site's terms of service and applicable laws
in the markets you target.
