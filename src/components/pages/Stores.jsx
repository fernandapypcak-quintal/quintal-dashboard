// src/components/pages/Stores.jsx
import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie
} from 'recharts';
import { Store, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { useLabels } from '../../hooks/useLabels';
import { progressColor, AtingBadge } from '../ui/GoalProgress';
import {
  sumValues, getMonthlyTotals,
  formatBRL, formatPercentPlain, formatPercent, calcVariation
} from '../../utils/formatters';

const STORE_COLORS = ['#97A624','#D9B504','#D9CB04','#8C1414','#0D9488','#7C3AED','#EA580C','#0284C7','#65A30D','#6B7280'];
const BRLk = v => v >= 1e6 ? 'R$\u00a0'+(v/1e6).toFixed(1).replace('.',',')+'M'
                : v >= 1e3 ? 'R$\u00a0'+(v/1e3).toFixed(0)+'k'
                : 'R$\u00a0'+v.toFixed(0);

function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

const DOW_LABELS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

export default function Stores() {
  const { filteredData, rawData } = useFilters();
  const { getMeta, getMetaTotal } = useMetas();
  const { showLabels } = useLabels();
  const [expandedLoja, setExpandedLoja] = useState(null);

  // ── Período atual ──────────────────────────────────────────────
  const periodo = useMemo(() => {
    if (!rawData.length) return null;
    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const latestKey = allMonths[allMonths.length - 1];
    const [anoStr, mesStr] = latestKey.split('-');
    const ano = Number(anoStr), mes = Number(mesStr);
    const recsLatest = rawData.filter(r => r.Ano_Mes === latestKey);
    const lastDay = Math.max(...recsLatest.map(r => r.Dia));
    const label = recsLatest[0]?.Ano_Mes_Label || latestKey;
    const totalDays = daysInMonth(ano, mes);
    const prevKey = allMonths[allMonths.length - 2];
    return { latestKey, prevKey, ano, mes, lastDay, label, totalDays };
  }, [rawData]);

  const lojas = useMemo(() => [...new Set(rawData.map(r => r.Loja))].sort(), [rawData]);

  // ── Dados por loja ─────────────────────────────────────────────
  const lojaStats = useMemo(() => {
    if (!periodo) return [];
    const { latestKey, prevKey, ano, mes, lastDay, totalDays } = periodo;

    const grandTotal = sumValues(rawData.filter(r => r.Ano_Mes === latestKey));

    return lojas.map((loja, idx) => {
      const color = STORE_COLORS[idx % STORE_COLORS.length];

      // Mês atual
      const recsCur  = rawData.filter(r => r.Ano_Mes === latestKey && r.Loja === loja);
      const realAtual = sumValues(recsCur);
      const casa      = sumValues(recsCur.filter(r => r.Canal === 'CASA'));
      const delivery  = sumValues(recsCur.filter(r => r.Canal === 'DELIVERY'));

      // Mês anterior
      const recsPrev  = prevKey ? rawData.filter(r => r.Ano_Mes === prevKey && r.Loja === loja) : [];
      const realAnt   = sumValues(recsPrev);

      // Mesmo mês ano anterior (com corte no mesmo dia)
      const recsAA = rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes && r.Loja === loja && r.Dia <= lastDay);
      const realAA = sumValues(recsAA);
      const yoy    = calcVariation(realAtual, realAA);

      // Meta
      const meta   = getMeta(latestKey, loja);
      const ating  = meta > 0 ? realAtual / meta * 100 : null;

      // Tend Fat
      const mediaDiaria = lastDay > 0 ? realAtual / lastDay : 0;
      const tendFat     = mediaDiaria * totalDays;
      const prevAAfull  = sumValues(rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes && r.Loja === loja));
      const tendVsAA    = calcVariation(tendFat, prevAAfull);

      // Share
      const share = grandTotal > 0 ? realAtual / grandTotal * 100 : 0;

      // MoM
      const mom = calcVariation(realAtual, realAnt);

      // Melhor dia da semana
      const dowStats = DOW_LABELS.map((label, dowIdx) => {
        const recs = recsCur.filter(r => r.Dia_Semana_Num === dowIdx);
        const dias = [...new Set(recs.map(r => r.Data))].length;
        const media = dias > 0 ? sumValues(recs) / dias : 0;
        return { label: label.slice(0, 3), media };
      }).filter(d => d.media > 0);
      const melhorDia = [...dowStats].sort((a, b) => b.media - a.media)[0];

      // Evolução mensal (últimos 6 meses)
      const monthly = getMonthlyTotals(
        rawData.filter(r => r.Loja === loja)
      ).slice(-6);

      return {
        loja, color, idx,
        realAtual, realAnt, realAA, casa, delivery,
        meta, ating, tendFat, tendVsAA, prevAAfull,
        share, mom, yoy, melhorDia, monthly,
        mediaDiaria,
      };
    }).sort((a, b) => b.realAtual - a.realAtual);
  }, [lojas, rawData, periodo, getMeta]);

  if (!periodo) return null;

  const grandMeta  = lojaStats.reduce((s, l) => s + l.meta, 0);
  const grandReal  = lojaStats.reduce((s, l) => s + l.realAtual, 0);
  const grandAting = grandMeta > 0 ? grandReal / grandMeta * 100 : null;

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* ── RANKING — tabela principal ── */}
      <div className="chart-card overflow-x-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="section-title">Ranking de Lojas — {periodo.label}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Realizado até dia {periodo.lastDay} · Meta e Tend Fat para o mês cheio
            </p>
          </div>
        </div>

        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="table-header text-left py-2 pr-3">Loja</th>
              <th className="table-header text-right py-2 px-3">Mês Ant.</th>
              <th className="table-header text-right py-2 px-3">Meta {periodo.ano}</th>
              <th className="table-header text-right py-2 px-3">Realizado</th>
              <th className="table-header text-right py-2 px-3">% Ating.</th>
              <th className="table-header text-right py-2 px-3">Tend Fat</th>
              <th className="table-header text-right py-2 px-3">Tend vs AA</th>
              <th className="table-header text-right py-2 px-3">YoY</th>
              <th className="table-header text-right py-2 pl-3">Share</th>
            </tr>
          </thead>
          <tbody>
            {lojaStats.map((l, i) => (
              <tr key={l.loja} className="border-b border-surface-border/50 hover:bg-surface-muted/40 transition-colors">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="font-medium text-brand-black text-sm">{l.loja}</span>
                    <span className="text-xs text-zinc-300">#{i + 1}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs text-zinc-400">{formatBRL(l.realAnt, true)}</td>
                <td className="py-3 px-3 text-right font-mono text-xs text-zinc-500">
                  {l.meta > 0 ? formatBRL(l.meta, true) : <span className="text-zinc-300">—</span>}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm font-semibold text-brand-black">{formatBRL(l.realAtual, true)}</td>
                <td className="py-3 px-3 text-right">
                  {l.ating !== null ? (
                    <div className="flex flex-col items-end gap-1">
                      <AtingBadge pct={l.ating} />
                      <div className="w-16 h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(l.ating, 100)}%`, backgroundColor: progressColor(l.ating).bar }} />
                      </div>
                    </div>
                  ) : <span className="text-zinc-300 text-xs">—</span>}
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-brand-black">{formatBRL(l.tendFat, true)}</td>
                <td className="py-3 px-3 text-right">
                  {l.tendVsAA !== null ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.tendVsAA >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                      {l.tendVsAA >= 0 ? '▲' : '▼'} {Math.abs(l.tendVsAA).toFixed(1).replace('.', ',')}%
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 px-3 text-right">
                  {l.yoy !== null ? (
                    <span className={`text-xs font-semibold ${l.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {l.yoy >= 0 ? '▲' : '▼'} {Math.abs(l.yoy).toFixed(1).replace('.', ',')}%
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 pl-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-10 h-1 bg-surface-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${l.share.toFixed(1)}%`, backgroundColor: l.color }} />
                    </div>
                    <span className="text-xs font-semibold text-zinc-600">{l.share.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-border bg-surface-muted/30">
              <td className="py-3 pr-3 text-xs font-semibold text-zinc-500 uppercase">Total</td>
              <td className="py-3 px-3 text-right font-mono text-xs">{formatBRL(lojaStats.reduce((s,l)=>s+l.realAnt,0), true)}</td>
              <td className="py-3 px-3 text-right font-mono text-xs">{grandMeta > 0 ? formatBRL(grandMeta, true) : '—'}</td>
              <td className="py-3 px-3 text-right font-mono text-sm font-bold text-brand-black">{formatBRL(grandReal, true)}</td>
              <td className="py-3 px-3 text-right">{grandAting !== null ? <AtingBadge pct={grandAting} /> : '—'}</td>
              <td className="py-3 px-3 text-right font-mono text-xs font-semibold">{formatBRL(lojaStats.reduce((s,l)=>s+l.tendFat,0), true)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── CARDS INDIVIDUAIS POR LOJA ── */}
      <div className="space-y-3">
        {lojaStats.map((l) => {
          const isExpanded = expandedLoja === l.loja;
          const col = progressColor(l.ating ?? 0);

          return (
            <div key={l.loja} className="bg-white border border-surface-border rounded-2xl overflow-hidden transition-all duration-200"
              style={{ borderLeft: `4px solid ${l.color}` }}>

              {/* Header do card — sempre visível */}
              <button
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-surface-muted/30 transition-colors"
                onClick={() => setExpandedLoja(isExpanded ? null : l.loja)}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Nome */}
                  <div className="min-w-[120px]">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">{l.loja}</p>
                    <p className="text-xl font-bold font-display" style={{ color: l.color }}>{formatBRL(l.realAtual, true)}</p>
                  </div>

                  {/* Mini stats */}
                  <div className="flex items-center gap-5 flex-wrap">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Meta</p>
                      <p className="text-sm font-semibold text-zinc-600">{l.meta > 0 ? formatBRL(l.meta, true) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Ating.</p>
                      {l.ating !== null
                        ? <p className="text-sm font-bold" style={{ color: col.text }}>{l.ating.toFixed(1).replace('.', ',')}%</p>
                        : <p className="text-sm text-zinc-300">—</p>
                      }
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Tend Fat</p>
                      <p className="text-sm font-semibold text-zinc-700">{formatBRL(l.tendFat, true)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Tend vs AA</p>
                      {l.tendVsAA !== null
                        ? <p className={`text-sm font-bold ${l.tendVsAA >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {l.tendVsAA >= 0 ? '▲ +' : '▼ '}{Math.abs(l.tendVsAA).toFixed(1).replace('.', ',')}%
                          </p>
                        : <p className="text-sm text-zinc-300">—</p>
                      }
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">YoY</p>
                      {l.yoy !== null
                        ? <p className={`text-sm font-bold ${l.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {l.yoy >= 0 ? '▲ +' : '▼ '}{Math.abs(l.yoy).toFixed(1).replace('.', ',')}%
                          </p>
                        : <p className="text-sm text-zinc-300">—</p>
                      }
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Melhor dia</p>
                      <p className="text-sm font-semibold text-zinc-700">{l.melhorDia?.label || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Share</p>
                      <p className="text-sm font-semibold text-zinc-700">{l.share.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  {/* Progress bar mini */}
                  {l.ating !== null && (
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(l.ating, 100)}%`, backgroundColor: col.bar }} />
                      </div>
                    </div>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                </div>
              </button>

              {/* Detalhe expandido */}
              {isExpanded && (
                <div className="border-t border-surface-border px-5 py-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Evolução mensal */}
                    <div>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Evolução Mensal</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={l.monthly} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => BRLk(v)} tick={{ fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={60} />
                          <Tooltip formatter={v => formatBRL(v, true)} />
                          <Bar dataKey="casa" name="Casa" fill={l.color} stackId="a" radius={[0,0,0,0]} maxBarSize={32}>
                            <LabelList content={props => {
                              if (!showLabels || !props.value) return null;
                              return <text x={(props.x||0)+(props.width||0)/2} y={(props.y||0)-5} textAnchor="middle" fontSize={9} fill="#52525B" fontFamily="DM Sans">{BRLk(props.value)}</text>;
                            }} />
                          </Bar>
                          <Bar dataKey="delivery" name="Delivery" fill="#D9B504" stackId="a" radius={[3,3,0,0]} maxBarSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Detalhes numéricos */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Detalhe {periodo.label}</p>

                      {[
                        { label: 'Casa', value: formatBRL(l.casa), color: l.color },
                        { label: 'Delivery', value: formatBRL(l.delivery), color: '#D9B504' },
                        { label: `Realizado (dia ${periodo.lastDay})`, value: formatBRL(l.realAtual), bold: true },
                        { label: `Mês anterior`, value: formatBRL(l.realAnt), muted: true },
                        { label: `Mesmo período ${periodo.ano - 1}`, value: formatBRL(l.realAA), muted: true },
                        { label: 'Meta', value: l.meta > 0 ? formatBRL(l.meta) : '—', muted: true },
                        { label: 'Tend Fat (projeção)', value: formatBRL(l.tendFat), bold: true },
                        { label: `Mesmo mês ${periodo.ano - 1} (completo)`, value: formatBRL(l.prevAAfull), muted: true },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-surface-border/50 last:border-0">
                          <span className="text-xs text-zinc-500">{row.label}</span>
                          <span className={`text-sm font-mono ${row.bold ? 'font-bold text-brand-black' : row.muted ? 'text-zinc-400' : 'font-semibold'}`}
                            style={row.color ? { color: row.color } : {}}>
                            {row.value}
                          </span>
                        </div>
                      ))}

                      {/* Atingimento visual */}
                      {l.ating !== null && (
                        <div className="pt-2">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-zinc-500">Atingimento da meta</span>
                            <span className="font-bold" style={{ color: col.text }}>{l.ating.toFixed(1).replace('.', ',')}%</span>
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
    </div>
  );
}
