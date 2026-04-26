import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function EmailPreview({ subject, html, text, from, branding }) {
  const [device, setDevice] = useState('desktop');
  const [rendered, setRendered] = useState({ subject, html, text });

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const r = await api.previewCampaign({
          subject, body_html: html, body_text: text,
          ...(branding || {}),
        });
        if (!cancelled) setRendered(r);
      } catch {
        if (!cancelled) setRendered({ subject, html, text });
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [subject, html, text, branding && JSON.stringify(branding)]);

  const initials = (from || 'YN')
    .replace(/<[^>]+>/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'YN';

  const fromName = (from || '').replace(/<[^>]*>/, '').trim() || 'Your Name';
  const fromEmail = (from || '').match(/<([^>]+)>/)?.[1] || from || 'you@yourdomain.com';

  const Tab = ({ active, onClick, children }) => (
    <button onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded transition-colors ${active ? 'bg-charcoal-800 text-brand-400' : 'text-charcoal-400 hover:text-charcoal-200'}`}>
      {children}
    </button>
  );

  return (
    <div className="card lg:sticky lg:top-20">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="font-semibold text-charcoal-100">Preview</div>
        <div className="flex items-center gap-1">
          <Tab active={device === 'desktop'} onClick={() => setDevice('desktop')}>Desktop</Tab>
          <Tab active={device === 'mobile'} onClick={() => setDevice('mobile')}>Mobile</Tab>
        </div>
      </div>

      {/* Inbox-style email frame */}
      <div className={`mx-auto rounded-xl border border-charcoal-800 bg-white overflow-hidden transition-all ${
        device === 'mobile' ? 'max-w-[375px]' : 'w-full'
      }`}>
        {/* Email header (from / to / subject) */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-semibold text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">{fromName}</span>
                <span className="text-slate-500 text-xs truncate">&lt;{fromEmail}&gt;</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">to <span className="text-slate-700">you@example.com</span></div>
              <div className="font-semibold text-slate-900 text-sm mt-1.5 break-words">
                {rendered.subject || <span className="text-slate-400 font-normal italic">(no subject)</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Rendered email body */}
        <iframe
          title="email-preview"
          sandbox=""
          className="w-full block bg-white"
          style={{ height: device === 'mobile' ? 520 : 560, border: 0 }}
          srcDoc={rendered.html || '<body style="font-family:Arial;color:#888;padding:24px">Empty body</body>'}
        />
      </div>

      <div className="text-xs text-charcoal-500 mt-3 leading-relaxed">
        This is exactly how the email renders in Gmail, Outlook, and Apple Mail. Merge tags
        ({'{{business_name}}'}, {'{{city}}'}, etc.) are filled with sample lead data.
      </div>
    </div>
  );
}
