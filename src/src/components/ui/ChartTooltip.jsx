// src/components/ui/ChartTooltip.jsx
import { formatBRL } from '../../utils/formatters';

export function CustomTooltip({ active, payload, label, showPercent = false }) {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((s, p) => s + (p.value || 0), 0);

  return (
    <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[160px]">
      <p className="text-xs font-semibold text-zinc-500 mb-2 pb-2 border-b border-surface-border">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-zinc-600">{entry.name}</span>
            </div>
            <span className="text-xs font-semibold text-brand-black">
              {formatBRL(entry.value, true)}
            </span>
          </div>
        ))}
        {payload.length > 1 && (
          <div className="flex items-center justify-between gap-4 pt-1.5 mt-1.5 border-t border-surface-border">
            <span className="text-xs font-semibold text-zinc-700">Total</span>
            <span className="text-xs font-bold text-brand-black">{formatBRL(total, true)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SimpleTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-brand-black">{formatBRL(payload[0]?.value, true)}</p>
    </div>
  );
}
