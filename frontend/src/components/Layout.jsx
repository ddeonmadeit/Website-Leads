import Sidebar from './Sidebar.jsx';

export default function Layout({ breadcrumb, title, actions, children }) {
  return (
    <div className="min-h-screen flex bg-charcoal-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-charcoal-800 bg-charcoal-900/80 backdrop-blur sticky top-0 z-10 flex items-center px-6">
          <div className="breadcrumb flex items-center gap-1.5">
            {(breadcrumb || []).map((b, i, arr) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className={i === arr.length - 1 ? 'breadcrumb-current' : ''}>{b}</span>
                {i < arr.length - 1 && <span className="text-charcoal-600">/</span>}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-charcoal-400">
            <span className="hidden sm:inline">leadscout.local</span>
          </div>
        </header>
        <main className="flex-1 px-6 py-6 max-w-[1400px] w-full">
          {(title || actions) && (
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h1 className="text-2xl font-semibold text-charcoal-100">{title}</h1>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
