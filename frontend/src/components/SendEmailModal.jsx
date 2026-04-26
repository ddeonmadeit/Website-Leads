import { useEffect, useState } from 'react';
import { api } from '../api.js';
import RichEditor from './RichEditor.jsx';
import EmailPreview from './EmailPreview.jsx';
import { I } from './Icons.jsx';

const STORAGE_KEY = 'helix.send-one-defaults.v1';

const DEFAULT_BODY = `<p>Hi {{business_name}},</p>
<p>I noticed you're operating in {{city}} but don't have a website yet. We help local businesses launch a clean professional site in days.</p>
<p>Worth a quick chat?</p>
<p>— Your name</p>`;

function loadDefaults() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveDefaults(d) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {/* ignore */}
}

export default function SendEmailModal({ lead, onClose, onSent }) {
  const defaults = loadDefaults();
  const [form, setForm] = useState({
    from_name: defaults.from_name || '',
    from_email: defaults.from_email || '',
    reply_to: defaults.reply_to || '',
    subject: defaults.subject || 'Quick idea for {{business_name}}',
    body_html: defaults.body_html || DEFAULT_BODY,
    body_text: '',
    logo_url: defaults.logo_url || '',
    brand_color: defaults.brand_color || '#ff6b1a',
    bg_color: defaults.bg_color || '#f4f4f5',
    text_color: defaults.text_color || '#222222',
    font_family: defaults.font_family || 'Arial, Helvetica, sans-serif',
    cta_text: defaults.cta_text || '',
    cta_url: defaults.cta_url || '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [showBranding, setShowBranding] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Lock body scroll while modal open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const send = async () => {
    setMsg('');
    if (!form.from_name || !form.from_email || !form.subject || !form.body_html) {
      setMsg('From name, from email, subject and body are required.');
      return;
    }
    setBusy(true);
    try {
      await api.sendLeadEmail(lead.id, form);
      // Persist defaults so the user only fills sender + branding once
      saveDefaults({
        from_name: form.from_name,
        from_email: form.from_email,
        reply_to: form.reply_to,
        subject: form.subject,
        body_html: form.body_html,
        logo_url: form.logo_url,
        brand_color: form.brand_color,
        bg_color: form.bg_color,
        text_color: form.text_color,
        font_family: form.font_family,
        cta_text: form.cta_text,
        cta_url: form.cta_url,
      });
      setMsg('Sent ✓');
      onSent?.();
      setTimeout(() => onClose?.(), 700);
    } catch (e) {
      setMsg(`Error: ${e.message || 'send_failed'}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-stretch md:items-center justify-center"
      onClick={() => !busy && onClose?.()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full md:max-w-5xl md:max-h-[92vh] bg-charcoal-900 md:rounded-xl border-charcoal-800 md:border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-charcoal-800 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center">
            <I.Send />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-charcoal-100 truncate">Send email</div>
            <div className="text-xs text-charcoal-400 truncate">
              To: <span className="text-charcoal-200">{lead.business_name}</span>
              {lead.email && <> · <span className="text-brand-400">{lead.email}</span></>}
            </div>
          </div>
          <button type="button" className="ml-auto btn-icon" onClick={() => !busy && onClose?.()} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body — composer (scrollable) + preview */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-4 p-4 md:p-6">
            <div className="space-y-4 min-w-0">
              {/* Sender */}
              <div className="card">
                <div className="font-semibold text-charcoal-100 mb-3">Sender</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label">From name</label>
                    <input className="input" value={form.from_name} onChange={(e) => set('from_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">From email</label>
                    <input className="input" type="email" value={form.from_email}
                      onChange={(e) => set('from_email', e.target.value)} placeholder="hello@yourdomain.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Reply-to (optional)</label>
                    <input className="input" type="email" value={form.reply_to} onChange={(e) => set('reply_to', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Subject (supports merge tags)</label>
                    <input className="input" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="card">
                <div className="font-semibold text-charcoal-100 mb-3">Body</div>
                <RichEditor value={form.body_html} onChange={(v) => set('body_html', v)} />
                <div className="text-xs text-charcoal-500 mt-2">
                  Merge tags filled with this lead's data. Unsubscribe link added automatically.
                </div>
              </div>

              {/* Branding (collapsible) */}
              <div className="card">
                <button type="button" onClick={() => setShowBranding((v) => !v)}
                  className="w-full flex items-center justify-between font-semibold text-charcoal-100">
                  <span>Branding</span>
                  <span className="text-xs text-charcoal-400">{showBranding ? 'Hide' : 'Show'}</span>
                </button>
                {showBranding && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="label">Logo URL</label>
                      <input className="input" type="url" value={form.logo_url}
                        onChange={(e) => set('logo_url', e.target.value)} placeholder="https://yourcdn.com/logo.png" />
                    </div>
                    <div>
                      <label className="label">Brand colour</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="h-10 w-12 rounded cursor-pointer border border-charcoal-700 bg-charcoal-850"
                          value={form.brand_color} onChange={(e) => set('brand_color', e.target.value)} />
                        <input className="input flex-1 font-mono text-xs" value={form.brand_color}
                          onChange={(e) => set('brand_color', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Background</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="h-10 w-12 rounded cursor-pointer border border-charcoal-700 bg-charcoal-850"
                          value={form.bg_color} onChange={(e) => set('bg_color', e.target.value)} />
                        <input className="input flex-1 font-mono text-xs" value={form.bg_color}
                          onChange={(e) => set('bg_color', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Text colour</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="h-10 w-12 rounded cursor-pointer border border-charcoal-700 bg-charcoal-850"
                          value={form.text_color} onChange={(e) => set('text_color', e.target.value)} />
                        <input className="input flex-1 font-mono text-xs" value={form.text_color}
                          onChange={(e) => set('text_color', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Font</label>
                      <select className="input" value={form.font_family} onChange={(e) => set('font_family', e.target.value)}>
                        <option value="Arial, Helvetica, sans-serif">Arial / Helvetica</option>
                        <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</option>
                        <option value="Georgia, 'Times New Roman', serif">Georgia (serif)</option>
                        <option value="'Courier New', Courier, monospace">Courier (mono)</option>
                        <option value="Verdana, Geneva, sans-serif">Verdana</option>
                        <option value="Tahoma, Geneva, sans-serif">Tahoma</option>
                        <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System UI</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Button text (optional)</label>
                      <input className="input" value={form.cta_text} onChange={(e) => set('cta_text', e.target.value)} placeholder="Book a call" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Button URL (optional)</label>
                      <input className="input" type="url" value={form.cta_url}
                        onChange={(e) => set('cta_url', e.target.value)} placeholder="https://cal.com/you" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="min-w-0">
              <EmailPreview
                subject={form.subject}
                html={form.body_html}
                text={form.body_text}
                from={`${form.from_name || 'Your Name'} <${form.from_email || 'you@yourdomain.com'}>`}
                branding={{
                  logo_url: form.logo_url,
                  brand_color: form.brand_color,
                  bg_color: form.bg_color,
                  text_color: form.text_color,
                  font_family: form.font_family,
                  cta_text: form.cta_text,
                  cta_url: form.cta_url,
                }}
              />
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-t border-charcoal-800 bg-charcoal-875 shrink-0 flex-wrap">
          {msg && <span className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</span>}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={() => !busy && onClose?.()} disabled={busy}>Cancel</button>
            <button type="button" className="btn-primary" onClick={send} disabled={busy || !lead.email}>
              <I.Send /> {busy ? 'Sending…' : 'Send email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
