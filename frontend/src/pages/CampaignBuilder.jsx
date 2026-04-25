import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import RichEditor from '../components/RichEditor.jsx';
import EmailPreview from '../components/EmailPreview.jsx';

const DEFAULT_BODY = `<p>Hi {{business_name}},</p>
<p>I noticed you're operating in {{city}} but don't have a website yet. We help local businesses launch a clean professional site in days.</p>
<p>Worth a quick chat?</p>
<p>— Your name</p>`;

export default function CampaignBuilder() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const initialIds = location.state?.leadIds || null;

  const [form, setForm] = useState({
    name: '', from_name: '', from_email: '', reply_to: '',
    subject: '', body_html: DEFAULT_BODY, body_text: '',
    hourly_limit: 50, batch_delay_ms: 2000, scheduled_at: '',
  });
  const [savedId, setSavedId] = useState(id ? Number(id) : null);
  const [recipientCount, setRecipientCount] = useState(0);
  const [spam, setSpam] = useState({ score: 0, hits: [] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [filterMode, setFilterMode] = useState('selected'); // selected | filter
  const [filter, setFilter] = useState({ has_email: 'true', include_duplicates: 'false' });

  useEffect(() => {
    if (id) {
      api.getCampaign(id).then(({ campaign, recipients }) => {
        setForm((f) => ({
          ...f,
          name: campaign.name || '',
          from_name: campaign.from_name || '',
          from_email: campaign.from_email || '',
          reply_to: campaign.reply_to || '',
          subject: campaign.subject || '',
          body_html: campaign.body_html || DEFAULT_BODY,
          body_text: campaign.body_text || '',
          hourly_limit: campaign.hourly_limit || 50,
          batch_delay_ms: campaign.batch_delay_ms || 2000,
          scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : '',
        }));
        setRecipientCount(recipients?.length || 0);
      });
    }
  }, [id]);

  // spam-check on subject (debounced)
  useEffect(() => {
    if (!form.subject) { setSpam({ score: 0, hits: [] }); return; }
    const t = setTimeout(() => {
      api.spamCheck(form.subject).then(setSpam).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [form.subject]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true); setMsg('');
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      };
      let cid = savedId;
      if (cid) {
        await api.updateCampaign(cid, payload);
      } else {
        const r = await api.createCampaign(payload);
        cid = r.id; setSavedId(cid);
        nav(`/campaigns/${cid}`, { replace: true });
      }
      setMsg('Saved.');
      return cid;
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    } finally { setBusy(false); }
    return null;
  };

  const addRecipients = async () => {
    setBusy(true); setMsg('');
    try {
      let cid = savedId;
      if (!cid) cid = await save();
      if (!cid) return;
      const body = filterMode === 'filter' ? { filter } : { ids: initialIds || [] };
      if (filterMode === 'selected' && (!initialIds || !initialIds.length)) {
        setMsg('No selected leads. Use the Leads page to select rows, or switch to Filter mode.');
        return;
      }
      const r = await api.addRecipients(cid, body);
      setMsg(`Added ${r.added} recipients (skipped ${r.skipped}).`);
      const got = await api.getCampaign(cid);
      setRecipientCount(got.recipients?.length || 0);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    } finally { setBusy(false); }
  };

  const launch = async (immediate) => {
    if (!savedId) { await save(); }
    const cid = savedId || (await save());
    if (!cid) return;
    setBusy(true); setMsg('');
    try {
      await api.launchCampaign(cid, immediate ? {} : { scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null });
      setMsg(immediate ? 'Sending started.' : 'Scheduled.');
      nav('/campaigns');
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{savedId ? 'Edit campaign' : 'New campaign'}</h1>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="card grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="label">Campaign name</label>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">From name</label>
              <input className="input" value={form.from_name} onChange={(e) => set('from_name', e.target.value)} />
            </div>
            <div>
              <label className="label">From email (verified in Resend)</label>
              <input className="input" type="email" value={form.from_email} onChange={(e) => set('from_email', e.target.value)} placeholder="hello@yourdomain.com" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Reply-to</label>
              <input className="input" type="email" value={form.reply_to} onChange={(e) => set('reply_to', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Subject (supports merge tags)</label>
              <input className="input" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Quick idea for {{business_name}}" />
              {spam.hits?.length > 0 && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠ Spam triggers detected: {spam.hits.join(', ')}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <label className="label">Body</label>
            <RichEditor value={form.body_html} onChange={(v) => set('body_html', v)} />
            <div className="text-xs text-slate-500 mt-2">A plain-text version is auto-generated. Unsubscribe link is appended automatically.</div>
          </div>

          <div className="card grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Hourly limit</label>
              <input className="input" type="number" min="1" max="500" value={form.hourly_limit} onChange={(e) => set('hourly_limit', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Delay between sends (ms)</label>
              <input className="input" type="number" min="0" max="60000" value={form.batch_delay_ms} onChange={(e) => set('batch_delay_ms', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Schedule (optional)</label>
              <input className="input" type="datetime-local" value={form.scheduled_at} onChange={(e) => set('scheduled_at', e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="font-semibold mb-2">Recipients</div>
            <div className="flex gap-3 mb-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={filterMode === 'selected'} onChange={() => setFilterMode('selected')} />
                Use selection from Leads page ({initialIds?.length || 0})
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={filterMode === 'filter'} onChange={() => setFilterMode('filter')} />
                Use filter
              </label>
            </div>
            {filterMode === 'filter' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <input className="input" placeholder="Country" value={filter.country || ''} onChange={(e) => setFilter({ ...filter, country: e.target.value })} />
                <input className="input" placeholder="Niche" value={filter.niche || ''} onChange={(e) => setFilter({ ...filter, niche: e.target.value })} />
                <input className="input" placeholder="Tag" value={filter.tag || ''} onChange={(e) => setFilter({ ...filter, tag: e.target.value })} />
                <select className="input" value={filter.has_email} onChange={(e) => setFilter({ ...filter, has_email: e.target.value })}>
                  <option value="true">With email</option>
                  <option value="">Any</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button className="btn-secondary" onClick={addRecipients} disabled={busy}>Add to campaign</button>
              <span className="text-sm text-slate-500">{recipientCount} recipient(s) attached</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={save} disabled={busy}>Save draft</button>
            <button className="btn-primary" onClick={() => launch(true)} disabled={busy}>Send now</button>
            {form.scheduled_at && <button className="btn-secondary" onClick={() => launch(false)} disabled={busy}>Schedule</button>}
            {msg && <span className="text-sm text-slate-500 self-center">{msg}</span>}
          </div>
        </div>

        <div>
          <EmailPreview subject={form.subject} html={form.body_html} text={form.body_text} />
        </div>
      </div>
    </div>
  );
}
