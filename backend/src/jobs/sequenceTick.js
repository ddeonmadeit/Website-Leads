import { query } from '../db.js';
import { sendDirectEmail } from '../email/sender.js';

// Daily tick — advance each active enrollment that's due for its next step.
export async function tickSequences() {
  const { rows: sequences } = await query(
    `SELECT * FROM sequences WHERE active = TRUE`,
  );
  for (const seq of sequences) {
    const steps = (await query(
      `SELECT * FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_order ASC`,
      [seq.id],
    )).rows;
    if (!steps.length) continue;

    const { rows: enrollments } = await query(
      `SELECT se.*, l.id AS lead_id, l.email, l.email_status, l.reply_received,
              l.business_name, l.city, l.country, l.category, l.phone
       FROM sequence_enrollments se
       JOIN leads l ON l.id = se.lead_id
       WHERE se.sequence_id = $1 AND se.status = 'active'`,
      [seq.id],
    );

    for (const en of enrollments) {
      // Hard stops
      if (en.email_status === 'unsubscribed' || en.email_status === 'bounced') {
        await query(`UPDATE sequence_enrollments SET status = 'stopped' WHERE id = $1`, [en.id]);
        continue;
      }
      if (en.reply_received) {
        await query(`UPDATE sequence_enrollments SET status = 'stopped' WHERE id = $1`, [en.id]);
        continue;
      }
      const nextIdx = en.current_step; // 0-based index of next step to send
      const nextStep = steps[nextIdx];
      if (!nextStep) {
        await query(`UPDATE sequence_enrollments SET status = 'done' WHERE id = $1`, [en.id]);
        continue;
      }
      const enrolledAt = new Date(en.enrolled_at).getTime();
      const dueAt = enrolledAt + (nextStep.day_offset * 24 * 60 * 60 * 1000);
      if (Date.now() < dueAt) continue;

      try {
        // eslint-disable-next-line no-await-in-loop
        await sendDirectEmail({
          lead: {
            id: en.lead_id,
            business_name: en.business_name,
            email: en.email,
            city: en.city,
            country: en.country,
            category: en.category,
            phone: en.phone,
          },
          subject: nextStep.subject,
          bodyHtml: nextStep.body_html,
          bodyText: nextStep.body_text,
          fromName: seq.from_name,
          fromEmail: seq.from_email,
          replyTo: seq.reply_to,
        });
        await query(
          `UPDATE sequence_enrollments
           SET current_step = current_step + 1, last_sent_at = NOW(),
               status = CASE WHEN current_step + 1 >= $2 THEN 'done' ELSE 'active' END
           WHERE id = $1`,
          [en.id, steps.length],
        );
      } catch (err) {
        console.error('[sequences] send failed', en.id, err.message);
      }
    }
  }
}
