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

  return (
    <div className="card sticky top-20">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Preview</div>
        <div className="flex items-center gap-1">
          <button className={`btn-ghost text-xs ${device === 'desktop' ? 'bg-slate-200 dark:bg-slate-700' : ''}`} onClick={() => setDevice('desktop')}>Desktop</button>
          <button className={`btn-ghost text-xs ${device === 'mobile' ? 'bg-slate-200 dark:bg-slate-700' : ''}`} onClick={() => setDevice('mobile')}>Mobile</button>
          <span className="w-px bg-slate-300 dark:bg-slate-700 mx-1" />
          <button className={`btn-ghost text-xs ${view === 'html' ? 'bg-slate-200 dark:bg-slate-700' : ''}`} onClick={() => setView('html')}>HTML</button>
          <button className={`btn-ghost text-xs ${view === 'text' ? 'bg-slate-200 dark:bg-slate-700' : ''}`} onClick={() => setView('text')}>Plain</button>
        </div>
      </div>
      <div className="text-xs text-slate-500 mb-2">Subject</div>
      <div className="font-medium mb-3">{rendered.subject || <span className="text-slate-400">(empty)</span>}</div>
      <div className={`mx-auto border border-slate-200 dark:border-slate-800 rounded-md ${frame} bg-white dark:bg-slate-50 transition-all`}>
        {view === 'html' ? (
          <iframe
            title="email-preview"
            sandbox=""
            className="w-full min-h-[420px] rounded-md"
            srcDoc={`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222;padding:16px">${rendered.html || ''}</body></html>`}
          />
        ) : (
          <pre className="text-xs p-4 whitespace-pre-wrap text-slate-700">{rendered.text || ''}</pre>
        )}
      </div>
    </div>
  );
}
