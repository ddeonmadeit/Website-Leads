import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function EmailPreview({ subject, html, text }) {
  const [device, setDevice] = useState('desktop');
  const [rendered, setRendered] = useState({ subject, html, text });
  const [view, setView] = useState('html');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const r = await api.previewCampaign({ subject, body_html: html, body_text: text });
        if (!cancelled) setRendered(r);
      } catch {
        if (!cancelled) setRendered({ subject, html, text });
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [subject, html, text]);

  const frame = device === 'mobile' ? 'w-[375px]' : 'w-full';

  const Tab = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`px-2.5 py-1 text-xs rounded transition-colors ${active ? 'bg-charcoal-800 text-brand-400' : 'text-charcoal-400 hover:text-charcoal-200'}`}>
      {children}
    </button>
  );

  return (
    <div className="card sticky top-20">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-charcoal-100">Preview</div>
        <div className="flex items-center gap-1">
          <Tab active={device === 'desktop'} onClick={() => setDevice('desktop')}>Desktop</Tab>
          <Tab active={device === 'mobile'} onClick={() => setDevice('mobile')}>Mobile</Tab>
          <span className="w-px bg-charcoal-700 mx-1 h-4" />
          <Tab active={view === 'html'} onClick={() => setView('html')}>HTML</Tab>
          <Tab active={view === 'text'} onClick={() => setView('text')}>Plain</Tab>
        </div>
      </div>
      <div className="text-xs text-charcoal-400 mb-1">Subject</div>
      <div className="font-medium mb-3 text-charcoal-100">{rendered.subject || <span className="text-charcoal-500">(empty)</span>}</div>
      <div className={`mx-auto border border-charcoal-800 rounded-lg ${frame} bg-white transition-all`}>
        {view === 'html' ? (
          <iframe
            title="email-preview"
            sandbox=""
            className="w-full min-h-[420px] rounded-lg"
            srcDoc={`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222;padding:16px;background:#fff">${rendered.html || ''}</body></html>`}
          />
        ) : (
          <pre className="text-xs p-4 whitespace-pre-wrap text-slate-700">{rendered.text || ''}</pre>
        )}
      </div>
    </div>
  );
}
