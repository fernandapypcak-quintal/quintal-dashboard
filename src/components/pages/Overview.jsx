// src/components/pages/Overview.jsx
import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, Truck, Home, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
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

// Dado um conjunto de registros, retorna o último dia com dados
function lastDayOf(recs) {
  if (!recs.length) return null;
  return Math.max(...recs.map(r => r.Dia));
}

export default function Overview() {
  const { filteredData, rawData } = useFilters();
  const { getMetaTotal } = useMetas();
  const lojas = useMemo(() => [...new Set(rawData.map(r => r.Loja))].sort(), [rawData]);

  // ── Detecta o período do filteredData ──────────────────────────
  // Se há filtro de mês, o "período" é esse mês. Senão, é o mês mais recente nos dados filtrados.
  const periodoInfo = useMemo(() => {
    if (!filteredData.length) return null;

    // Meses presentes no filteredData
    const meses = [...new Set(filteredData.map(r => r.Ano_Mes))].sort();
    const latestKey = meses[meses.length - 1];
    const [anoStr, mesStr] = latestKey.split('-');
    const ano = Number(anoStr);
    const mes = Number(mesStr);

    // Registros do mês mais recente no filtro
    const recsLatest = filteredData.filter(r => r.Ano_Mes === latestKey);
    const lastDay = lastDayOf(recsLatest);

    // O mês mais recente em TODO o rawData (para saber se está incompleto)
    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const globalLatestKey = allMonths[allMonths.length - 1];
    const isIncomplete = latestKey === globalLatestKey; // só o último mês global é incompleto

    const label = recsLatest[0]?.Ano_Mes_Label || latestKey;

    return { latestKey, ano, mes, lastDay, isIncomplete, label };
  }, [filteredData, rawData]);

  // ── Stats principais com corte de período correto ──────────────
  const stats = useMemo(() => {
    if (!periodoInfo) return null;
    const { latestKey, mes, lastDay, isIncomplete } = periodoInfo;

    const total = sumValues(filteredData);
    const casa  = sumValues(filteredData.filter(r => r.Canal === 'CASA'));
    const del   = sumValues(filteredData.filter(r => r.Canal === 'DELIVERY'));

    // MoM — mês anterior, cortado no mesmo dia se incompleto
    const meses = [...new Set(filteredData.map(r => r.Ano_Mes))].sort();
    const prevKey = meses[meses.length - 2];
    let momVar = null;
    if (prevKey) {
      const prevRecs = isIncomplete
        ? filteredData.filter(r => r.Ano_Mes === prevKey && r.Dia <= lastDay)
        : filteredData.filter(r => r.Ano_Mes === prevKey);
      momVar = calcVariation(
        sumValues(filteredData.filter(r => r.Ano_Mes === latestKey)),
        sumValues(prevRecs)
      );
    }

    // YoY — mesmo mês ano anterior, cortado no mesmo dia se incompleto
    const { ano } = periodoInfo;
    const prevYearRecs = isIncomplete
      ? rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes && r.Dia <= lastDay)
      : rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes);
    const curMonthRecs = filteredData.filter(r => r.Ano_Mes === latestKey);
    const yoyVar = calcVariation(sumValues(curMonthRecs), sumValues(prevYearRecs));

    // YoY anual (ano cheio vs ano cheio) — para o KPI Crescimento YoY
    const allYears = [...new Set(rawData.map(r => r.Ano))].sort();
    const curYear  = allYears[allYears.length - 1];
    const yoyAnual = calcVariation(
      sumValues(rawData.filter(r => r.Ano === curYear)),
      sumValues(rawData.filter(r => r.Ano === curYear - 1))
    );

    return {
      total, casa, del, momVar, yoyVar, yoyAnual,
      pctCasa: total > 0 ? (casa / total * 100) : 0,
      pctDel:  total > 0 ? (del  / total * 100) : 0,
    };
  }, [filteredData, rawData, periodoInfo]);

  // ── Card YoY — mês atual vs mesmo mês ano anterior ─────────────
  const yoyCard = useMemo(() => {
    if (!periodoInfo) return null;
    const { ano, mes, lastDay, isIncomplete, label } = periodoInfo;
    const latestKey = periodoInfo.latestKey;

    const curTotal  = sumValues(filteredData.filter(r => r.Ano_Mes === latestKey));
    const prevRecs  = rawData.filter(r =>
      r.Ano === ano - 1 && r.Mes === mes &&
      (!isIncomplete || r.Dia <= lastDay)
    );
    const prevTotal = sumValues(prevRecs);
    const variation = calcVariation(curTotal, prevTotal);
    const pct       = prevTotal > 0 ? (curTotal / prevTotal * 100) : null;

    const mesPrevLabel = rawData.find(r => r.Ano === ano - 1 && r.Mes === mes)?.Ano_Mes_Label
      || `${label.split('/')[0]}/${String(ano - 1).slice(2)}`;

    return {
      curLabel: label,
      prevLabel: mesPrevLabel,
      curTotal, prevTotal, variation, pct,
      lastDay, isIncomplete,
    };
  }, [filteredData, rawData, periodoInfo]);

  // ── Faixa de tendência — últimos 4 meses ───────────────────────
  const trendStrip = useMemo(() => {
    const monthly = getMonthlyTotals(filteredData);
    return monthly.slice(-4).map((m, i, arr) => {
      const prev = arr[i - 1];
      const isLast = i === arr.length - 1;

      // MoM — se último mês incompleto, corta anterior no mesmo dia
      let momVar = null;
      if (prev) {
        const curVal = m.total;
        const prevVal = (isLast && periodoInfo?.isIncomplete)
          ? sumValues(filteredData.filter(r => r.Ano_Mes === prev.key && r.Dia <= periodoInfo.lastDay))
          : prev.total;
        momVar = calcVariation(curVal, prevVal);
      }

      // YoY — mesmo mês ano anterior, mesmo corte de dia
      const prevYearRecs = rawData.filter(r =>
        r.Ano === m.ano - 1 && r.Mes === m.mes &&
        (!( isLast && periodoInfo?.isIncomplete) || r.Dia <= periodoInfo?.lastDay)
      );
      const yoy = calcVariation(m.total, sumValues(prevYearRecs));

      return { ...m, mom: momVar, yoy, isLast };
    });
  }, [filteredData, rawData, periodoInfo]);

  // ── Meta ───────────────────────────────────────────────────────
  const metaMesAtual = useMemo(() => {
    if (!periodoInfo) return null;
    const meta = getMetaTotal(periodoInfo.latestKey, lojas);
    if (!meta) return null;
    const real = sumValues(filteredData.filter(r => r.Ano_Mes === periodoInfo.latestKey));
    return { meta, real, label: periodoInfo.label };
  }, [periodoInfo, lojas, getMetaTotal, filteredData]);

  const monthlyData = useMemo(() => getMonthlyTotals(filteredData).slice(-18), [filteredData]);
  const dowData     = useMemo(() => getDOWTotals(filteredData), [filteredData]);
  const pieData = [
    { name: 'Casa',     value: stats?.casa  || 0 },
    { name: 'Delivery', value: stats?.del   || 0 },
  ];

  if (!stats) return null;

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* Aviso de corte quando mês incompleto */}
      {periodoInfo?.isIncomplete && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Calendar size={13} className="flex-shrink-0" />
          <span>
            <strong>{periodoInfo.label}</strong> está incompleto — comparações MoM e YoY cortadas no dia <strong>{periodoInfo.lastDay}</strong> para uma análise justa.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Faturamento Total" value={stats.total} icon={DollarSign} accent="#97A624"
          variation={stats.momVar} variationLabel={periodoInfo?.isIncomplete ? `vs mês ant. (até dia ${periodoInfo.lastDay})` : 'vs mês anterior'} delay={0} />
        <KpiCard title="Casa"     value={stats.casa} icon={Home}  accent="#8C1414"
          subtitle={`${formatPercentPlain(stats.pctCasa)} do total`} delay={80} />
        <KpiCard title="Delivery" value={stats.del}  icon={Truck} accent="#D9B504"
          subtitle={`${formatPercentPlain(stats.pctDel)} do total`} delay={160} />
        <KpiCard title="vs Mesmo Mês Ano Ant." value={stats.yoyVar} format="percent"
          icon={TrendingUp} accent="#97A624"
          variation={stats.yoyVar}
          variationLabel={periodoInfo?.isIncomplete ? `até dia ${periodoInfo.lastDay}` : 'mesmo mês ano anterior'}
          delay={240} />
      </div>

      {/* YoY card + Tendência */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {yoyCard && (
          <div className="bg-white border border-surface-border rounded-2xl p-5 animate-slide-up"
            style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Mês Atual vs Ano Anterior
              </span>
            </div>
            <div className="mb-3">
              <p className="text-xs text-zinc-400 mb-1">
                {yoyCard.curLabel}
                {yoyCard.isIncomplete && (
                  <span className="ml-1.5 text-amber-600">(até dia {yoyCard.lastDay})</span>
                )}
              </p>
              <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(yoyCard.curTotal, true)}</p>
            </div>
            {yoyCard.pct !== null && (
              <div className="mb-3">
                <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(yoyCard.pct, 100)}%`,
                      backgroundColor: yoyCard.pct >= 100 ? '#059669' : yoyCard.pct >= 80 ? '#D97706' : '#97A624'
                    }} />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">
                  {yoyCard.prevLabel}
                  {yoyCard.isIncomplete && ` (até dia ${yoyCard.lastDay})`}
                </p>
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
        <div className="lg:col-span-2 bg-white border border-surface-border rounded-2xl p-5 animate-slide-up"
          style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tendência — Últimos 4 Meses
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {trendStrip.map((m) => {
              const momColor = m.mom === null ? '#A1A1AA' : m.mom >= 0 ? '#059669' : '#dc2626';
              const yoyColor = m.yoy === null ? '#A1A1AA' : m.yoy >= 0 ? '#059669' : '#dc2626';
              return (
                <div key={m.key} className={`rounded-xl p-3 transition-all ${
                  m.isLast ? 'bg-brand-black text-white' : 'bg-surface-muted'
                }`}>
                  <p className="text-xs font-semibold text-zinc-400 mb-2">
                    {m.label}
                    {m.isLast && periodoInfo?.isIncomplete && (
                      <span className="ml-1 text-[10px] text-amber-400">dia {periodoInfo.lastDay}</span>
                    )}
                  </p>
                  <p className={`text-base font-bold font-display mb-3 ${m.isLast ? 'text-white' : 'text-brand-black'}`}>
                    {formatBRL(m.total, true)}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] ${m.isLast ? 'text-zinc-500' : 'text-zinc-400'}`}>MoM</span>
                      {m.mom !== null ? (
                        <span className="text-[11px] font-semibold"
                          style={{ color: m.isLast ? (m.mom >= 0 ? '#86efac' : '#fca5a5') : momColor }}>
                          {m.mom >= 0 ? '▲' : '▼'} {Math.abs(m.mom).toFixed(1).replace('.', ',')}%
                        </span>
                      ) : <span className="text-[10px] text-zinc-300">—</span>}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] ${m.isLast ? 'text-zinc-500' : 'text-zinc-400'}`}>YoY</span>
                      {m.yoy !== null ? (
                        <span className="text-[11px] font-semibold"
                          style={{ color: m.isLast ? (m.yoy >= 0 ? '#86efac' : '#fca5a5') : yoyColor }}>
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

      {/* Meta */}
      {metaMesAtual && (
        <BigProgressBar
          label={`Meta — ${metaMesAtual.label}`}
          sublabel="Progresso do mês mais recente"
          realizado={metaMesAtual.real}
          meta={metaMesAtual.meta}
          delay={200}
        />
      )}

      {/* Gráfico mensal */}
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

      {/* Dia da semana + Mix */}
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
