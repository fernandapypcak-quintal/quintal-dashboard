// src/components/pages/YoY.jsx
import { useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useFilters } from '../../hooks/useFilters';
import { CustomTooltip } from '../ui/ChartTooltip';
import { groupBy, sumValues, formatBRL, formatPercentPlain, calcVariation, formatPercent } from '../../utils/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';

const YEAR_COLORS = ['#0D0D0D', '#97A624', '#D9B504', '#8C1414'];
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function YoY() {
  const { filteredData, meta } = useFilters();
  const [view, setView] = useState('total'); // 'total' | 'casa' | 'delivery'

  const years = useMemo(() => {
    return [...new Set(filteredData.map(r => r.Ano))].sort();
  }, [filteredData]);

  // Build monthly comparison: each row = month, columns = years
  const monthlyByYear = useMemo(() => {
    return MESES_ABREV.map((mes, idx) => {
      const row = { mes };
      years.forEach(year => {
        const recs = filteredData.filter(r => r.Ano === year && r.Mes === idx + 1);
        row[`${year}`] = sumValues(recs.filter(r => view === 'total' ? true : r.Canal === view.toUpperCase()));
        row[`${year}_casa`] = sumValues(recs.filter(r => r.Canal === 'CASA'));
        row[`${year}_del`] = sumValues(recs.filter(r => r.Canal === 'DELIVERY'));
      });
      return row;
    });
  }, [filteredData, years, view]);

  // Annual totals
  const annualTotals = useMemo(() => {
    return years.map((year, i) => {
      const recs = filteredData.filter(r => r.Ano === year);
      const total = sumValues(recs);
      const casa  = sumValues(recs.filter(r => r.Canal === 'CASA'));
      const del   = sumValues(recs.filter(r => r.Canal === 'DELIVERY'));
      const prevYear = years[i - 1];
      const prevRecs = prevYear ? filteredData.filter(r => r.Ano === prevYear) : [];
      const growth = calcVariation(total, sumValues(prevRecs));
      return { year, total, casa, del, growth };
    });
  }, [filteredData, years]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Annual totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {annualTotals.map((d, i) => (
          <div key={d.year} className="kpi-card" style={{ borderTop: `3px solid ${YEAR_COLORS[i % YEAR_COLORS.length]}` }}>
            <p className="text-xs text-zinc-400 mb-2 font-medium">{d.year}</p>
            <p className="text-xl font-bold font-display text-brand-black">{formatBRL(d.total, true)}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Casa</span>
                <span className="font-medium">{formatBRL(d.casa, true)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Delivery</span>
                <span className="font-medium">{formatBRL(d.del, true)}</span>
              </div>
              {d.growth !== null && (
                <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${d.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {d.growth >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                  {formatPercent(d.growth)} YoY
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View toggle + line chart */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="section-title">Evolução Mensal por Ano</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Comparativo mês a mês entre anos</p>
          </div>
          <div className="flex bg-surface-muted rounded-lg p-0.5 gap-0.5">
            {['total', 'casa', 'delivery'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  view === v ? 'bg-white shadow-sm text-brand-black' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {v === 'total' ? 'Total' : v === 'casa' ? 'Casa' : 'Delivery'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyByYear} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {years.map((year, i) => (
              <Line
                key={year}
                type="monotone"
                dataKey={`${year}`}
                name={`${year}`}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Annual bar comparison */}
      <div className="chart-card">
        <h3 className="section-title mb-1">Faturamento Anual — Casa vs Delivery</h3>
        <p className="text-xs text-zinc-400 mb-5">Composição por canal em cada ano</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={annualTotals} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="casa" name="Casa" fill="#97A624" radius={[0, 0, 0, 0]} stackId="a" maxBarSize={60} />
            <Bar dataKey="del" name="Delivery" fill="#D9B504" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="chart-card overflow-x-auto">
        <h3 className="section-title mb-4">Resumo Anual</h3>
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="table-header text-left py-2 pr-4">Ano</th>
              <th className="table-header text-right py-2 px-4">Total</th>
              <th className="table-header text-right py-2 px-4">Casa</th>
              <th className="table-header text-right py-2 px-4">Delivery</th>
              <th className="table-header text-right py-2 pl-4">% Delivery</th>
              <th className="table-header text-right py-2 pl-4">Crescimento</th>
            </tr>
          </thead>
          <tbody>
            {annualTotals.map(d => (
              <tr key={d.year} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                <td className="py-3 pr-4 font-semibold text-brand-black">{d.year}</td>
                <td className="py-3 px-4 text-right font-mono text-sm">{formatBRL(d.total)}</td>
                <td className="py-3 px-4 text-right font-mono text-sm text-brand-olive">{formatBRL(d.casa)}</td>
                <td className="py-3 px-4 text-right font-mono text-sm" style={{ color: '#D9B504' }}>{formatBRL(d.del)}</td>
                <td className="py-3 pl-4 text-right text-sm">{d.total > 0 ? formatPercentPlain(d.del/d.total*100) : '-'}</td>
                <td className="py-3 pl-4 text-right">
                  {d.growth !== null ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.growth >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                      {formatPercent(d.growth)}
                    </span>
                  ) : <span className="text-zinc-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
