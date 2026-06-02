// src/components/pages/Stores.jsx
import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useAlmoco } from '../../hooks/useAlmoco';
import { useMetas } from '../../hooks/useMetas';
import { useLabels } from '../../hooks/useLabels';
import { progressColor, AtingBadge } from '../ui/GoalProgress';
import { sum, monthlyTotals, formatBRL, variation, calcTendFat, daysInMonth } from '../../utils/formatters';
import InfoTip from '../ui/InfoTip';

const STORE_COLORS = ['#97A624','#D9B504','#D9CB04','#8C1414','#0D9488','#7C3AED','#EA580C','#0284C7','#65A30D','#6B7280'];
const BRLk = v => v >= 1e6 ? 'R$\u00a0'+(v/1e6).toFixed(1).replace('.',',')+'M'
                : v >= 1e3 ? 'R$\u00a0'+(v/1e3).toFixed(0)+'k'
                : 'R$\u00a0'+v.toFixed(0);

const DOW_LABELS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

export default function Stores() {
  const { rawData, filters } = useFilters();
  const { getMeta } = useMetas();
  const { almoco, getAlmocoLoja } = useAlmoco();
  const { showLabels } = useLabels();
  const [expandedLoja, setExpandedLoja] = useState(null);

  // ── Período atual ──────────────────────────────────────────────
  // Respeita o filtro de mês selecionado pelo usuário.
  // Se um mês específico foi selecionado, usa ele; senão usa o mais recente.
  const periodo = useMemo(() => {
    if (!rawData.length) return null;
    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();

    let latestKey;
    if (filters.meses.size === 1 && filters.ano !== 'Todos') {
      // Mês e ano específicos selecionados — usa exatamente esse
      const mes = [...filters.meses][0];
      const ano = Number(filters.ano);
      latestKey = `${ano}-${String(mes).padStart(2,'0')}`;
      if (!allMonths.includes(latestKey)) latestKey = allMonths[allMonths.length - 1];
    } else if (filters.meses.size === 1) {
      // Só mês selecionado — pega o mais recente desse mês
      const mes = [...filters.meses][0];
      const candidatos = allMonths.filter(k => Number(k.split('-')[1]) === mes);
      latestKey = candidatos.length ? candidatos[candidatos.length - 1] : allMonths[allMonths.length - 1];
    } else {
      // Nenhum ou múltiplos meses — usa o mais recente
      latestKey = allMonths[allMonths.length - 1];
    }

    const [anoStr, mesStr] = latestKey.split('-');
    const ano = Number(anoStr), mes = Number(mesStr);
    const recsLatest = rawData.filter(r => r.Ano_Mes === latestKey);
    if (!recsLatest.length) return null;
    const lastDay = Math.max(...recsLatest.map(r => r.Dia));
    const label = recsLatest[0]?.Ano_Mes_Label || latestKey;
    const totalDays = daysInMonth(ano, mes);
    return { latestKey, ano, mes, lastDay, label, totalDays };
  }, [rawData, filters]);

  const lojas = useMemo(() => [...new Set(rawData.map(r => r.Loja))].sort(), [rawData]);

  // ── Dados por loja ─────────────────────────────────────────────
  const lojaStats = useMemo(() => {
    if (!periodo) return [];
    const { latestKey, ano, mes, lastDay, totalDays } = periodo;
    const grandTotal = sum(rawData.filter(r => r.Ano_Mes === latestKey));

    return lojas.map((loja, idx) => {
      const color = STORE_COLORS[idx % STORE_COLORS.length];

      const recsCur   = rawData.filter(r => r.Ano_Mes === latestKey && r.Loja === loja);
      const realAtual = sum(recsCur);
      const casa      = sum(recsCur.filter(r => r.Canal === 'CASA'));
      const delivery  = sum(recsCur.filter(r => r.Canal === 'DELIVERY'));

      const recsAA = rawData.filter(r =>
        r.Ano === ano - 1 && r.Mes === mes && r.Loja === loja && r.Dia <= lastDay
      );
      const realAA = sum(recsAA);
      const yoy    = variation(realAtual, realAA);

      const meta  = getMeta(latestKey, loja);
      const ating = meta > 0 ? realAtual / meta * 100 : null;

      const meioMes   = Math.floor(lastDay / 2);
      const recs1a    = recsCur.filter(r => r.Dia <= meioMes);
      const recs2a    = recsCur.filter(r => r.Dia > meioMes);
      const dias1a    = new Set(recs1a.map(r => r.Dia)).size;
      const dias2a    = new Set(recs2a.map(r => r.Dia)).size;
      const media1a   = dias1a > 0 ? sum(recs1a) / dias1a : 0;
      const media2a   = dias2a > 0 ? sum(recs2a) / dias2a : 0;
      const aceleracao = media1a > 0 ? ((media2a - media1a) / media1a) * 100 : null;

      const recsAlmoco    = getAlmocoLoja(ano, mes, loja);
      const totalAlmoco   = recsAlmoco.reduce((s,r) => s+r.Valor, 0);
      const pesoAlmoco    = casa > 0 ? totalAlmoco/casa*100 : 0;
      const jantarCasa    = Math.max(0, casa - totalAlmoco);
      const allAlmocoLoja = almoco.filter(r => r.Loja === loja).sort((a,b) => a.Data.localeCompare(b.Data));
      const inicioAlmoco  = allAlmocoLoja[0]?.Data || null;
      const almocoMensal  = Object.entries(
        allAlmocoLoja.reduce((acc,r) => { acc[r.Ano_Mes]=(acc[r.Ano_Mes]||0)+r.Valor; return acc; }, {})
      ).sort(([a],[b]) => a.localeCompare(b));

      const tendFat = calcTendFat(recsCur, lastDay, totalDays, ano, mes);
      const prevAAfull  = sum(rawData.filter(r =>
        r.Ano === ano - 1 && r.Mes === mes && r.Loja === loja
      ));
      const tendVsAA = variation(tendFat, prevAAfull);

      const share     = grandTotal > 0 ? realAtual / grandTotal * 100 : 0;
      const tendAting = meta > 0 ? tendFat / meta * 100 : null;

      const dowStats = DOW_LABELS.map((label, dowIdx) => {
        const recs = recsCur.filter(r => r.Dia_Semana_Num === dowIdx);
        const dias = [...new Set(recs.map(r => r.Data))].length;
        return { label: label.slice(0, 3), media: dias > 0 ? sum(recs) / dias : 0 };
      }).filter(d => d.media > 0);
      const melhorDia = [...dowStats].sort((a, b) => b.media - a.media)[0];

      const monthly = monthlyTotals(
        rawData.filter(r => r.Loja === loja && r.Ano === ano)
      ).map(m => {
        const prevRecs = rawData.filter(r =>
          r.Ano === ano - 1 && r.Mes === m.mes && r.Loja === loja
        );
        return { ...m, prevYear: prevRecs.length > 0 ? sum(prevRecs) : null };
      });

      return {
        loja, color, idx,
        realAtual, realAA, casa, delivery,
        meta, ating, tendFat, tendVsAA, prevAAfull,
        share, yoy, melhorDia, monthly, tendAting,
        totalAlmoco, pesoAlmoco, jantarCasa, inicioAlmoco, almocoMensal,
        aceleracao, media1a, media2a,
      };
    }).sort((a, b) => {
      if (a.ating === null && b.ating === null) return b.realAtual - a.realAtual;
      if (a.ating === null) return 1;
      if (b.ating === null) return -1;
      return b.ating - a.ating;
    });
  }, [lojas, rawData, periodo, getMeta]);

  if (!periodo) return null;

  const grandMeta      = lojaStats.reduce((s, l) => s + l.meta, 0);
  const grandReal      = lojaStats.reduce((s, l) => s + l.realAtual, 0);
  const grandAting     = grandMeta > 0 ? grandReal / grandMeta * 100 : null;
  const grandTend      = lojaStats.reduce((s, l) => s + l.tendFat, 0);
  const grandRealAA    = lojaStats.reduce((s, l) => s + (l.realAA || 0), 0);
  const grandTendAA    = lojaStats.reduce((s, l) => s + (l.prevAAfull || 0), 0);
  const grandYoY       = grandRealAA > 0 ? variation(grandReal, grandRealAA) : null;
  const grandTendVsAA  = grandTendAA  > 0 ? variation(grandTend, grandTendAA) : null;
  // Projeção da meta no total: Tend Fat total / Meta total
  const grandTendAting = grandMeta > 0 ? grandTend / grandMeta * 100 : null;

  return (
    <div className="p-6 space-y-4 animate-fade-in">

      {/* Aviso de corte */}
      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
        <Calendar size={13} className="flex-shrink-0" />
        <span>
          Comparações YoY cortadas no dia <strong>{periodo.lastDay}</strong> — {periodo.label} vs mesmo período {periodo.ano - 1}.
          Tend Fat = projeção do mês cheio.
        </span>
      </div>

      {/* ── CARDS POR LOJA ── */}
      <div className="space-y-3">
        {lojaStats.map((l) => {
          const isExpanded = expandedLoja === l.loja;
          const col = progressColor(l.ating ?? 0);

          return (
            <div key={l.loja}
              className="bg-white border border-surface-border rounded-2xl"
              style={{ borderLeft: `4px solid ${l.color}` }}
            >
              <button
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-surface-muted/30 transition-colors"
                onClick={() => setExpandedLoja(isExpanded ? null : l.loja)}
              >
                <div className="flex items-center gap-5 flex-wrap flex-1 min-w-0">
                  <div className="min-w-[130px]">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">{l.loja}</p>
                    <p className="text-xl font-bold font-display" style={{ color: l.color }}>{formatBRL(l.realAtual, true)}</p>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap text-sm">

                    <div>
                      <div className="flex items-center gap-0.5 mb-0.5"><p className="text-[10px] text-zinc-400 uppercase tracking-wider">YoY (dia {periodo.lastDay})</p><InfoTip text="Variação % do faturamento atual vs mesmo período do ano anterior, cortado no mesmo dia para comparação justa." /></div>
                      {l.yoy !== null
                        ? <p className={`font-bold ${l.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {l.yoy >= 0 ? '▲ +' : '▼ '}{Math.abs(l.yoy).toFixed(1).replace('.', ',')}%
                          </p>
                        : <p className="text-zinc-300">—</p>
                      }
                    </div>

                    <div>
                      <div className="flex items-center gap-0.5 mb-0.5"><p className="text-[10px] text-zinc-400 uppercase tracking-wider">Tend Fat</p><InfoTip text="Tendência de Faturamento: projeção do mês cheio baseada na média diária atual × dias do mês." /></div>
                      <p className="font-semibold text-zinc-700">{formatBRL(l.tendFat, true)}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-0.5 mb-0.5"><p className="text-[10px] text-zinc-400 uppercase tracking-wider">Tend vs AA</p><InfoTip text="Tendência vs Ano Anterior: variação entre a projeção (Tend Fat) e o mesmo mês completo do ano passado." /></div>
                      {l.tendVsAA !== null
                        ? <p className={`font-bold ${l.tendVsAA >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {l.tendVsAA >= 0 ? '▲ +' : '▼ '}{Math.abs(l.tendVsAA).toFixed(1).replace('.', ',')}%
                          </p>
                        : <p className="text-zinc-300">—</p>
                      }
                    </div>

                    {l.meta > 0 && (
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Meta</p>
                        <p className="font-semibold text-zinc-600">{formatBRL(l.meta, true)}</p>
                      </div>
                    )}

                    {l.ating !== null && (
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Ating.</p>
                        <p className="font-bold" style={{ color: col.text }}>
                          {l.ating.toFixed(1).replace('.', ',')}%
                        </p>
                      </div>
                    )}

                    {l.tendAting !== null && (
                      <div>
                        <div className="flex items-center gap-0.5 mb-0.5"><p className="text-[10px] text-zinc-400 uppercase tracking-wider">Proj. Meta</p><InfoTip text="Se continuar no ritmo atual, vai atingir esse % da meta no fim do mês." /></div>
                        <p className={`font-bold ${l.tendAting >= 100 ? 'text-emerald-600' : l.tendAting >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {l.tendAting.toFixed(1).replace('.', ',')}%
                        </p>
                        <p className="text-[10px] text-zinc-400">{formatBRL(l.tendFat, true)} de {formatBRL(l.meta, true)}</p>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-0.5 mb-0.5"><p className="text-[10px] text-zinc-400 uppercase tracking-wider">Peso</p><InfoTip text="% que esta loja representa no faturamento total do período." /></div>
                      <p className="font-semibold text-zinc-600">{l.share.toFixed(1)}%</p>
                    </div>

                    {l.melhorDia && (
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Melhor dia</p>
                        <p className="font-semibold text-zinc-600">{l.melhorDia.label}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  {l.ating !== null && (
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(l.ating, 100)}%`, backgroundColor: col.bar }} />
                      </div>
                    </div>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-surface-border px-5 py-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    <div>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                        Evolução Mensal
                      </p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={l.monthly} margin={{ top: 14, right: 4, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => BRLk(v)} tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={60} />
                          <Tooltip
                            content={({ active, payload, label: lb }) => {
                              if (!active || !payload?.length) return null;
                              const d = l.monthly.find(m => m.label === lb);
                              return (
                                <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[170px]">
                                  <p className="text-xs font-semibold text-zinc-500 mb-2">{lb}</p>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between gap-4">
                                      <span className="text-zinc-400">Salão</span>
                                      <span className="font-semibold">{formatBRL(d?.casa||0, true)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-zinc-400">Delivery</span>
                                      <span className="font-semibold">{formatBRL(d?.delivery||0, true)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4 pt-1 border-t border-surface-border">
                                      <span className="font-semibold text-zinc-700">Total</span>
                                      <span className="font-bold">{formatBRL(d?.total||0, true)}</span>
                                    </div>
                                    {d?.prevYear && (
                                      <div className="flex justify-between gap-4">
                                        <span className="text-zinc-400">Ano anterior</span>
                                        <span className="text-zinc-400">{formatBRL(d.prevYear, true)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="casa" name="Salão" fill={l.color} stackId="a" radius={[0,0,0,0]} maxBarSize={32}>
                            <LabelList content={props => {
                              if (!showLabels || !props.value) return null;
                              return <text x={(props.x||0)+(props.width||0)/2} y={(props.y||0)-5} textAnchor="middle" fontSize={9} fill="#52525B" fontFamily="DM Sans">{BRLk(props.value)}</text>;
                            }} />
                          </Bar>
                          <Bar dataKey="delivery" name="Delivery" fill="#D9B504" stackId="a" radius={[3,3,0,0]} maxBarSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                        {periodo.label} — Detalhe (até dia {periodo.lastDay})
                      </p>
                      <div className="space-y-0">
                        {[
                          { label: 'Salão Total', value: formatBRL(l.casa), accent: l.color },
                          ...(l.totalAlmoco > 0 ? [
                            { label: '↳ Almoço', value: formatBRL(l.totalAlmoco), accent: '#0D9488' },
                            { label: '↳ Jantar', value: formatBRL(l.jantarCasa), accent: l.color },
                          ] : []),
                          { label: 'Delivery', value: formatBRL(l.delivery), accent: '#D9B504' },
                          { label: `Realizado total`, value: formatBRL(l.realAtual), bold: true },
                          { label: `Mesmo período ${periodo.ano - 1} (dia ${periodo.lastDay})`, value: formatBRL(l.realAA), muted: true },
                          { label: `Mesmo mês ${periodo.ano - 1} (completo)`, value: formatBRL(l.prevAAfull), muted: true },
                          { label: 'Meta do mês', value: l.meta > 0 ? formatBRL(l.meta) : '—', muted: true },
                          { label: 'Tend Fat (projeção)', value: formatBRL(l.tendFat), bold: true },
                        ].map(row => (
                          <div key={row.label} className="flex justify-between items-center py-2 border-b border-surface-border/50 last:border-0">
                            <span className="text-xs text-zinc-500">{row.label}</span>
                            <span
                              className={`text-sm font-mono ${row.bold ? 'font-bold text-brand-black' : row.muted ? 'text-zinc-400' : 'font-semibold'}`}
                              style={row.accent ? { color: row.accent } : {}}
                            >
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {l.totalAlmoco > 0 && (
                        <div className="mt-4 pt-3 border-t border-surface-border">
                          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-2">
                            Almoço — {periodo.label}
                          </p>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-zinc-500">Início</span>
                            <span className="font-semibold text-zinc-700">
                              {l.inicioAlmoco ? l.inicioAlmoco.split('-').reverse().join('/') : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-zinc-500">Realizado almoço</span>
                            <span className="font-semibold text-teal-600">{formatBRL(l.totalAlmoco)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mb-3">
                            <span className="text-zinc-500">Peso no Casa</span>
                            <span className="font-semibold text-teal-600">{l.pesoAlmoco.toFixed(1).replace('.',',')}%</span>
                          </div>
                          {l.almocoMensal.length > 1 && (
                            <div>
                              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5">Evolução mensal</p>
                              <div className="space-y-1">
                                {l.almocoMensal.map(([key, val]) => {
                                  const max = Math.max(...l.almocoMensal.map(([,v]) => v));
                                  return (
                                    <div key={key} className="flex items-center gap-2 text-xs">
                                      <span className="text-zinc-400 w-12 flex-shrink-0">{key.split('-')[1]}/{key.split('-')[0].slice(2)}</span>
                                      <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-teal-500" style={{width:`${max>0?val/max*100:0}%`}}/>
                                      </div>
                                      <span className="font-semibold text-zinc-600 w-16 text-right">{formatBRL(val,true)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {l.ating !== null && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-zinc-500">Atingimento da meta</span>
                            <span className="font-bold" style={{ color: col.text }}>
                              {l.ating.toFixed(1).replace('.', ',')}%
                            </span>
                          </div>
                          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(l.ating, 100)}%`, backgroundColor: col.bar }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                            <span>R$ 0</span>
                            <span>Meta: {formatBRL(l.meta, true)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── TABELA DE RANKING ── */}
      <div className="chart-card overflow-x-auto">
        <h3 className="section-title mb-1">Ranking de Lojas</h3>
        <p className="text-xs text-zinc-400 mb-4">
          Comparação YoY cortada no dia {periodo.lastDay} · Tend Fat = projeção do mês cheio
        </p>
        <table className="w-full min-w-[780px]">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="table-header text-left py-2 pr-3">#</th>
              <th className="table-header text-left py-2 pr-3">Loja</th>
              <th className="table-header text-right py-2 px-3">Realizado</th>
              <th className="table-header text-right py-2 px-3">YoY (dia {periodo.lastDay})</th>
              <th className="table-header text-right py-2 px-3">Meta</th>
              <th className="table-header text-right py-2 px-3"><>% Ating.<InfoTip text="% da meta atingida até agora. Vermelho = abaixo de 80%, Amarelo = 80-99%, Verde = 100%+." /></></th>
              <th className="table-header text-right py-2 px-3">Tend Fat</th>
              <th className="table-header text-right py-2 px-3">Tend vs AA</th>
              <th className="table-header text-right py-2 px-3"><>Proj. Meta<InfoTip text="Se continuar no ritmo atual (Tend Fat), qual % da meta vai atingir no fim do mês." /></></th>
              <th className="table-header text-right py-2 pl-3">Peso</th>
            </tr>
          </thead>
          <tbody>
            {lojaStats.map((l, i) => {
              const col = progressColor(l.ating ?? 0);
              return (
                <tr key={l.loja} className="border-b border-surface-border/50 hover:bg-surface-muted/40 transition-colors">
                  <td className="py-3 pr-3 text-xs font-bold text-zinc-300">#{i + 1}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
                      <span className="font-medium text-brand-black text-sm">{l.loja}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-semibold text-brand-black">
                    {formatBRL(l.realAtual, true)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {l.yoy !== null ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.yoy >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                        {l.yoy >= 0 ? '▲' : '▼'} {Math.abs(l.yoy).toFixed(1).replace('.', ',')}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-zinc-500">
                    {l.meta > 0 ? formatBRL(l.meta, true) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {l.ating !== null ? (
                      <div className="flex flex-col items-end gap-1">
                        <AtingBadge pct={l.ating} />
                        <div className="w-14 h-1 bg-surface-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(l.ating, 100)}%`, backgroundColor: col.bar }} />
                        </div>
                      </div>
                    ) : <span className="text-zinc-300 text-xs">—</span>}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-brand-black">
                    {formatBRL(l.tendFat, true)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {l.tendVsAA !== null ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.tendVsAA >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                        {l.tendVsAA >= 0 ? '▲' : '▼'} {Math.abs(l.tendVsAA).toFixed(1).replace('.', ',')}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {l.tendAting !== null ? (
                      <div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.tendAting >= 100 ? 'text-emerald-700 bg-emerald-50' : l.tendAting >= 80 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'}`}>
                          {l.tendAting.toFixed(1).replace('.', ',')}%
                        </span>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {formatBRL(l.tendFat, true)} de {formatBRL(l.meta, true)}
                        </p>
                      </div>
                    ) : <span className="text-zinc-300 text-xs">—</span>}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-10 h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${l.share.toFixed(1)}%`, backgroundColor: l.color }} />
                      </div>
                      <span className="text-xs font-semibold text-zinc-600">{l.share.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-border bg-surface-muted/30">
              <td colSpan={2} className="py-3 pr-3 text-xs font-semibold text-zinc-500 uppercase">Total</td>
              <td className="py-3 px-3 text-right font-mono text-sm font-bold text-brand-black">{formatBRL(grandReal, true)}</td>
              <td className="py-3 px-3 text-right">
                {grandYoY !== null ? (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grandYoY >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                    {grandYoY >= 0 ? '▲' : '▼'} {Math.abs(grandYoY).toFixed(1).replace('.',',')}%
                  </span>
                ) : '—'}
              </td>
              <td className="py-3 px-3 text-right font-mono text-xs">{grandMeta > 0 ? formatBRL(grandMeta, true) : '—'}</td>
              <td className="py-3 px-3 text-right">{grandAting !== null ? <AtingBadge pct={grandAting} /> : '—'}</td>
              <td className="py-3 px-3 text-right font-mono text-xs font-semibold">{formatBRL(grandTend, true)}</td>
              <td className="py-3 px-3 text-right">
                {grandTendVsAA !== null ? (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grandTendVsAA >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                    {grandTendVsAA >= 0 ? '▲' : '▼'} {Math.abs(grandTendVsAA).toFixed(1).replace('.',',')}%
                  </span>
                ) : '—'}
              </td>
              <td className="py-3 px-3 text-right">
                {grandTendAting !== null ? (
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grandTendAting >= 100 ? 'text-emerald-700 bg-emerald-50' : grandTendAting >= 80 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'}`}>
                      {grandTendAting.toFixed(1).replace('.', ',')}%
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {formatBRL(grandTend, true)} de {formatBRL(grandMeta, true)}
                    </p>
                  </div>
                ) : '—'}
              </td>
              <td className="py-3 pl-3 text-right">
                <span className="text-xs font-semibold text-zinc-600">100%</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
