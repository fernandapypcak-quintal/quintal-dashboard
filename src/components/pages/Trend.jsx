// src/components/pages/Trend.jsx
import { useMemo } from 'react';
import {
  ComposedChart, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Cell, LabelList, PieChart, Pie
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';
import { useLabels } from '../../hooks/useLabels';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { CustomTooltip } from '../ui/ChartTooltip';
import { AtingBadge } from '../ui/GoalProgress';
import {
  getMonthlyTotals, sumValues, groupBy,
  formatBRL, formatPercent, calcVariation
} from '../../utils/formatters';

// Days in a month
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

const DOW_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const DOW_ABREV  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];


const BRLk = v => v >= 1e6 ? 'R$ '+(v/1e6).toFixed(1).replace('.',',')+'M' : v >= 1e3 ? 'R$ '+(v/1e3).toFixed(0)+'k' : 'R$ '+v.toFixed(0);
function CLabel({ x, y, width, value, showLabels, pct }) {
  if (!showLabels || value === null || value === undefined || value === 0) return null;
  const display = pct ? (value >= 0 ? '+' : '') + value.toFixed(1).replace('.', ',') + '%' : BRLk(value);
  const color = pct ? (value >= 0 ? '#059669' : '#dc2626') : '#52525B';
  return <text x={(x||0)+(width||0)/2} y={pct && value < 0 ? (y||0)+14 : (y||0)-5} textAnchor="middle" fontSize={10} fontWeight={500} fill={color} fontFamily="DM Sans">{display}</text>;
}

export default function Trend() {
  const { showLabels } = useLabels();
  const { filteredData, rawData } = useFilters();
  const { getMeta } = useMetas();

  // ── Período atual (último mês com dados) ────────────────────────
  const periodoInfo = useMemo(() => {
    if (!filteredData.length) return null;
    const meses = [...new Set(filteredData.map(r => r.Ano_Mes))].sort();
    const latestKey = meses[meses.length - 1];
    const [anoStr, mesStr] = latestKey.split('-');
    const ano = Number(anoStr);
    const mes = Number(mesStr);
    const recsLatest = filteredData.filter(r => r.Ano_Mes === latestKey);
    const lastDay = Math.max(...recsLatest.map(r => r.Dia));
    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const isIncomplete = latestKey === allMonths[allMonths.length - 1];
    const label = recsLatest[0]?.Ano_Mes_Label || latestKey;
    const totalDays = daysInMonth(ano, mes);
    return { latestKey, ano, mes, lastDay, isIncomplete, label, totalDays };
  }, [filteredData, rawData]);

  // ── Dados mensais com corte e YoY ──────────────────────────────
  const monthly = useMemo(() => {
    const data = getMonthlyTotals(filteredData);
    return data.map((d, i, arr) => {
      const prev = arr[i - 1];
      // MoM com corte se mês incompleto
      let growth = null;
      if (prev && periodoInfo?.isIncomplete && d.key === periodoInfo.latestKey) {
        const prevCut = sumValues(filteredData.filter(r =>
          r.Ano_Mes === prev.key && r.Dia <= periodoInfo.lastDay
        ));
        growth = calcVariation(d.total, prevCut);
      } else if (prev) {
        growth = calcVariation(d.total, prev.total);
      }
      // YoY com corte
      const prevYearRecs = rawData.filter(r =>
        r.Ano === d.ano - 1 && r.Mes === d.mes &&
        (!(periodoInfo?.isIncomplete && d.key === periodoInfo.latestKey) || r.Dia <= periodoInfo.lastDay)
      );
      const yoy = calcVariation(d.total, sumValues(prevYearRecs));
      return { ...d, growth, yoy };
    });
  }, [filteredData, rawData, periodoInfo]);

  const last12 = monthly.slice(-12);
  const avgMonthly = last12.length > 0
    ? last12.reduce((s, d) => s + d.total, 0) / last12.length : 0;
  const withMA = last12.map((d, i, arr) => ({
    ...d,
    ma3: i >= 2 ? (arr[i].total + arr[i-1].total + arr[i-2].total) / 3 : null,
  }));

  // ── Projeção do mês atual ───────────────────────────────────────
  const projecao = useMemo(() => {
    if (!periodoInfo?.isIncomplete) return null;
    const { latestKey, ano, mes, lastDay, totalDays, label } = periodoInfo;
    const recsAtual = filteredData.filter(r => r.Ano_Mes === latestKey);
    const realizado = sumValues(recsAtual);
    const mediaDiaria = lastDay > 0 ? realizado / lastDay : 0;
    const projetado   = mediaDiaria * totalDays;

    // Mesmo mês ano anterior (mês cheio)
    const prevYearTotal = sumValues(rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes));
    const tendVsAA = calcVariation(projetado, prevYearTotal);

    // Por loja
    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();
    const totalAtual = realizado || 1;
    const porLoja = lojas.map(loja => {
      const lojaRecs   = recsAtual.filter(r => r.Loja === loja);
      const lojaReal   = sumValues(lojaRecs);
      const peso       = lojaReal / totalAtual;
      const tendFat    = projetado * peso;
      const prevAA     = sumValues(rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes && r.Loja === loja));
      const tendVsAALoja = calcVariation(tendFat, prevAA);
      return { loja, lojaReal, peso, tendFat, prevAA, tendVsAALoja };
    }).sort((a, b) => b.tendFat - a.tendFat);

    return {
      realizado, mediaDiaria, projetado, prevYearTotal,
      tendVsAA, lastDay, totalDays, label, porLoja,
    };
  }, [filteredData, rawData, periodoInfo]);

  // ── Média por dia da semana — atual vs ano anterior ─────────────
  const dowComparativo = useMemo(() => {
    if (!periodoInfo) return [];
    const { ano, mes, lastDay } = periodoInfo;

    // Dias do mês atual até o corte
    const recsAtual = filteredData.filter(r => r.Ano_Mes === periodoInfo.latestKey);
    // Dias do mesmo mês ano anterior até o mesmo corte
    const recsAnt   = rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes && r.Dia <= lastDay);

    return DOW_LABELS.map((label, dowIdx) => {
      // Filtra por dia da semana (Dia_Semana_Num: 0=Seg..6=Dom)
      const cur  = recsAtual.filter(r => r.Dia_Semana_Num === dowIdx);
      const prev = recsAnt.filter(r => r.Dia_Semana_Num === dowIdx);

      // Quantas ocorrências desse dia no período
      const diasCur  = [...new Set(cur.map(r => r.Data))].length;
      const diasPrev = [...new Set(prev.map(r => r.Data))].length;

      const mediaCur  = diasCur  > 0 ? sumValues(cur)  / diasCur  : 0;
      const mediaPrev = diasPrev > 0 ? sumValues(prev) / diasPrev : 0;
      const variacao  = calcVariation(mediaCur, mediaPrev);

      return {
        label: DOW_ABREV[dowIdx],
        labelFull: label,
        mediaCur, mediaPrev, variacao,
        diasCur, diasPrev,
      };
    });
  }, [filteredData, rawData, periodoInfo]);

  if (!periodoInfo) return null;

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* Aviso de corte */}
      {periodoInfo.isIncomplete && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Calendar size={13} className="flex-shrink-0" />
          <span>
            <strong>{periodoInfo.label}</strong> está incompleto — comparações cortadas no dia <strong>{periodoInfo.lastDay}</strong>.
            Projeção baseada na média diária atual × {periodoInfo.totalDays} dias do mês.
          </span>
        </div>
      )}

      {/* KPI strip — últimos 4 meses */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {last12.slice(-4).map((m) => {
          const isLast = m.key === periodoInfo.latestKey;
          return (
            <div key={m.key} className="kpi-card">
              <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5">
                {m.label}
                {isLast && periodoInfo.isIncomplete && (
                  <span className="text-[10px] text-amber-600 font-semibold">dia {periodoInfo.lastDay}</span>
                )}
              </p>
              <p className="text-xl font-bold font-display text-brand-black">{formatBRL(m.total, true)}</p>
              <div className="mt-2 space-y-1">
                {m.growth !== null && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${m.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.growth >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                    {formatPercent(m.growth)} MoM{isLast && periodoInfo.isIncomplete ? '*' : ''}
                  </div>
                )}
                {m.yoy !== null && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${m.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.yoy >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                    {formatPercent(m.yoy)} YoY{isLast && periodoInfo.isIncomplete ? '*' : ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Linha de tendência mensal + MA */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="section-title">Tendência Mensal</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Total + média móvel 3 meses</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Média 12M</p>
            <p className="text-sm font-bold text-brand-black font-display">{formatBRL(avgMonthly, true)}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={withMA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#97A624" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#97A624" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avgMonthly} stroke="#D9B504" strokeDasharray="5 5" strokeWidth={1.5} />
            <Area type="monotone" dataKey="total" name="Total" fill="url(#gradTotal)" stroke="#97A624" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="ma3" name="Média 3M" stroke="#8C1414" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MoM e YoY lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crescimento MoM */}
        <div className="chart-card">
          <h3 className="section-title mb-1">Crescimento Mês a Mês (MoM)</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Variação % vs mês anterior{periodoInfo.isIncomplete ? ` — mês atual cortado no dia ${periodoInfo.lastDay}` : ''}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={withMA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v?.toFixed(0)}%`} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={42} />
              <Tooltip formatter={v => v != null ? `${v.toFixed(1)}%` : '—'} />
              <ReferenceLine y={0} stroke="#E4E4E0" strokeWidth={1.5} />
              <Bar dataKey="growth" name="MoM %" radius={[3,3,0,0]} maxBarSize={28}>
                {withMA.map((d, i) => (
                  <Cell key={i} fill={d.growth === null ? 'transparent' : d.growth >= 0 ? '#97A624' : '#8C1414'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* YoY mensal */}
        <div className="chart-card">
          <h3 className="section-title mb-1">Crescimento Ano a Ano (YoY)</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Variação % vs mesmo mês do ano anterior{periodoInfo.isIncomplete ? ` — cortado no dia ${periodoInfo.lastDay}` : ''}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={withMA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v?.toFixed(0)}%`} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={42} />
              <Tooltip formatter={v => v != null ? `${v.toFixed(1)}%` : '—'} />
              <ReferenceLine y={0} stroke="#E4E4E0" strokeWidth={1.5} />
              <Bar dataKey="yoy" name="YoY %" radius={[3,3,0,0]} maxBarSize={28}>
                {withMA.map((d, i) => (
                  <Cell key={i} fill={d.yoy === null ? 'transparent' : d.yoy >= 0 ? '#97A624' : '#8C1414'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Média por dia da semana — atual vs ano anterior */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="section-title">Média por Dia da Semana</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Média de faturamento por dia — {periodoInfo.label} vs mesmo período {periodoInfo.ano - 1}
              {periodoInfo.isIncomplete && ` (até dia ${periodoInfo.lastDay})`}
            </p>
          </div>
        </div>

        {/* Gráfico */}
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dowComparativo} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = dowComparativo.find(x => x.label === label);
                return (
                  <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[180px]">
                    <p className="text-xs font-semibold text-zinc-500 mb-2 pb-2 border-b border-surface-border">{d?.labelFull}</p>
                    {payload.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-4 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                          <span className="text-xs text-zinc-600">{p.name}</span>
                        </div>
                        <span className="text-xs font-semibold">{formatBRL(p.value, true)}</span>
                      </div>
                    ))}
                    {d?.variacao !== null && (
                      <div className={`mt-2 pt-2 border-t border-surface-border text-xs font-semibold ${d.variacao >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {d.variacao >= 0 ? '▲' : '▼'} {Math.abs(d.variacao).toFixed(1).replace('.', ',')}% vs ano anterior
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="mediaPrev" name={`Média ${periodoInfo.ano - 1}`} fill="#E8E8E2" radius={[3,3,0,0]} maxBarSize={28}>
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} pct={false} />} />
            </Bar>
            <Bar dataKey="mediaCur"  name={`Média ${periodoInfo.ano}`}     fill="#97A624" radius={[3,3,0,0]} maxBarSize={28}>
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} pct={false} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tabela resumo */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="table-header text-left py-2 pr-4">Dia</th>
                <th className="table-header text-right py-2 px-4">Média {periodoInfo.ano - 1}</th>
                <th className="table-header text-right py-2 px-4">Média {periodoInfo.ano}</th>
                <th className="table-header text-right py-2 pl-4">Variação</th>
              </tr>
            </thead>
            <tbody>
              {dowComparativo.map(d => (
                <tr key={d.label} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-brand-black">{d.labelFull}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm text-zinc-400">{formatBRL(d.mediaPrev)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm font-semibold text-brand-black">{formatBRL(d.mediaCur)}</td>
                  <td className="py-2.5 pl-4 text-right">
                    {d.variacao !== null ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.variacao >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                        {d.variacao >= 0 ? '▲' : '▼'} {Math.abs(d.variacao).toFixed(1).replace('.', ',')}%
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projeção do mês + Tend por loja */}
      {projecao && (
        <>
          {/* Card de projeção geral */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-surface-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target size={14} className="text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Projeção {projecao.label}
                </span>
              </div>
              <p className="text-2xl font-bold font-display text-brand-black mb-1">
                {formatBRL(projecao.projetado, true)}
              </p>
              <p className="text-xs text-zinc-400 mb-4">
                Média R${formatBRL(projecao.mediaDiaria, true)}/dia × {projecao.totalDays} dias
              </p>
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Realizado (dia {projecao.lastDay})</span>
                  <span className="font-semibold">{formatBRL(projecao.realizado, true)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Mesmo mês {periodoInfo.ano - 1}</span>
                  <span className="font-semibold">{formatBRL(projecao.prevYearTotal, true)}</span>
                </div>
                <div className="pt-2 border-t border-surface-border flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-medium">Tend vs AA</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                    projecao.tendVsAA >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                  }`}>
                    {projecao.tendVsAA >= 0 ? '▲' : '▼'} {Math.abs(projecao.tendVsAA).toFixed(1).replace('.', ',')}%
                  </span>
                </div>
              </div>
            </div>

            {/* Barras de projeção por loja */}
            <div className="lg:col-span-2 bg-white border border-surface-border rounded-2xl p-5">
              <h3 className="section-title mb-1">Tend Fat — Projeção por Loja</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Peso atual × projeção total · vs mesmo mês {periodoInfo.ano - 1}
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={projecao.porLoja}
                  layout="vertical"
                  margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="loja" tick={{ fontSize: 11, fill: '#52525B' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[200px]">
                          <p className="text-xs font-semibold text-zinc-700 mb-2">{d.loja}</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-4"><span className="text-zinc-400">Tend Fat</span><span className="font-semibold">{formatBRL(d.tendFat)}</span></div>
                            <div className="flex justify-between gap-4"><span className="text-zinc-400">Mesmo mês AA</span><span className="font-semibold">{formatBRL(d.prevAA)}</span></div>
                            <div className="flex justify-between gap-4"><span className="text-zinc-400">Peso atual</span><span className="font-semibold">{(d.peso * 100).toFixed(1)}%</span></div>
                            <div className={`flex justify-between gap-4 pt-1 border-t border-surface-border font-bold ${d.tendVsAALoja >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              <span>Tend vs AA</span>
                              <span>{d.tendVsAALoja >= 0 ? '▲' : '▼'} {Math.abs(d.tendVsAALoja ?? 0).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="tendFat" name="Tend Fat" radius={[0,4,4,0]} maxBarSize={22}>
                    {projecao.porLoja.map((d, i) => (
                      <Cell key={i} fill={d.tendVsAALoja !== null && d.tendVsAALoja >= 0 ? '#97A624' : '#8C1414'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Tend por loja */}
          <div className="chart-card overflow-x-auto">
            <h3 className="section-title mb-4">Detalhe da Projeção por Loja — {projecao.label}</h3>
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header text-left py-2 pr-4">Loja</th>
                  <th className="table-header text-right py-2 px-4">Realizado (dia {projecao.lastDay})</th>
                  <th className="table-header text-right py-2 px-4">Peso Atual</th>
                  <th className="table-header text-right py-2 px-4">Tend Fat {periodoInfo.ano}</th>
                  <th className="table-header text-right py-2 px-4">Mesmo mês {periodoInfo.ano - 1}</th>
                  <th className="table-header text-right py-2 pl-4">Tend vs AA</th>
                </tr>
              </thead>
              <tbody>
                {projecao.porLoja.map(d => (
                  <tr key={d.loja} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-brand-black">{d.loja}</td>
                    <td className="py-3 px-4 text-right font-mono text-sm">{formatBRL(d.lojaReal)}</td>
                    <td className="py-3 px-4 text-right text-sm">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-surface-muted rounded-full text-zinc-600">
                        {(d.peso * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-brand-black">{formatBRL(d.tendFat)}</td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-zinc-400">{formatBRL(d.prevAA)}</td>
                    <td className="py-3 pl-4 text-right">
                      {d.tendVsAALoja !== null ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.tendVsAALoja >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                          {d.tendVsAALoja >= 0 ? '▲' : '▼'} {Math.abs(d.tendVsAALoja).toFixed(1).replace('.', ',')}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-border bg-surface-muted/30">
                  <td className="py-3 pr-4 text-xs font-semibold text-zinc-500 uppercase">Total</td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-bold">{formatBRL(projecao.realizado)}</td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-zinc-400">100%</td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-bold text-brand-black">{formatBRL(projecao.projetado)}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-zinc-400">{formatBRL(projecao.prevYearTotal)}</td>
                  <td className="py-3 pl-4 text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${projecao.tendVsAA >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                      {projecao.tendVsAA >= 0 ? '▲' : '▼'} {Math.abs(projecao.tendVsAA).toFixed(1).replace('.', ',')}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
