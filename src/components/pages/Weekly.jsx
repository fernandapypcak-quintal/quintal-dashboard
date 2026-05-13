// src/components/pages/Weekly.jsx
import { useMemo } from 'react';
import {
  ComposedChart, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Cell, LabelList, PieChart, Pie
} from 'recharts';
import { useLabels } from '../../hooks/useLabels';
import { useFilters } from '../../hooks/useFilters';
import { CustomTooltip } from '../ui/ChartTooltip';
import { getWeeklyTotals, getDOWTotals, formatBRL, calcVariation, formatPercent } from '../../utils/formatters';
import KpiCard from '../ui/KpiCard';
import { Calendar, TrendingUp, Home, Truck } from 'lucide-react';


const BRLk = v => v >= 1e6 ? 'R$ '+(v/1e6).toFixed(1).replace('.',',')+'M' : v >= 1e3 ? 'R$ '+(v/1e3).toFixed(0)+'k' : 'R$ '+v.toFixed(0);
function CLabel({ x, y, width, value, showLabels, pct }) {
  if (!showLabels || value === null || value === undefined || value === 0) return null;
  const display = pct ? (value >= 0 ? '+' : '') + value.toFixed(1).replace('.', ',') + '%' : BRLk(value);
  const color = pct ? (value >= 0 ? '#059669' : '#dc2626') : '#52525B';
  return <text x={(x||0)+(width||0)/2} y={pct && value < 0 ? (y||0)+14 : (y||0)-5} textAnchor="middle" fontSize={10} fontWeight={500} fill={color} fontFamily="DM Sans">{display}</text>;
}

export default function Weekly() {
  const { showLabels } = useLabels();
  const { filteredData } = useFilters();

  const weekly = useMemo(() => getWeeklyTotals(filteredData), [filteredData]);
  const dow = useMemo(() => getDOWTotals(filteredData), [filteredData]);

  const last8Weeks = weekly.slice(-8);
  const curWeek  = weekly[weekly.length - 1];
  const prevWeek = weekly[weekly.length - 2];
  const wowVar   = curWeek && prevWeek ? calcVariation(curWeek.total, prevWeek.total) : null;

  const avgWeekly = last8Weeks.length > 0
    ? last8Weeks.reduce((s, w) => s + w.total, 0) / last8Weeks.length
    : 0;

  // Best/worst day
  const bestDOW  = [...dow].sort((a, b) => b.total - a.total)[0];
  const worstDOW = [...dow].filter(d => d.total > 0).sort((a, b) => a.total - b.total)[0];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Semana Atual" value={curWeek?.total || 0} icon={Calendar} accent="#97A624"
          variation={wowVar} variationLabel="vs semana ant." delay={0} />
        <KpiCard title="Média Semanal (8s)" value={avgWeekly} icon={TrendingUp} accent="#D9B504"
          subtitle="últimas 8 semanas" delay={80} />
        <KpiCard title="Melhor Dia" value={bestDOW?.total || 0} icon={Home} accent="#97A624"
          subtitle={bestDOW?.label} delay={160} />
        <KpiCard title="Menor Dia" value={worstDOW?.total || 0} icon={Truck} accent="#8C1414"
          subtitle={worstDOW?.label} delay={240} />
      </div>

      {/* Weekly bars */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="section-title">Histórico Semanal</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Casa vs Delivery por semana</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Média 8 semanas</p>
            <p className="text-sm font-bold font-display text-brand-black">{formatBRL(avgWeekly, true)}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={last8Weeks} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avgWeekly} stroke="#D9B504" strokeDasharray="5 5" strokeWidth={1.5} />
            <Bar dataKey="casa" name="Casa" fill="#97A624" stackId="a">
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} pct={false} />} />
            </Bar>
            <Bar dataKey="delivery" name="Delivery" fill="#D9B504" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={48}>
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} pct={false} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* DOW heatmap-style bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-card">
          <h3 className="section-title mb-1">Padrão por Dia da Semana</h3>
          <p className="text-xs text-zinc-400 mb-5">Total acumulado por dia</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dow} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" horizontal={false} />
              <XAxis type="number" tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#52525B' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="casa" name="Casa" fill="#97A624" stackId="a">
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} pct={false} />} />
            </Bar>
              <Bar dataKey="delivery" name="Delivery" fill="#D9B504" radius={[0, 4, 4, 0]} stackId="a">
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} pct={false} />} />
            </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Week comparison table */}
        <div className="chart-card overflow-auto">
          <h3 className="section-title mb-4">Últimas 8 Semanas</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="table-header text-left py-2 pr-3">Semana</th>
                <th className="table-header text-right py-2 px-3">Casa</th>
                <th className="table-header text-right py-2 px-3">Delivery</th>
                <th className="table-header text-right py-2 pl-3">Total</th>
                <th className="table-header text-right py-2 pl-3">WoW</th>
              </tr>
            </thead>
            <tbody>
              {last8Weeks.map((w, i) => {
                const prev = last8Weeks[i - 1];
                const v = prev ? calcVariation(w.total, prev.total) : null;
                return (
                  <tr key={w.key} className="border-b border-surface-border/50 hover:bg-surface-muted/40 transition-colors">
                    <td className="py-2.5 pr-3 text-xs font-medium text-zinc-600">{w.label}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-mono">{formatBRL(w.casa, true)}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-mono">{formatBRL(w.delivery, true)}</td>
                    <td className="py-2.5 pl-3 text-right text-xs font-semibold">{formatBRL(w.total, true)}</td>
                    <td className="py-2.5 pl-3 text-right">
                      {v !== null ? (
                        <span className={`text-xs font-semibold ${v >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatPercent(v)}
                        </span>
                      ) : <span className="text-zinc-300 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
