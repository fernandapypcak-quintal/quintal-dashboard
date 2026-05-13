// src/components/pages/Overview.jsx
import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, Truck, Home, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import KpiCard from '../ui/KpiCard';
import { BigProgressBar } from '../ui/GoalProgress';
import { CustomTooltip } from '../ui/ChartTooltip';
import {
  sumValues, getMonthlyTotals, getDOWTotals, calcVariation,
  formatBRL, formatPercentPlain, formatPercent
} from '../../utils/formatters';

const COLORS = { casa: '#97A624', delivery: '#D9B504' };

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

// Mini spark bar inside trend strip
function MiniBar({ pct }) {
  const color = pct > 0 ? '#97A624' : pct < 0 ? '#8C1414' : '#D4D4D0';
  const h = Math.min(Math.abs(pct) * 1.2, 32);
  return (
    <div className="flex items-end justify-center" style={{ height: 36 }}>
      <div className="w-1.5 rounded-t-sm" style={{ height: h, backgroundColor: color, minHeight: 3 }} />
    </div>
  );
}

export default function Overview() {
  const { filteredData, rawData } = useFilters();
  const { getMetaTotal } = useMetas();

  const lojas = useMemo(() => [...new Set(rawData.map(r => r.Loja))].sort(), [rawData]);

  // ── Core stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = sumValues(filteredData);
    const casa  = sumValues(filteredData.filter(r => r.Canal === 'CASA'));
    const del   = sumValues(filteredData.filter(r => r.Canal === 'DELIVERY'));

    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const curKey  = allMonths[allMonths.length - 1];
    const prevKey = allMonths[allMonths.length - 2];
    const curMonth  = rawData.filter(r => r.Ano_Mes === curKey);
    const prevMonth = rawData.filter(r => r.Ano_Mes === prevKey);
    const momVar = calcVariation(sumValues(curMonth), sumValues(prevMonth));

    // YoY
    const allYears = [...new Set(rawData.map(r => r.Ano))].sort();
    const yoyVar = calcVariation(
      sumValues(rawData.filter(r => r.Ano === allYears[allYears.length - 1])),
      sumValues(rawData.filter(r => r.Ano === allYears[allYears.length - 2]))
    );

    return {
      total, casa, del, momVar, yoyVar, curKey,
      pctCasa: total > 0 ? (casa / total * 100) : 0,
      pctDel:  total > 0 ? (del  / total * 100) : 0,
    };
  }, [filteredData, rawData]);

  // ── YoY card: current month vs same month last year (adjusted to same day) ──
  const yoyCard = useMemo(() => {
    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const curKey = allMonths[allMonths.length - 1];
    if (!curKey) return null;

    const [curYearStr, curMesStr] = curKey.split('-');
    const curYear = Number(curYearStr);
    const curMes  = Number(curMesStr);

    // Latest day in current month
    const curMonthRecs = rawData.filter(r => r.Ano_Mes === curKey);
    if (!curMonthRecs.length) return null;
    const lastDay = Math.max(...curMonthRecs.map(r => r.Dia));

    // Same month previous year, cut to same day
    const prevYear = curYear - 1;
    const prevMonthRecs = rawData.filter(r =>
      r.Ano === prevYear && r.Mes === curMes && r.Dia <= lastDay
    );

    const curTotal  = sumValues(curMonthRecs);
    const prevTotal = sumValues(prevMonthRecs);
    const variation = calcVariation(curTotal, prevTotal);

    const mesLabel = curMonthRecs[0]?.Mes_Nome || '';

    return {
      curLabel:  `${mesLabel}/${String(curYear).slice(2)}`,
      prevLabel: `${mesLabel}/${String(prevYear).slice(2)}`,
      curTotal, prevTotal, variation,
      lastDay,
      pct: prevTotal > 0 ? (curTotal / prevTotal * 100) : null,
    };
  }, [rawData]);

  // ── Last 4 months trend strip ─────────────────────────────────
  const trendStrip = useMemo(() => {
    const monthly = getMonthlyTotals(filteredData);
    const last4   = monthly.slice(-4);
    return last4.map((m, i, arr) => {
      const prev = arr[i - 1];
      const mom  = prev ? calcVariation(m.total, prev.total) : null;
      // YoY for this month
      const sameMonthPrevYear = rawData.filter(r => r.Ano === m.ano - 1 && r.Mes === m.mes);
      const yoy = calcVariation(m.total, sumValues(sameMonthPrevYear));
      return { ...m, mom, yoy };
    });
  }, [filteredData, rawData]);

  // ── Meta do mês atual ─────────────────────────────────────────
  const metaMesAtual = useMemo(() => {
    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const key = allMonths[allMonths.length - 1];
    if (!key) return null;
    const meta = getMetaTotal(key, lojas);
    if (!meta) return null;
    const real  = sumValues(rawData.filter(r => r.Ano_Mes === key));
    const label = rawData.find(r => r.Ano_Mes === key)?.Ano_Mes_Label || key;
    return { meta, real, label };
  }, [stats.curKey, lojas, getMetaTotal, rawData]);

  const monthlyData = useMemo(() => getMonthlyTotals(filteredData).slice(-18), [filteredData]);
  const dowData     = useMemo(() => getDOWTotals(filteredData), [filteredData]);
  const pieData = [
    { name: 'Casa',     value: stats.casa },
    { name: 'Delivery', value: stats.del  },
  ];

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Faturamento Total" value={stats.total} icon={DollarSign} accent="#97A624"
          variation={stats.momVar} variationLabel="vs mês anterior" delay={0} />
        <KpiCard title="Casa"     value={stats.casa} icon={Home}  accent="#8C1414"
          subtitle={`${formatPercentPlain(stats.pctCasa)} do total`} delay={80} />
        <KpiCard title="Delivery" value={stats.del}  icon={Truck} accent="#D9B504"
          subtitle={`${formatPercentPlain(stats.pctDel)} do total`} delay={160} />
        <KpiCard title="Crescimento YoY" value={stats.yoyVar} format="percent"
          icon={TrendingUp} accent="#97A624"
          variation={stats.yoyVar} variationLabel="ano corrente vs anterior" delay={240} />
      </div>

      {/* ── YoY card + Tendência strip ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* YoY card — mês atual vs mesmo mês ano anterior */}
        {yoyCard && (
          <div className="bg-white border border-surface-border rounded-2xl p-5 animate-slide-up"
            style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Mês Atual vs Ano Anterior
              </span>
            </div>

            {/* Current month */}
            <div className="mb-3">
              <p className="text-xs text-zinc-400 mb-1">{yoyCard.curLabel} <span className="text-zinc-300">(até dia {yoyCard.lastDay})</span></p>
              <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(yoyCard.curTotal, true)}</p>
            </div>

            {/* Progress bar vs prev year */}
            {yoyCard.pct !== null && (
              <div className="mb-3">
                <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(yoyCard.pct, 100)}%`,
                      backgroundColor: yoyCard.pct >= 100 ? '#059669' : yoyCard.pct >= 80 ? '#D97706' : '#97A624'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Previous year */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">{yoyCard.prevLabel} (mesmo período)</p>
                <p className="text-sm font-semibold text-zinc-500">{formatBRL(yoyCard.prevTotal, true)}</p>
              </div>
              {yoyCard.variation !== null && (
                <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-xl ${
                  yoyCard.variation >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                }`}>
                  {yoyCard.variation >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                  {formatPercent(yoyCard.variation)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tendência — últimos 4 meses */}
        <div
          className="lg:col-span-2 bg-white border border-surface-border rounded-2xl p-5 animate-slide-up"
          style={{ animationDelay: '150ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tendência — Últimos 4 Meses
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {trendStrip.map((m, i) => {
              const momColor  = m.mom  === null ? '#A1A1AA' : m.mom  >= 0 ? '#059669' : '#dc2626';
              const yoyColor  = m.yoy  === null ? '#A1A1AA' : m.yoy  >= 0 ? '#059669' : '#dc2626';
              const isLatest  = i === trendStrip.length - 1;
              return (
                <div
                  key={m.key}
                  className={`rounded-xl p-3 transition-all ${
                    isLatest ? 'bg-brand-black text-white' : 'bg-surface-muted'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-2 ${isLatest ? 'text-zinc-400' : 'text-zinc-400'}`}>
                    {m.label}
                    {isLatest && <span className="ml-1 text-[10px] text-amber-400">atual</span>}
                  </p>
                  <p className={`text-base font-bold font-display mb-3 ${isLatest ? 'text-white' : 'text-brand-black'}`}>
                    {formatBRL(m.total, true)}
                  </p>
                  <div className="space-y-1.5">
                    {/* MoM */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] ${isLatest ? 'text-zinc-500' : 'text-zinc-400'}`}>MoM</span>
                      {m.mom !== null ? (
                        <span className="text-[11px] font-semibold" style={{ color: isLatest ? (m.mom >= 0 ? '#86efac' : '#fca5a5') : momColor }}>
                          {m.mom >= 0 ? '▲' : '▼'} {Math.abs(m.mom).toFixed(1).replace('.', ',')}%
                        </span>
                      ) : <span className="text-[10px] text-zinc-300">—</span>}
                    </div>
                    {/* YoY */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] ${isLatest ? 'text-zinc-500' : 'text-zinc-400'}`}>YoY</span>
                      {m.yoy !== null ? (
                        <span className="text-[11px] font-semibold" style={{ color: isLatest ? (m.yoy >= 0 ? '#86efac' : '#fca5a5') : yoyColor }}>
                          {m.yoy >= 0 ? '▲' : '▼'} {Math.abs(m.yoy).toFixed(1).replace('.', ',')}%
                        </span>
                      ) : <span className="text-[10px] text-zinc-300">—</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Meta do mês atual ── */}
      {metaMesAtual && (
        <BigProgressBar
          label={`Meta — ${metaMesAtual.label}`}
          sublabel="Progresso do mês mais recente"
          realizado={metaMesAtual.real}
          meta={metaMesAtual.meta}
          delay={200}
        />
      )}

      {/* ── Monthly area chart ── */}
      <div className="chart-card animate-slide-up" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
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
        <ResponsiveContainer width="100%" height={260}>
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

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="chart-card lg:col-span-2 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <h3 className="section-title mb-1">Por Dia da Semana</h3>
          <p className="text-xs text-zinc-400 mb-5">Volume acumulado por dia</p>
          <ResponsiveContainer width="100%" height={200}>
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
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
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
