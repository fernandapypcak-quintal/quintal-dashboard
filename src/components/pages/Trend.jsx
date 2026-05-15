// src/components/pages/Trend.jsx
// Lógica validada contra planilha de acompanhamento MAI/2026

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Calendar, Info } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { useLabels } from '../../hooks/useLabels';
import { sum, monthlyTotals, formatBRL, formatPct, variation } from '../../utils/formatters';
import InfoTip from '../ui/InfoTip';

// ── Dias do mês ────────────────────────────────────────────────────────────
function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

// ── Tend Fat — lógica idêntica à planilha ─────────────────────────────────
// Dia_Semana_Num no AppScript: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
// = igual JS Date.getDay()
// Médias: todos os dias com dados (1 até lastDay inclusive)
// Projeção: dias lastDay+1 até fim do mês
function calcTendFat(recsAtual, lastDay, totalDays, ano, mes) {
  if (!recsAtual.length || lastDay >= totalDays) return sum(recsAtual);

  // Média por dia da semana usando TODOS os dias com dados
  const mediaPorDow = {};
  for (let dow = 0; dow < 7; dow++) {
    const recsDow = recsAtual.filter(r => r.Dia_Semana_Num === dow);
    const diasDow  = new Set(recsDow.map(r => r.Dia)).size;
    mediaPorDow[dow] = diasDow > 0 ? sum(recsDow) / diasDow : 0;
  }

  // Projeção: dias lastDay+1 até fim do mês
  let projecao = 0;
  for (let dia = lastDay + 1; dia <= totalDays; dia++) {
    const dow = new Date(ano, mes - 1, dia).getDay(); // 0=Dom, igual ao CSV
    projecao += mediaPorDow[dow] || 0;
  }

  return sum(recsAtual) + projecao;
}

// ── Período atual ──────────────────────────────────────────────────────────
function getPeriodo(rawData) {
  if (!rawData.length) return null;
  const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
  const latestKey = allMonths[allMonths.length - 1];
  const [anoStr, mesStr] = latestKey.split('-');
  const ano = Number(anoStr), mes = Number(mesStr);
  const recsLatest = rawData.filter(r => r.Ano_Mes === latestKey);
  const lastDay = Math.max(...recsLatest.map(r => r.Dia));
  const label = recsLatest[0]?.Ano_Mes_Label || latestKey;
  const totalDays = daysInMonth(ano, mes);
  const isIncomplete = lastDay < totalDays;
  return { latestKey, ano, mes, lastDay, label, totalDays, isIncomplete };
}

const DOW_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']; // 0=Dom
const DOW_PT = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

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
  const { rawData } = useFilters();
  const { getMeta } = useMetas();
  const { showLabels } = useLabels();

  const periodo = useMemo(() => getPeriodo(rawData), [rawData]);

  // ── Dados do mês atual ─────────────────────────────────────────────────
  const mesAtual = useMemo(() => {
    if (!periodo) return null;
    const { latestKey, ano, mes, lastDay, totalDays } = periodo;

    // Registros do mês atual
    const recs = rawData.filter(r => r.Ano_Mes === latestKey);
    const realizado = sum(recs);

    // Tend Fat
    const tendFat = calcTendFat(recs, lastDay, totalDays, ano, mes);

    // Mesmo mês ano anterior (mês completo)
    const recsAA = rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes);
    const totalAA = sum(recsAA);

    // YoY com corte (compara mesmos dias)
    const recsAA_corte = recsAA.filter(r => r.Dia <= lastDay);
    const yoy = variation(realizado, sum(recsAA_corte));

    // Tend vs AA
    const tendVsAA = variation(tendFat, totalAA);

    // Médias por dia da semana:
    // 2026 = dias ANTERIORES ao lastDay (< lastDay, igual à fórmula da planilha)
    // 2025 = mês COMPLETO (igual à planilha de acompanhamento)
    const recsParaMedia = recs.filter(r => r.Dia < lastDay); // strict < como na planilha
    const recsAA_completo = recsAA; // sem corte de dia
    const dowStats = Array.from({length: 7}, (_, dow) => {
      const curRecs  = recsParaMedia.filter(r => r.Dia_Semana_Num === dow);
      const prevRecs = recsAA_completo.filter(r => r.Dia_Semana_Num === dow);
      // Usa r.Dia (número) para contar dias distintos — evita problemas de formato de data
      const diasCur  = new Set(curRecs.map(r => r.Dia)).size;
      const diasPrev = new Set(prevRecs.map(r => r.Dia)).size;
      const mediaCur  = diasCur  > 0 ? sum(curRecs)  / diasCur  : 0;
      const mediaPrev = diasPrev > 0 ? sum(prevRecs) / diasPrev : 0;
      return {
        label: DOW_LABELS[dow],
        labelFull: DOW_PT[dow],
        mediaCur, mediaPrev,
        variacao: variation(mediaCur, mediaPrev),
        diasCur, diasPrev,
      };
    });

    // Por loja
    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();
    const porLoja = lojas.map(loja => {
      const lojaRecs = recs.filter(r => r.Loja === loja);
      const lojaReal     = sum(lojaRecs);
      const lojaRecsCasa = lojaRecs.filter(r => r.Canal === 'CASA');
      const lojaRecsDel  = lojaRecs.filter(r => r.Canal === 'DELIVERY');
      const peso         = realizado > 0 ? lojaReal / realizado : 0;
      const lojaTend     = calcTendFat(lojaRecs,     lastDay, totalDays, ano, mes);
      const lojaTendCasa = calcTendFat(lojaRecsCasa, lastDay, totalDays, ano, mes);
      const lojaTendDel  = calcTendFat(lojaRecsDel,  lastDay, totalDays, ano, mes);
      const lojaAA       = sum(recsAA.filter(r => r.Loja === loja));
      const lojaAACasa   = sum(recsAA.filter(r => r.Loja === loja && r.Canal === 'CASA'));
      const lojaAADel    = sum(recsAA.filter(r => r.Loja === loja && r.Canal === 'DELIVERY'));
      return { loja, lojaReal, peso,
        lojaTend, lojaTendCasa, lojaTendDel,
        lojaAA, lojaAACasa, lojaAADel,
        tendVsAA:     variation(lojaTend,     lojaAA),
        tendVsAACasa: variation(lojaTendCasa, lojaAACasa),
        tendVsAADel:  variation(lojaTendDel,  lojaAADel) };
    }).sort((a, b) => b.lojaReal - a.lojaReal);

    return { recs, realizado, tendFat, totalAA, yoy, tendVsAA, dowStats, porLoja };
  }, [rawData, periodo]);

  // ── YoY por mês (barras) ──────────────────────────────────────────────
  const yoyData = useMemo(() => {
    if (!periodo) return [];
    const { ano, lastDay } = periodo;
    const monthly = monthlyTotals(rawData.filter(r => r.Ano === ano));
    return monthly.map(m => {
      const prevRecs = rawData.filter(r => r.Ano === ano - 1 && r.Mes === m.mes);
      if (!prevRecs.length) return { ...m, yoy: null };
      const isCurrentMonth = m.key === periodo.latestKey;
      const prevTotal = isCurrentMonth
        ? sum(prevRecs.filter(r => r.Dia <= lastDay))
        : sum(prevRecs);
      return { ...m, yoy: variation(m.total, prevTotal) };
    }).filter(m => m.yoy !== null);
  }, [rawData, periodo]);

  if (!periodo || !mesAtual) return null;

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* Banner */}
      {periodo.isIncomplete && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Calendar size={13} className="flex-shrink-0" />
          <span>
            <strong>{periodo.label}</strong> — dados até dia <strong>{periodo.lastDay}</strong>.
            Tend Fat = realizado + projeção por média de cada dia da semana (dias {periodo.lastDay + 1}–{periodo.totalDays}).
          </span>
        </div>
      )}

      {/* ── Projeção — topo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Card projeção */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Projeção {periodo.label}</span>
            <InfoTip text="Tend Fat = Realizado + Σ(média de cada dia da semana × dias restantes). Mesma fórmula da planilha de acompanhamento." />
          </div>
          <p className="text-3xl font-bold font-display text-brand-black mb-1">{formatBRL(mesAtual.tendFat, true)}</p>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center py-2 border-t border-surface-border text-xs">
              <span className="text-zinc-500 flex items-center gap-1">
                Realizado (dia {periodo.lastDay})
                <InfoTip text="Faturamento total acumulado até o último dia com dados." />
              </span>
              <span className="font-semibold">{formatBRL(mesAtual.realizado)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-surface-border text-xs">
              <span className="text-zinc-500 flex items-center gap-1">
                Mesmo mês {periodo.ano - 1}
                <InfoTip text="Faturamento total do mesmo mês no ano anterior (mês completo)." />
              </span>
              <span className="font-semibold text-zinc-400">{formatBRL(mesAtual.totalAA)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-surface-border">
              <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                Tend vs AA
                <InfoTip text="Variação entre a projeção (Tend Fat) e o mesmo mês completo do ano anterior." />
              </span>
              <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${mesAtual.tendVsAA >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                {mesAtual.tendVsAA >= 0 ? '▲' : '▼'} {Math.abs(mesAtual.tendVsAA).toFixed(1).replace('.', ',')}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-surface-border">
              <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                YoY (até dia {periodo.lastDay})
                <InfoTip text={`Variação do realizado vs mesmo período de ${periodo.ano - 1} (cortado no dia ${periodo.lastDay}).`} />
              </span>
              <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${mesAtual.yoy >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                {mesAtual.yoy >= 0 ? '▲' : '▼'} {Math.abs(mesAtual.yoy).toFixed(1).replace('.', ',')}%
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico por loja */}
        <div className="lg:col-span-2 bg-white border border-surface-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="section-title">Tend Fat por Loja</h3>
            <InfoTip text="Projeção individual por loja usando a mesma lógica: média por dia da semana × dias restantes. Verde = acima do ano anterior, Vermelho = abaixo." />
          </div>
          <p className="text-xs text-zinc-400 mb-4">vs mesmo mês {periodo.ano - 1}</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mesAtual.porLoja} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
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
                        <div className="flex justify-between gap-4"><span className="text-zinc-400">Realizado</span><span className="font-semibold">{formatBRL(d.lojaReal)}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-zinc-400">Peso</span><span className="font-semibold">{(d.peso*100).toFixed(1)}%</span></div>
                        <div className="flex justify-between gap-4"><span className="text-zinc-400">Tend Fat</span><span className="font-semibold">{formatBRL(d.lojaTend)}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-zinc-400">AA completo</span><span className="font-semibold">{formatBRL(d.lojaAA)}</span></div>
                        <div className={`flex justify-between gap-4 pt-1 border-t border-surface-border font-bold ${d.tendVsAA >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <span>Tend vs AA</span>
                          <span>{d.tendVsAA >= 0 ? '▲' : '▼'} {Math.abs(d.tendVsAA??0).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="lojaTend" name="Tend Fat" radius={[0,4,4,0]} maxBarSize={22}>
                {mesAtual.porLoja.map((d, i) => (
                  <Cell key={i} fill={d.tendVsAA !== null && d.tendVsAA >= 0 ? '#97A624' : '#8C1414'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela por loja */}
      <div className="chart-card overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="section-title">Detalhe da Projeção por Loja — {periodo.label}</h3>
          <InfoTip text="Peso = % do faturamento atual. Tend Fat = projeção do mês cheio por loja. Tend vs AA = variação vs mesmo mês do ano anterior completo." />
        </div>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="table-header text-left py-2 pr-4">Loja</th>
              <th className="table-header text-right py-2 px-3">Realizado</th>
              <th className="table-header text-right py-2 px-3">Peso</th>
              <th className="table-header text-right py-2 px-3">Tend Fat Total</th>
              <th className="table-header text-right py-2 px-3">Tend Fat Casa</th>
              <th className="table-header text-right py-2 px-3">Tend Fat Del</th>
              <th className="table-header text-right py-2 px-3">AA Completo</th>
              <th className="table-header text-right py-2 px-3">Tend vs AA</th>
              <th className="table-header text-right py-2 px-3">Casa vs AA</th>
              <th className="table-header text-right py-2 pl-4">Del vs AA</th>
            </tr>
          </thead>
          <tbody>
            {mesAtual.porLoja.map(d => (
              <tr key={d.loja} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                <td className="py-3 pr-4 font-medium text-brand-black">{d.loja}</td>
                <td className="py-3 px-3 text-right font-mono text-sm">{formatBRL(d.lojaReal)}</td>
                <td className="py-3 px-3 text-right">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-surface-muted rounded-full text-zinc-600">{(d.peso*100).toFixed(1)}%</span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm font-semibold text-brand-black">{formatBRL(d.lojaTend)}</td>
                <td className="py-3 px-3 text-right font-mono text-sm text-brand-olive">{formatBRL(d.lojaTendCasa||0)}</td>
                <td className="py-3 px-3 text-right font-mono text-sm" style={{color:'#D9B504'}}>{formatBRL(d.lojaTendDel||0)}</td>
                <td className="py-3 px-3 text-right font-mono text-sm text-zinc-400">{formatBRL(d.lojaAA)}</td>
                {[['t',d.tendVsAA],['c',d.tendVsAACasa],['d',d.tendVsAADel]].map(([k,v])=>(
                  <td key={k} className="py-3 px-3 text-right">
                    {v !== null ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                        {v >= 0 ? '▲' : '▼'} {Math.abs(v).toFixed(1).replace('.', ',')}%
                      </span>
                    ) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-border bg-surface-muted/30">
              <td className="py-3 pr-4 text-xs font-semibold text-zinc-500 uppercase">Total</td>
              <td className="py-3 px-3 text-right font-mono text-sm font-bold">{formatBRL(mesAtual.realizado)}</td>
              <td className="py-3 px-3 text-right text-xs font-semibold text-zinc-400">100%</td>
              <td className="py-3 px-3 text-right font-mono text-sm font-bold text-brand-black">{formatBRL(mesAtual.tendFat)}</td>
              <td className="py-3 px-3 text-right font-mono text-sm text-brand-olive">{formatBRL(mesAtual.porLoja.reduce((s,d)=>s+(d.lojaTendCasa||0),0))}</td>
              <td className="py-3 px-3 text-right font-mono text-sm" style={{color:'#D9B504'}}>{formatBRL(mesAtual.porLoja.reduce((s,d)=>s+(d.lojaTendDel||0),0))}</td>
              <td className="py-3 px-3 text-right font-mono text-sm text-zinc-400">{formatBRL(mesAtual.totalAA)}</td>
              <td className="py-3 px-3 text-right" colSpan={3}>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mesAtual.tendVsAA >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                  {mesAtual.tendVsAA >= 0 ? '▲' : '▼'} {Math.abs(mesAtual.tendVsAA).toFixed(1).replace('.', ',')}%
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── YoY mensal ── */}
      <div className="chart-card">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="section-title">Crescimento YoY — {periodo.ano}</h3>
          <InfoTip text={`Variação % vs mesmo mês de ${periodo.ano - 1}. Mês atual cortado no dia ${periodo.lastDay} para comparação justa.`} />
        </div>
        <p className="text-xs text-zinc-400 mb-5">vs mesmo mês {periodo.ano - 1} — mês atual cortado no dia {periodo.lastDay}</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={yoyData} margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v?.toFixed(0)}%`} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={42} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const v = payload[0].value;
                const d = yoyData.find(x => x.label === label);
                const isCur = d?.key === periodo.latestKey;
                return (
                  <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[180px]">
                    <p className="text-xs font-semibold text-zinc-500 mb-1.5">{label}{isCur ? ` (dia ${periodo.lastDay})` : ''}</p>
                    <p className="text-sm font-bold" style={{ color: v >= 0 ? '#059669' : '#dc2626' }}>
                      {v >= 0 ? '▲ +' : '▼ '}{v?.toFixed(1).replace('.', ',')}%
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">{formatBRL(d?.total||0, true)} realizado</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#E4E4E0" strokeWidth={1.5} />
            <Bar dataKey="yoy" name="YoY %" radius={[3,3,0,0]} maxBarSize={36}>
              {yoyData.map((d, i) => (
                <Cell key={i} fill={d.yoy >= 0 ? '#97A624' : '#8C1414'}
                  opacity={d.key === periodo.latestKey ? 0.8 : 1} />
              ))}
              <LabelList dataKey="yoy" content={(props) => {
                if (!showLabels || props.value == null) return null;
                const v = props.value;
                const color = v >= 0 ? '#059669' : '#dc2626';
                return <text x={(props.x||0)+(props.width||0)/2} y={v>=0?(props.y||0)-5:(props.y||0)+14} textAnchor="middle" fontSize={10} fontWeight={600} fill={color} fontFamily="DM Sans">{v>=0?'+':''}{v.toFixed(1).replace('.',',')}%</text>;
              }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Média por dia da semana ── */}
      <div className="chart-card">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="section-title">Média por Dia da Semana</h3>
          <InfoTip text={`Média de faturamento por ocorrência de cada dia. ${periodo.label} vs mesmo período de ${periodo.ano - 1} (até dia ${periodo.lastDay}).`} />
        </div>
        <p className="text-xs text-zinc-400 mb-5">
          {periodo.label} vs mesmo período {periodo.ano - 1} (até dia {periodo.lastDay})
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={mesAtual.dowStats} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = mesAtual.dowStats.find(x => x.label === label);
                return (
                  <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[190px]">
                    <p className="text-xs font-semibold text-zinc-500 mb-2 pb-2 border-b border-surface-border">{d?.labelFull}</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-400">{periodo.ano} ({d?.diasCur} dias)</span>
                        <span className="font-semibold">{formatBRL(d?.mediaCur||0, true)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-400">{periodo.ano - 1} ({d?.diasPrev} dias)</span>
                        <span className="text-zinc-400">{formatBRL(d?.mediaPrev||0, true)}</span>
                      </div>
                      {d?.variacao !== null && (
                        <div className={`flex justify-between gap-4 pt-1.5 border-t border-surface-border font-semibold ${d.variacao >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <span>Variação</span>
                          <span>{d.variacao >= 0 ? '▲' : '▼'} {Math.abs(d.variacao).toFixed(1).replace('.', ',')}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="mediaPrev" name={`${periodo.ano - 1}`} fill="#E8E8E2" radius={[3,3,0,0]} maxBarSize={28} />
            <Bar dataKey="mediaCur"  name={`${periodo.ano}`}     fill="#97A624" radius={[3,3,0,0]} maxBarSize={28}>
              <LabelList dataKey="mediaCur" content={(p) => {
                if (!showLabels || !p.value) return null;
                const v = p.value;
                const s = v>=1e6?`R$ ${(v/1e6).toFixed(1).replace('.',',')}M`:v>=1e3?`R$ ${(v/1e3).toFixed(0)}k`:`R$ ${v.toFixed(0)}`;
                return <text x={(p.x||0)+(p.width||0)/2} y={(p.y||0)-5} textAnchor="middle" fontSize={9} fontWeight={500} fill="#52525B" fontFamily="DM Sans">{s}</text>;
              }}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
              {mesAtual.dowStats.map(d => (
                <tr key={d.label} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-brand-black">{d.labelFull}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm text-zinc-400">{d.mediaPrev > 0 ? formatBRL(d.mediaPrev) : '—'}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm font-semibold text-brand-black">{d.mediaCur > 0 ? formatBRL(d.mediaCur) : '—'}</td>
                  <td className="py-2.5 pl-4 text-right">
                    {d.variacao !== null && d.mediaCur > 0 && d.mediaPrev > 0 ? (
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

    </div>
  );
}
