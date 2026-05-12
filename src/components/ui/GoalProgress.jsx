// src/components/ui/GoalProgress.jsx
import { formatBRL, formatPercentPlain } from '../../utils/formatters';

// Cor dinâmica baseada no % atingido
export function progressColor(pct) {
  if (pct >= 100) return { text: '#059669', bg: '#ecfdf5', bar: '#059669' };
  if (pct >= 80)  return { text: '#D97706', bg: '#fffbeb', bar: '#D97706' };
  return               { text: '#dc2626', bg: '#fef2f2', bar: '#dc2626' };
}

// Barra de progresso grande (resumo do mês)
export function BigProgressBar({ label, sublabel, realizado, meta, delay = 0 }) {
  const pct    = meta > 0 ? Math.min((realizado / meta) * 100, 100) : 0;
  const rawPct = meta > 0 ? (realizado / meta) * 100 : 0;
  const col    = progressColor(rawPct);
  const saldo  = realizado - meta;

  return (
    <div
      className="bg-white border border-surface-border rounded-2xl p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold font-display text-brand-black">{label}</p>
          {sublabel && <p className="text-xs text-zinc-400 mt-0.5">{sublabel}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-display" style={{ color: col.text }}>
            {rawPct.toFixed(1).replace('.', ',')}%
          </p>
          <p className="text-xs text-zinc-400">
            {formatBRL(realizado, true)} de {formatBRL(meta, true)}
          </p>
        </div>
      </div>

      {/* Barra */}
      <div className="h-2.5 bg-surface-muted rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: col.bar }}
        />
      </div>

      <div className="flex justify-between text-xs text-zinc-400">
        <span>R$ 0</span>
        <span
          className="font-semibold"
          style={{ color: saldo >= 0 ? '#059669' : '#dc2626' }}
        >
          {saldo >= 0 ? '+' : ''}{formatBRL(saldo, true)} {saldo >= 0 ? 'acima' : 'abaixo'} da meta
        </span>
        <span>Meta: {formatBRL(meta, true)}</span>
      </div>
    </div>
  );
}

// Badge de atingimento (para tabelas e KPI cards)
export function AtingBadge({ pct }) {
  if (pct === null || pct === undefined) return <span className="text-zinc-300">—</span>;
  const col = progressColor(pct);
  return (
    <span
      className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: col.text, backgroundColor: col.bg }}
    >
      {pct.toFixed(1).replace('.', ',')}%
    </span>
  );
}
