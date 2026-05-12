// src/components/pages/Trend.jsx
import { useMemo } from 'react';
import {
  ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useFilters } from '../../hooks/useFilters';
import { CustomTooltip } from '../ui/ChartTooltip';
import { getMonthlyTotals, getDailyTotals, formatBRL, calcVariation, formatPercent } from '../../utils/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Trend() {
  const { filteredData } = useFilters();

  const monthly = useMemo(() => {
    const data = getMonthlyTotals(filteredData);
    return data.map((d, i) => ({
      ...d,
      prev: i > 0 ? data[i - 1].total : null,
      growth: i > 0 ? calcVariation(d.total, data[i - 1].total) : null,
    }));
  }, [filteredData]);

  const last30Days = useMemo(() => {
    const all = getDailyTotals(filteredData);
    return all.slice(-30);
  }, [filteredData]);

  const last12Months = monthly.slice(-12);
  const avgMonthly = last12Months.length > 0
    ? last12Months.reduce((s, d) => s + d.total, 0) / last12Months.length
    : 0;

  // Moving average (3-month)
  const withMA = last12Months.map((d, i, arr) => ({
    ...d,
    ma3: i >= 2
      ? (arr[i].total + arr[i-1].total + arr[i-2].total) / 3
      : null,
  }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {last12Months.slice(-4).map((m, i) => {
          const prev = last12Months[last12Months.length - 4 + i - 1];
          const v = prev ? calcVariation(m.total, prev.total) : null;
          return (
            <div key={m.key} className="kpi-card">
              <p className="text-xs text-zinc-400 mb-2">{m.label}</p>
              <p className="text-xl font-bold font-display text-brand-black">{formatBRL(m.total, true)}</p>
              {v !== null && (
                <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${v >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {v >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {formatPercent(v)} vs mês ant.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Monthly trend with MA */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="section-title">Tendência Mensal</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Total + média móvel 3 meses</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Média 12M</p>
            <p className="text-sm font-bold text-brand-black font-display">{formatBRL(avgMonthly, true)}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={withMA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#97A624" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#97A624" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avgMonthly} stroke="#D9B504" strokeDasharray="5 5" strokeWidth={1.5} />
            <Area type="monotone" dataKey="total" name="Total" fill="url(#gradTotal)" stroke="#97A624" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="ma3" name="Média 3M" stroke="#8C1414" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Growth rate bars */}
      <div className="chart-card">
        <h3 className="section-title mb-1">Taxa de Crescimento Mensal</h3>
        <p className="text-xs text-zinc-400 mb-5">Variação % vs mês anterior</p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={withMA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v?.toFixed(0)}%`} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={45} />
            <Tooltip formatter={(v) => v != null ? `${v.toFixed(1)}%` : '-'} />
            <ReferenceLine y={0} stroke="#E4E4E0" strokeWidth={1.5} />
            <Bar dataKey="growth" name="Crescimento %" radius={[3, 3, 0, 0]} maxBarSize={28}
              fill="#97A624"
              // Conditional color via Cell would need mapping; using single color here
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Last 30 days */}
      <div className="chart-card">
        <h3 className="section-title mb-1">Últimos 30 Dias</h3>
        <p className="text-xs text-zinc-400 mb-5">Faturamento diário Casa + Delivery</p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={last30Days} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="diaSemana" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="casa" name="Casa" fill="#97A624" radius={[3, 3, 0, 0]} maxBarSize={20} stackId="a" />
            <Bar dataKey="delivery" name="Delivery" fill="#D9B504" radius={[3, 3, 0, 0]} maxBarSize={20} stackId="a" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
