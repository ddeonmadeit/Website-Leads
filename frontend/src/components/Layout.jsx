import { useState } from 'react';
import Sidebar from './Sidebar.jsx';

export default function Layout({ breadcrumb, title, actions, children }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen flex bg-charcoal-900">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-charcoal-875 border-r border-charcoal-800">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={close}>
          <div className="absolute inset-0 bg-black/60" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col bg-charcoal-875 border-r border-charcoal-800"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onNavigate={close} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-charcoal-800 bg-charcoal-900/80 backdrop-blur sticky top-0 z-10 flex items-center px-4 md:px-6 gap-3">
          <button
            type="button"
            className="md:hidden btn-icon"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="breadcrumb flex items-center gap-1.5 min-w-0 overflow-hidden">
            {(breadcrumb || []).map((b, i, arr) => (
              <span key={i} className="flex items-center gap-1.5 truncate">
                <span className={`truncate ${i === arr.length - 1 ? 'breadcrumb-current' : ''}`}>{b}</span>
                {i < arr.length - 1 && <span className="text-charcoal-600 hidden sm:inline">/</span>}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-charcoal-400">
            <span className="hidden sm:inline">leadscout.local</span>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-[1400px] w-full">
          {(title || actions) && (
            <div className="flex items-start justify-between mb-4 md:mb-6 flex-wrap gap-3">
              <h1 className="text-xl md:text-2xl font-semibold text-charcoal-100">{title}</h1>
              {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
