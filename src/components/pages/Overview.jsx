// src/components/pages/Overview.jsx
import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, Truck, Home, TrendingUp } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import KpiCard from '../ui/KpiCard';
import { CustomTooltip } from '../ui/ChartTooltip';
import {
  sumValues, getMonthlyTotals, getDOWTotals, calcVariation,
  formatBRL, formatPercentPlain
} from '../../utils/formatters';

const COLORS = { casa: '#97A624', delivery: '#D9B504', total: '#0D0D0D' };

const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
}

export default function Overview() {
  const { filteredData, rawData } = useFilters();

  const stats = useMemo(() => {
    const total = sumValues(filteredData);
    const casa  = sumValues(filteredData.filter(r => r.Canal === 'CASA'));
    const del   = sumValues(filteredData.filter(r => r.Canal === 'DELIVERY'));

    // Use the latest month present in rawData as "current"
    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const curKey  = allMonths[allMonths.length - 1];
    const prevKey = allMonths[allMonths.length - 2];
    const curMonth  = rawData.filter(r => r.Ano_Mes === curKey);
    const prevMonth = rawData.filter(r => r.Ano_Mes === prevKey);
    const momVar = calcVariation(sumValues(curMonth), sumValues(prevMonth));

    // YoY: latest year vs previous year
    const allYears = [...new Set(rawData.map(r => r.Ano))].sort();
    const curYear  = allYears[allYears.length - 1];
    const prevYear = allYears[allYears.length - 2];
    const curYearRecs  = rawData.filter(r => r.Ano === curYear);
    const prevYearRecs = rawData.filter(r => r.Ano === prevYear);
    const yoyVar = calcVariation(sumValues(curYearRecs), sumValues(prevYearRecs));

    return {
      total, casa, del, momVar, yoyVar,
      pctCasa: total > 0 ? (casa / total * 100) : 0,
      pctDel:  total > 0 ? (del  / total * 100) : 0,
      curKey,
    };
  }, [filteredData, rawData]);

  const monthlyData = useMemo(() => getMonthlyTotals(filteredData).slice(-18), [filteredData]);
  const dowData     = useMemo(() => getDOWTotals(filteredData), [filteredData]);
  const pieData = [
    { name: 'Casa',     value: stats.casa },
    { name: 'Delivery', value: stats.del  },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Faturamento Total"  value={stats.total} icon={DollarSign} accent="#97A624"
          variation={stats.momVar} variationLabel="vs mês anterior" delay={0} />
        <KpiCard title="Casa"    value={stats.casa} icon={Home}     accent="#8C1414"
          subtitle={`${formatPercentPlain(stats.pctCasa)} do total`} delay={80} />
        <KpiCard title="Delivery" value={stats.del} icon={Truck}    accent="#D9B504"
          subtitle={`${formatPercentPlain(stats.pctDel)} do total`} delay={160} />
        <KpiCard title="Crescimento YoY" value={stats.yoyVar} format="percent"
          icon={TrendingUp} accent="#97A624"
          variation={stats.yoyVar} variationLabel="ano corrente vs anterior" delay={240} />
      </div>

      {/* Monthly area chart */}
      <div className="chart-card animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="section-title">Faturamento Mensal</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Casa vs Delivery por mês</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-3 h-0.5 rounded-full bg-brand-olive inline-block" />Casa
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#D9B504' }} />Delivery
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCasa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#97A624" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#97A624" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#D9B504" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#D9B504" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="casa"     name="Casa"     stroke="#97A624" strokeWidth={2} fill="url(#gradCasa)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="delivery" name="Delivery" stroke="#D9B504" strokeWidth={2} fill="url(#gradDel)"  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="chart-card lg:col-span-2 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <h3 className="section-title mb-1">Por Dia da Semana</h3>
          <p className="text-xs text-zinc-400 mb-5">Volume acumulado por dia</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dowData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="casa"     name="Casa"     fill="#97A624" radius={[4,4,0,0]} maxBarSize={32} />
              <Bar dataKey="delivery" name="Delivery" fill="#D9B504" radius={[4,4,0,0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card flex flex-col animate-slide-up" style={{ animationDelay: '260ms', animationFillMode: 'both' }}>
          <h3 className="section-title mb-1">Mix de Canal</h3>
          <p className="text-xs text-zinc-400 mb-3">Participação % por canal</p>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value" labelLine={false} label={PieLabel}>
                  <Cell fill={COLORS.casa} />
                  <Cell fill={COLORS.delivery} />
                </Pie>
                <Tooltip formatter={(v) => formatBRL(v, true)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: i === 0 ? COLORS.casa : COLORS.delivery }} />
                  <span className="text-xs text-zinc-600">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-brand-black">{formatBRL(item.value, true)}</span>
                  <span className="text-xs text-zinc-400 ml-1.5">
                    {stats.total > 0 ? formatPercentPlain(item.value / stats.total * 100) : '0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
