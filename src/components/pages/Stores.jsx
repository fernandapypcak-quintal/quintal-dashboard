// src/components/pages/Stores.jsx
import { useMemo } from 'react';
import {
  ComposedChart, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Cell, LabelList, PieChart, Pie
} from 'recharts';
import { useLabels } from '../../hooks/useLabels';
import { useFilters } from '../../hooks/useFilters';
import { CustomTooltip } from '../ui/ChartTooltip';
import {
  getStoreTotals, getMonthlyTotals, groupBy, sumValues,
  formatBRL, formatPercentPlain, calcVariation, formatPercent
} from '../../utils/formatters';
import { Store, TrendingUp, TrendingDown } from 'lucide-react';

const STORE_COLORS = ['#97A624', '#D9CB04', '#D9B504', '#8C1414'];


const BRLk = v => v >= 1e6 ? 'R$ '+(v/1e6).toFixed(1).replace('.',',')+'M' : v >= 1e3 ? 'R$ '+(v/1e3).toFixed(0)+'k' : 'R$ '+v.toFixed(0);
function CLabel({ x, y, width, value, showLabels, pct }) {
  if (!showLabels || value === null || value === undefined || value === 0) return null;
  const display = pct ? (value >= 0 ? '+' : '') + value.toFixed(1).replace('.', ',') + '%' : BRLk(value);
  const color = pct ? (value >= 0 ? '#059669' : '#dc2626') : '#52525B';
  return <text x={(x||0)+(width||0)/2} y={pct && value < 0 ? (y||0)+14 : (y||0)-5} textAnchor="middle" fontSize={10} fontWeight={500} fill={color} fontFamily="DM Sans">{display}</text>;
}

export default function Stores() {
  const { showLabels } = useLabels();
  const { filteredData } = useFilters();

  const storeTotals = useMemo(() => getStoreTotals(filteredData), [filteredData]);
  const totalGrand  = storeTotals.reduce((s, st) => s + st.total, 0);

  // Monthly by store
  const storeMonthly = useMemo(() => {
    const lojas = [...new Set(filteredData.map(r => r.Loja))].sort();
    const byMes = {};
    filteredData.forEach(r => {
      if (!byMes[r.Ano_Mes_Label]) byMes[r.Ano_Mes_Label] = { label: r.Ano_Mes_Label };
      if (!byMes[r.Ano_Mes_Label][r.Loja]) byMes[r.Ano_Mes_Label][r.Loja] = 0;
      byMes[r.Ano_Mes_Label][r.Loja] += r.Valor;
    });
    return Object.values(byMes)
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-12);
  }, [filteredData]);

  // Radar data (normalized to max)
  const DAYS_NUM = [5, 6, 0, 4, 1]; // Fri, Sat, Sun, Thu, Mon
  const DAY_LABELS = ['Sex', 'Sáb', 'Dom', 'Qui', 'Seg'];
  const radarData = useMemo(() => {
    return DAY_LABELS.map((label, i) => {
      const row = { label };
      storeTotals.forEach(st => {
        const recs = filteredData.filter(r => r.Loja === st.loja && r.Dia_Semana_Num === DAYS_NUM[i]);
        row[st.loja] = sumValues(recs);
      });
      return row;
    });
  }, [filteredData, storeTotals]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Store cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {storeTotals.map((st, i) => {
          const share = totalGrand > 0 ? (st.total / totalGrand * 100) : 0;
          return (
            <div key={st.loja} className="kpi-card" style={{ borderLeft: `4px solid ${STORE_COLORS[i]}` }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${STORE_COLORS[i]}18` }}>
                  <Store size={12} style={{ color: STORE_COLORS[i] }} />
                </div>
                <p className="text-xs font-medium text-zinc-500 truncate">{st.loja.replace('Quintal ', '')}</p>
              </div>
              <p className="text-xl font-bold font-display text-brand-black">{formatBRL(st.total, true)}</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Casa</span>
                  <span className="font-medium">{formatBRL(st.casa, true)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Delivery</span>
                  <span className="font-medium">{formatBRL(st.delivery, true)}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Share total</span>
                    <span className="font-semibold" style={{ color: STORE_COLORS[i] }}>{formatPercentPlain(share)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${share}%`, backgroundColor: STORE_COLORS[i] }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly stacked by store */}
      <div className="chart-card">
        <h3 className="section-title mb-1">Evolução Mensal por Loja</h3>
        <p className="text-xs text-zinc-400 mb-5">Barras empilhadas — últimos 12 meses</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={storeMonthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<CustomTooltip />} />
            {storeTotals.map((st, i) => (
              <Bar
                key={st.loja}
                dataKey={st.loja}
                name={st.loja.replace('Quintal ', '')}
                fill={STORE_COLORS[i]}
                stackId="a"
                radius={i === storeTotals.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Horizontal bar — share */}
        <div className="chart-card">
          <h3 className="section-title mb-1">Ranking de Faturamento</h3>
          <p className="text-xs text-zinc-400 mb-5">Total acumulado no período filtrado</p>
          <div className="space-y-4">
            {storeTotals.map((st, i) => {
              const share = totalGrand > 0 ? (st.total / storeTotals[0].total * 100) : 0;
              return (
                <div key={st.loja}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-zinc-700">{st.loja}</span>
                    <span className="font-bold text-brand-black font-mono">{formatBRL(st.total)}</span>
                  </div>
                  <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${share}%`, backgroundColor: STORE_COLORS[i] }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1 text-zinc-400">
                    <span>Casa: {formatBRL(st.casa, true)}</span>
                    <span>Del: {formatBRL(st.delivery, true)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Radar */}
        <div className="chart-card">
          <h3 className="section-title mb-1">Padrão por Dia (Radar)</h3>
          <p className="text-xs text-zinc-400 mb-3">Faturamento acumulado por dia da semana</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#F0F0EC" />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717A' }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              {storeTotals.slice(0, 2).map((st, i) => (
                <Radar
                  key={st.loja}
                  name={st.loja.replace('Quintal ', '')}
                  dataKey={st.loja}
                  stroke={STORE_COLORS[i]}
                  fill={STORE_COLORS[i]}
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              ))}
              <Tooltip formatter={v => formatBRL(v, true)} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
