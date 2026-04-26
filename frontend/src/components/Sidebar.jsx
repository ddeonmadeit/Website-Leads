import { NavLink, Link } from 'react-router-dom';
import { I } from './Icons.jsx';

const SECTIONS = [
  {
    label: 'Leads',
    items: [
      { to: '/leads', label: 'All leads', icon: I.Users },
      { to: '/scrape', label: 'Scrape jobs', icon: I.Search },
    ],
  },
  {
    label: 'Outreach',
    items: [
      { to: '/campaigns', label: 'Campaigns', icon: I.Send },
      { to: '/sequences', label: 'Sequences', icon: I.Repeat },
    ],
  },
];

export default function Sidebar({ onNavigate }) {
  return (
    <>
      <Link to="/" onClick={onNavigate} className="px-5 pt-5 pb-3 flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">H</div>
        <div>
          <div className="text-sm font-semibold text-charcoal-100 leading-tight">Helix Outreach</div>
          <div className="text-[11px] text-charcoal-400 leading-tight">Cold-email engine</div>
        </div>
      </Link>
      <nav className="px-3 mt-2 flex-1 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="nav-section">{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <item.icon className="shrink-0 opacity-90" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="m-3 p-3 rounded-xl bg-charcoal-800/60 border border-charcoal-800 text-xs text-charcoal-400">
        <div className="text-charcoal-100 text-sm font-medium mb-1">Need help?</div>
        See README.md in the repo for setup &amp; deploy.
      </div>
    </>
  );
}
