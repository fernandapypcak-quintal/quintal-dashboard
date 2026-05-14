// src/components/pages/Trend.jsx
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Calendar, Info } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { useLabels } from '../../hooks/useLabels';
import { AtingBadge } from '../ui/GoalProgress';
import {
  getMonthlyTotals, sumValues,
  formatBRL, formatPercent, calcVariation
} from '../../utils/formatters';

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

const DOW_LABELS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const DOW_ABREV  = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

// Tooltip explicativo — aparece ao passar o mouse em cima do ícone (?)
function InfoTip({ text }) {
  return (
    <div className="group relative inline-flex items-center ml-1.5">
      <Info size={12} className="text-zinc-300 hover:text-zinc-500 cursor-help transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50
        bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 w-56 shadow-lg pointer-events-none leading-relaxed">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
      </div>
    </div>
  );
}

const BRLk = v => v >= 1e6 ? 'R$\u00a0'+(v/1e6).toFixed(1).replace('.',',')+'M'
                : v >= 1e3 ? 'R$\u00a0'+(v/1e3).toFixed(0)+'k'
                : 'R$\u00a0'+v.toFixed(0);

function PctLabel({ x, y, width, value, showLabels }) {
  if (!showLabels || value === null || value === undefined) return null;
  const color = value >= 0 ? '#059669' : '#dc2626';
  return (
    <text x={(x||0)+(width||0)/2} y={value >= 0 ? (y||0)-5 : (y||0)+14}
      textAnchor="middle" fontSize={10} fontWeight={600} fill={color} fontFamily="DM Sans">
      {value >= 0 ? '+' : ''}{value.toFixed(1).replace('.', ',')}%
    </text>
  );
}

export default function Trend() {
  const { filteredData, rawData } = useFilters();
  const { getMeta } = useMetas();
  const { showLabels } = useLabels();

  // ── Período atual ──────────────────────────────────────────────
  const periodo = useMemo(() => {
    if (!filteredData.length) return null;
    const meses = [...new Set(filteredData.map(r => r.Ano_Mes))].sort();
    const latestKey = meses[meses.length - 1];
    const [anoStr, mesStr] = latestKey.split('-');
    const ano = Number(anoStr), mes = Number(mesStr);
    const recsLatest = filteredData.filter(r => r.Ano_Mes === latestKey);
    const lastDay = Math.max(...recsLatest.map(r => r.Dia));
    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const isIncomplete = latestKey === allMonths[allMonths.length - 1];
    const label = recsLatest[0]?.Ano_Mes_Label || latestKey;
    const totalDays = daysInMonth(ano, mes);
    return { latestKey, ano, mes, lastDay, isIncomplete, label, totalDays };
  }, [filteredData, rawData]);

  // ── Projeção do mês atual (Tend Fat) ───────────────────────────
  const projecao = useMemo(() => {
    if (!periodo?.isIncomplete) return null;
    const { latestKey, ano, mes, lastDay, totalDays, label } = periodo;
    const recsAtual   = filteredData.filter(r => r.Ano_Mes === latestKey);
    const realizado   = sumValues(recsAtual);
    // Dias com faturamento real (exclui dias sem registro)
    const diasComDados = new Set(recsAtual.map(r => r.Data)).size;
    const mediaDiaria = diasComDados > 0 ? realizado / diasComDados : 0;
    const projetado   = mediaDiaria * totalDays;

    // Mesmo mês ano anterior (mês cheio)
    const prevYearRecs  = rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes);
    const prevYearTotal = sumValues(prevYearRecs);
    const tendVsAA      = calcVariation(projetado, prevYearTotal);

    // Por loja
    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();
    const totalAtual = realizado || 1;
    const porLoja = lojas.map(loja => {
      const lojaRecs = recsAtual.filter(r => r.Loja === loja);
      const lojaReal = sumValues(lojaRecs);
      const peso     = lojaReal / totalAtual;
      const tendFat  = projetado * peso;
      const prevAA   = sumValues(rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes && r.Loja === loja));
      const tendVsAALoja = calcVariation(tendFat, prevAA);
      return { loja, lojaReal, peso, tendFat, prevAA, tendVsAALoja };
    }).sort((a, b) => b.tendFat - a.tendFat);

    return { realizado, mediaDiaria, projetado, prevYearTotal, tendVsAA, lastDay, totalDays, label, porLoja };
  }, [filteredData, rawData, periodo]);

  // ── YoY por mês (barras verde/vermelho) ────────────────────────
  const yoyData = useMemo(() => {
    if (!periodo) return [];
    const { ano, isIncomplete, lastDay } = periodo;

    // Usa só o ano atual nos dados filtrados
    const monthly = getMonthlyTotals(filteredData.filter(r => r.Ano === ano));

    return monthly.map(m => {
      const prevRecs = rawData.filter(r => r.Ano === ano - 1 && r.Mes === m.mes);
      if (!prevRecs.length) return { ...m, yoy: null };

      const prevTotal = (isIncomplete && m.key === periodo.latestKey)
        ? sumValues(rawData.filter(r => r.Ano === ano - 1 && r.Mes === m.mes && r.Dia <= lastDay))
        : sumValues(prevRecs);

      return { ...m, yoy: calcVariation(m.total, prevTotal) };
    }).filter(m => m.yoy !== null);
  }, [filteredData, rawData, periodo]);

  // ── Média por dia da semana ────────────────────────────────────
  const dowComparativo = useMemo(() => {
    if (!periodo) return [];
    const { ano, mes, lastDay, latestKey } = periodo;
    const recsAtual = filteredData.filter(r => r.Ano_Mes === latestKey);
    const recsAnt   = rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes && r.Dia <= lastDay);

    return DOW_LABELS.map((label, dowIdx) => {
      const cur  = recsAtual.filter(r => r.Dia_Semana_Num === dowIdx);
      const prev = recsAnt.filter(r => r.Dia_Semana_Num === dowIdx);
      const diasCur  = [...new Set(cur.map(r => r.Data))].length;
      const diasPrev = [...new Set(prev.map(r => r.Data))].length;
      const mediaCur  = diasCur  > 0 ? sumValues(cur)  / diasCur  : 0;
      const mediaPrev = diasPrev > 0 ? sumValues(prev) / diasPrev : 0;
      return {
        label: DOW_ABREV[dowIdx], labelFull: label,
        mediaCur, mediaPrev,
        variacao: calcVariation(mediaCur, mediaPrev),
        diasCur, diasPrev,
      };
    });
  }, [filteredData, rawData, periodo]);

  if (!periodo) return null;

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* Aviso de corte */}
      {periodo.isIncomplete && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Calendar size={13} className="flex-shrink-0" />
          <span>
            <strong>{periodo.label}</strong> incompleto — comparações YoY cortadas no dia <strong>{periodo.lastDay}</strong>.
            Projeção = média diária × {periodo.totalDays} dias do mês.
          </span>
        </div>
      )}

      {/* ── PROJEÇÃO DO MÊS — ponto principal ── */}
      {projecao && (
        <>
          {/* Card principal de projeção */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-surface-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target size={14} className="text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Projeção {projecao.label}
                </span>
                <InfoTip text="Projeção = média diária até hoje × total de dias do mês. Assume que o ritmo atual se mantém." />
              </div>

              <p className="text-3xl font-bold font-display text-brand-black mb-1">
                {formatBRL(projecao.projetado, true)}
              </p>
              <p className="text-xs text-zinc-400 mb-5">
                {formatBRL(projecao.mediaDiaria, true)}/dia × {projecao.totalDays} dias
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2.5 border-t border-surface-border">
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    Realizado (dia {projecao.lastDay})
                    <InfoTip text="Faturamento acumulado até o último dia com dados neste mês." />
                  </div>
                  <span className="text-sm font-semibold text-brand-black">{formatBRL(projecao.realizado, true)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-t border-surface-border">
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    Mesmo mês {periodo.ano - 1}
                    <InfoTip text="Faturamento total do mesmo mês no ano anterior (mês completo)." />
                  </div>
                  <span className="text-sm font-semibold text-zinc-500">{formatBRL(projecao.prevYearTotal, true)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-t border-surface-border">
                  <div className="flex items-center gap-1 text-xs font-semibold text-zinc-700">
                    Tend vs AA
                    <InfoTip text="Tendência vs Ano Anterior: % de variação entre a projeção do mês atual e o mesmo mês do ano passado." />
                  </div>
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                    projecao.tendVsAA >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                  }`}>
                    {projecao.tendVsAA >= 0 ? '▲' : '▼'} {Math.abs(projecao.tendVsAA).toFixed(1).replace('.', ',')}%
                  </span>
                </div>
              </div>
            </div>

            {/* Gráfico horizontal por loja */}
            <div className="lg:col-span-2 bg-white border border-surface-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="section-title">Tend Fat — Projeção por Loja</h3>
                <InfoTip text="Tend Fat = Peso da loja no faturamento atual × Projeção total do mês. Verde = acima do mesmo mês do ano anterior. Vermelho = abaixo." />
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Peso atual × projeção total · vs mesmo mês {periodo.ano - 1}
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={projecao.porLoja} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="loja" tick={{ fontSize: 11, fill: '#52525B' }} axisLine={false} tickLine={false} width={105} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[200px]">
                          <p className="text-xs font-semibold text-zinc-700 mb-2">{d.loja}</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Realizado (dia {projecao.lastDay})</span>
                              <span className="font-semibold">{formatBRL(d.lojaReal)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Peso atual</span>
                              <span className="font-semibold">{(d.peso * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Tend Fat</span>
                              <span className="font-semibold">{formatBRL(d.tendFat)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-zinc-400">Mesmo mês {periodo.ano - 1}</span>
                              <span className="font-semibold">{formatBRL(d.prevAA)}</span>
                            </div>
                            <div className={`flex justify-between gap-4 pt-1.5 border-t border-surface-border font-bold ${
                              d.tendVsAALoja >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
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
            <div className="flex items-center gap-2 mb-4">
              <h3 className="section-title">Detalhe da Projeção por Loja — {projecao.label}</h3>
              <InfoTip text="Peso = % do faturamento que cada loja representa no mês atual. Tend Fat = Projeção total × Peso da loja. Tend vs AA = variação entre Tend Fat e o mesmo mês do ano anterior." />
            </div>
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header text-left py-2 pr-4">Loja</th>
                  <th className="table-header text-right py-2 px-4">
                    <span className="inline-flex items-center gap-1">
                      Realizado (dia {projecao.lastDay})
                      <InfoTip text="Faturamento acumulado da loja até o último dia com dados." />
                    </span>
                  </th>
                  <th className="table-header text-right py-2 px-4">
                    <span className="inline-flex items-center gap-1">
                      Peso Atual
                      <InfoTip text="% que esta loja representa no faturamento total do mês até agora." />
                    </span>
                  </th>
                  <th className="table-header text-right py-2 px-4">
                    <span className="inline-flex items-center gap-1">
                      Tend Fat {periodo.ano}
                      <InfoTip text="Projeção do mês cheio para esta loja = Projeção total × Peso atual." />
                    </span>
                  </th>
                  <th className="table-header text-right py-2 px-4">Mesmo mês {periodo.ano - 1}</th>
                  <th className="table-header text-right py-2 pl-4">
                    <span className="inline-flex items-center gap-1">
                      Tend vs AA
                      <InfoTip text="Tendência vs Ano Anterior = variação entre Tend Fat e o mesmo mês do ano passado." />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {projecao.porLoja.map(d => (
                  <tr key={d.loja} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-brand-black">{d.loja}</td>
                    <td className="py-3 px-4 text-right font-mono text-sm">{formatBRL(d.lojaReal)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-surface-muted rounded-full text-zinc-600">
                        {(d.peso * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-brand-black">{formatBRL(d.tendFat)}</td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-zinc-400">{formatBRL(d.prevAA)}</td>
                    <td className="py-3 pl-4 text-right">
                      {d.tendVsAALoja !== null ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          d.tendVsAALoja >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                        }`}>
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
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      projecao.tendVsAA >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                    }`}>
                      {projecao.tendVsAA >= 0 ? '▲' : '▼'} {Math.abs(projecao.tendVsAA).toFixed(1).replace('.', ',')}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* ── CRESCIMENTO YoY ── */}
      <div className="chart-card">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="section-title">Crescimento Ano a Ano (YoY)</h3>
          <InfoTip text="Variação % do faturamento de cada mês vs o mesmo mês do ano anterior. Verde = crescimento. Vermelho = queda. Mês atual cortado no mesmo dia para comparação justa." />
        </div>
        <p className="text-xs text-zinc-400 mb-5">
          % vs mesmo mês {periodo.ano - 1}
          {periodo.isIncomplete && ` — ${periodo.label} cortado no dia ${periodo.lastDay}`}
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={yoyData} margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => `${v?.toFixed(0)}%`}
              tick={{ fontSize: 11, fill: '#A1A1AA' }}
              axisLine={false} tickLine={false} width={42}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const v = payload[0].value;
                const d = yoyData.find(x => x.label === label);
                const isParcial = periodo.isIncomplete && d?.key === periodo.latestKey;
                return (
                  <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[180px]">
                    <p className="text-xs font-semibold text-zinc-500 mb-1.5">{label}{isParcial ? ` (dia ${periodo.lastDay})` : ''}</p>
                    <p className="text-sm font-bold" style={{ color: v >= 0 ? '#059669' : '#dc2626' }}>
                      {v >= 0 ? '▲ +' : '▼ '}{v?.toFixed(1).replace('.', ',')}% vs {periodo.ano - 1}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">{formatBRL(d?.total || 0, true)} realizado</p>
                    {isParcial && (
                      <p className="text-[10px] text-amber-600 mt-1">* corte no dia {periodo.lastDay}</p>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#E4E4E0" strokeWidth={1.5} />
            <Bar dataKey="yoy" name="YoY %" radius={[3,3,0,0]} maxBarSize={36}>
              {yoyData.map((d, i) => (
                <Cell key={i} fill={d.yoy >= 0 ? '#97A624' : '#8C1414'}
                  opacity={periodo.isIncomplete && d.key === periodo.latestKey ? 0.7 : 1}
                />
              ))}
              <LabelList content={props => <PctLabel {...props} showLabels={showLabels} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── MÉDIA POR DIA DA SEMANA ── */}
      <div className="chart-card">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="section-title">Média por Dia da Semana</h3>
          <InfoTip text={`Média de faturamento por ocorrência de cada dia da semana. Compara ${periodo.label} (até dia ${periodo.lastDay}) vs mesmo período de ${periodo.ano - 1}.`} />
        </div>
        <p className="text-xs text-zinc-400 mb-5">
          {periodo.label} vs mesmo período {periodo.ano - 1}
          {periodo.isIncomplete && ` (até dia ${periodo.lastDay})`}
        </p>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dowComparativo} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = dowComparativo.find(x => x.label === label);
                return (
                  <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[190px]">
                    <p className="text-xs font-semibold text-zinc-500 mb-2 pb-2 border-b border-surface-border">{d?.labelFull}</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-400">{periodo.ano} (média/dia)</span>
                        <span className="font-semibold">{formatBRL(d?.mediaCur || 0, true)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-400">{periodo.ano - 1} (média/dia)</span>
                        <span className="font-semibold text-zinc-400">{formatBRL(d?.mediaPrev || 0, true)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-400">Ocorrências {periodo.ano}</span>
                        <span className="font-semibold">{d?.diasCur} dias</span>
                      </div>
                      {d?.variacao !== null && (
                        <div className={`flex justify-between gap-4 pt-1.5 border-t border-surface-border font-semibold ${
                          d.variacao >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          <span>Variação</span>
                          <span>{d.variacao >= 0 ? '▲' : '▼'} {Math.abs(d.variacao).toFixed(1).replace('.', ',')}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="mediaPrev" name={`Média ${periodo.ano - 1}`} fill="#E8E8E2" radius={[3,3,0,0]} maxBarSize={28}>
              <LabelList content={props => {
                if (!showLabels || !props.value) return null;
                return <text x={(props.x||0)+(props.width||0)/2} y={(props.y||0)-5} textAnchor="middle" fontSize={9} fill="#A1A1AA" fontFamily="DM Sans">{BRLk(props.value)}</text>;
              }} />
            </Bar>
            <Bar dataKey="mediaCur" name={`Média ${periodo.ano}`} fill="#97A624" radius={[3,3,0,0]} maxBarSize={28}>
              <LabelList content={props => {
                if (!showLabels || !props.value) return null;
                return <text x={(props.x||0)+(props.width||0)/2} y={(props.y||0)-5} textAnchor="middle" fontSize={9} fill="#52525B" fontFamily="DM Sans">{BRLk(props.value)}</text>;
              }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tabela resumo */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="table-header text-left py-2 pr-4">Dia</th>
                <th className="table-header text-right py-2 px-4">Média {periodo.ano - 1}</th>
                <th className="table-header text-right py-2 px-4">Média {periodo.ano}</th>
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
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        d.variacao >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                      }`}>
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

    </div>
  );
}
