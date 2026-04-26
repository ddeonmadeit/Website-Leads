import { query, tx } from '../db.js';
import { getResend } from './resendClient.js';
import { htmlToText, renderMergeTags } from '../utils/html.js';
import { wrapBranded, hasAnyBranding } from './template.js';
import {
  appendUnsubscribeFooterHtml, appendUnsubscribeFooterText, unsubscribeUrl,
} from './unsubscribe.js';

let loopRunning = false;

async function isBlockedEmail(email) {
  if (!email) return true;
  const { rows } = await query(
    `SELECT 1 FROM unsubscribes WHERE LOWER(email) = LOWER($1)
     UNION
     SELECT 1 FROM leads WHERE LOWER(email) = LOWER($1) AND email_status IN ('bounced','unsubscribed')
     LIMIT 1`,
    [email],
  );
  return rows.length > 0;
}

function mergeData(lead) {
  return {
    business_name: lead.business_name || '',
    city: lead.city || '',
    country: lead.country || '',
    niche: lead.category || '',
    category: lead.category || '',
    email: lead.email || '',
    phone: lead.phone || '',
  };
}

export function personalize({ subject, bodyHtml, bodyText, lead, branding }) {
  const data = mergeData(lead);
  const subj = renderMergeTags(subject, data);
  let inner = renderMergeTags(bodyHtml, data);
  inner = appendUnsubscribeFooterHtml(inner, lead.email);
  const html = hasAnyBranding(branding) ? wrapBranded(inner, branding) : inner;
  const textBase = bodyText ? renderMergeTags(bodyText, data) : htmlToText(bodyHtml);
  return {
    subject: subj,
    html,
    text: appendUnsubscribeFooterText(textBase, lead.email),
  };
}

async function sendOne({ campaign, recipient, lead }) {
  const resend = getResend();
  if (!resend) throw new Error('resend_not_configured');
  if (await isBlockedEmail(lead.email)) {
    await query(
      `UPDATE campaign_recipients SET status = 'skipped', error = 'blocked' WHERE id = $1`,
      [recipient.id],
    );
    return { skipped: true };
  }
  const { subject, html, text } = personalize({
    subject: campaign.subject,
    bodyHtml: campaign.body_html,
    bodyText: campaign.body_text,
    lead,
    branding: {
      logo_url: campaign.logo_url,
      brand_color: campaign.brand_color,
      bg_color: campaign.bg_color,
      text_color: campaign.text_color,
      font_family: campaign.font_family,
      cta_text: campaign.cta_text,
      cta_url: campaign.cta_url,
    },
  });

  const from = `${campaign.from_name} <${campaign.from_email}>`;
  const listUnsub = unsubscribeUrl(lead.email);
  const headers = {
    'List-Unsubscribe': `<${listUnsub}>, <mailto:${campaign.reply_to || campaign.from_email}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };

  try {
    const resp = await resend.emails.send({
      from,
      to: lead.email,
      reply_to: campaign.reply_to || undefined,
      subject,
      html,
      text,
      headers,
    });
    const id = resp?.data?.id || resp?.id;
    if (resp?.error) throw new Error(resp.error.message || 'resend_error');
    await tx(async (client) => {
      await client.query(
        `UPDATE campaign_recipients
         SET status = 'sent', sent_at = NOW(), resend_message_id = $2
         WHERE id = $1`,
        [recipient.id, id],
      );
      await client.query(
        `UPDATE leads SET email_status = 'sent', email_sent_at = NOW() WHERE id = $1 AND email_status = 'not_sent'`,
        [lead.id],
      );
      await client.query(
        `INSERT INTO email_events (recipient_id, lead_id, campaign_id, event_type, resend_message_id, payload)
         VALUES ($1, $2, $3, 'sent', $4, $5::jsonb)`,
        [recipient.id, lead.id, campaign.id, id, JSON.stringify({ subject })],
      );
    });
    return { ok: true, id };
  } catch (err) {
    await query(
      `UPDATE campaign_recipients SET status = 'failed', error = $2 WHERE id = $1`,
      [recipient.id, err.message?.slice(0, 500) || 'send_failed'],
    );
    return { error: err.message };
  }
}

async function pickNextCampaign() {
  const { rows } = await query(
    `SELECT * FROM campaigns
     WHERE (status = 'sending')
        OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW())
     ORDER BY COALESCE(started_at, created_at) ASC
     LIMIT 1`,
  );
  return rows[0] || null;
}

async function startCampaignIfScheduled(campaign) {
  if (campaign.status === 'scheduled') {
    await query(`UPDATE campaigns SET status = 'sending', started_at = NOW() WHERE id = $1`, [campaign.id]);
  }
}

async function sentLastHour(campaignId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM campaign_recipients
     WHERE campaign_id = $1 AND status = 'sent' AND sent_at > NOW() - INTERVAL '1 hour'`,
    [campaignId],
  );
  return rows[0]?.n || 0;
}

async function nextPendingRecipient(campaignId) {
  const { rows } = await query(
    `SELECT cr.*, l.*
     FROM campaign_recipients cr
     JOIN leads l ON l.id = cr.lead_id
     WHERE cr.campaign_id = $1 AND cr.status = 'pending'
     ORDER BY cr.id ASC
     LIMIT 1`,
    [campaignId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    recipient: { id: row.id, campaign_id: row.campaign_id, lead_id: row.lead_id, status: row.status },
    lead: {
      id: row.lead_id,
      business_name: row.business_name,
      email: row.email,
      city: row.city,
      country: row.country,
      category: row.category,
      phone: row.phone,
    },
  };
}

async function maybeFinishCampaign(campaignId) {
  const { rows } = await query(
    `SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
     FROM campaign_recipients WHERE campaign_id = $1`, [campaignId]);
  if (rows[0]?.pending === 0) {
    await query(`UPDATE campaigns SET status = 'done', finished_at = NOW() WHERE id = $1`, [campaignId]);
  }
}

export async function startEmailLoop() {
  if (loopRunning) return;
  loopRunning = true;
  const loop = async () => {
    while (loopRunning) {
      try {
        const campaign = await pickNextCampaign();
        if (!campaign) {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        await startCampaignIfScheduled(campaign);
        // rate limit
        const recent = await sentLastHour(campaign.id);
        const limit = campaign.hourly_limit || Number(process.env.DEFAULT_HOURLY_SEND_LIMIT) || 50;
        if (recent >= limit) {
          await new Promise((r) => setTimeout(r, 60000));
          continue;
        }
        const next = await nextPendingRecipient(campaign.id);
        if (!next) {
          await maybeFinishCampaign(campaign.id);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        await sendOne({ campaign, recipient: next.recipient, lead: next.lead });
        await new Promise((r) => setTimeout(r, campaign.batch_delay_ms || 2000));
      } catch (err) {
        console.error('[email] loop error', err);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };
  loop();
}

export function stopEmailLoop() { loopRunning = false; }

// Used by sequences and one-off lead sends to deliver a single message
// without creating a campaigns row.
export async function sendDirectEmail({
  lead, subject, bodyHtml, bodyText, fromName, fromEmail, replyTo, branding,
}) {
  const resend = getResend();
  if (!resend) throw new Error('resend_not_configured');
  if (!lead.email || await isBlockedEmail(lead.email)) return { skipped: true };
  const { subject: subj, html, text } = personalize({
    subject, bodyHtml, bodyText, lead, branding,
  });
  const from = `${fromName} <${fromEmail}>`;
  const headers = {
    'List-Unsubscribe': `<${unsubscribeUrl(lead.email)}>, <mailto:${replyTo || fromEmail}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
  const resp = await resend.emails.send({
    from, to: lead.email, reply_to: replyTo || undefined,
    subject: subj, html, text, headers,
  });
  const id = resp?.data?.id || resp?.id;
  if (resp?.error) throw new Error(resp.error.message);
  await query(
    `UPDATE leads SET email_status = 'sent', email_sent_at = NOW() WHERE id = $1 AND email_status = 'not_sent'`,
    [lead.id],
  );
  await query(
    `INSERT INTO email_events (lead_id, event_type, resend_message_id, payload)
     VALUES ($1, 'sent', $2, $3::jsonb)`,
    [lead.id, id, JSON.stringify({ subject: subj, source: 'direct' })],
  );
  return { ok: true, id };
}
