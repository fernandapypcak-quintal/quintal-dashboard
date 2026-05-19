// src/components/ui/KpiCard.jsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatBRL, formatPct } from '../../utils/formatters';
import InfoTip from './InfoTip';

export default function KpiCard({
  title,
  value,
  subtitle,
  variation,
  variationLabel,
  format = 'currency',
  accent,
  icon: Icon,
  delay = 0,
  tooltip,        // ← novo: texto explicativo
}) {
  const isPositive = variation > 0;
  const isNegative = variation < 0;
  const isNeutral  = variation === 0 || variation === null || variation === undefined;

  const displayValue = format === 'currency'
    ? formatBRL(value, true)
    : format === 'percent'
    ? `${value?.toFixed(1).replace('.', ',')}%`
    : value;

  return (
    <div
      className="kpi-card animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-0.5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</p>
          {tooltip && <InfoTip text={tooltip} />}
        </div>
        {Icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: accent ? `${accent}18` : '#F4F4F0' }}
          >
            <Icon size={14} style={{ color: accent || '#71717A' }} />
          </div>
        )}
      </div>

      <p className="text-2xl font-bold text-brand-black font-display tracking-tight mb-2" title={typeof value === 'number' ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value) : undefined}>
        {displayValue}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {variation !== null && variation !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full
            ${isPositive ? 'text-emerald-700 bg-emerald-50' : ''}
            ${isNegative ? 'text-rose-700 bg-rose-50' : ''}
            ${isNeutral  ? 'text-zinc-600 bg-zinc-100' : ''}
          `}>
            {isPositive && <TrendingUp size={11} />}
            {isNegative && <TrendingDown size={11} />}
            {isNeutral  && <Minus size={11} />}
            {formatPct(variation)}
          </span>
        )}
        {variationLabel && <span className="text-xs text-zinc-400">{variationLabel}</span>}
        {subtitle && <p className="text-xs text-zinc-400 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}
