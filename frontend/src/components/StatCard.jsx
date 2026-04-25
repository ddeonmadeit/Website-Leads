import Sparkline from './Sparkline.jsx';

export default function StatCard({ label, value, delta, hint, sparkline, color }) {
  const positive = (delta || 0) >= 0;
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-charcoal-300">{label}</div>
        {delta !== undefined && (
          <div className={`chip ${positive ? 'chip-orange' : 'chip-red'}`}>
            {positive ? '+' : ''}{delta}%
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-charcoal-100">{value}</div>
        {hint && <div className="text-xs text-charcoal-400">{hint}</div>}
      </div>
      <div className="mt-3 -mx-1">
        <Sparkline data={sparkline} color={color} />
      </div>
    </div>
  );
}
