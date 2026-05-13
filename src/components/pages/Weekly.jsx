// src/components/pages/Weekly.jsx
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList
} from 'recharts';
import { useLabels } from '../../hooks/useLabels';
import { useFilters } from '../../hooks/useFilters';
import { sumValues, formatBRL, calcVariation, formatPercent } from '../../utils/formatters';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import InfoTip from '../ui/InfoTip';

const BRLk = v => v >= 1e6 ? 'R$\u00a0'+(v/1e6).toFixed(1).replace('.',',')+'M'
                : v >= 1e3 ? 'R$\u00a0'+(v/1e3).toFixed(0)+'k'
                : 'R$\u00a0'+v.toFixed(0);

function CLabel({ x, y, width, value, showLabels }) {
  if (!showLabels || !value) return null;
  return <text x={(x||0)+(width||0)/2} y={(y||0)-5} textAnchor="middle" fontSize={10} fontWeight={500} fill="#52525B" fontFamily="DM Sans">{BRLk(value)}</text>;
}
function PctLabel({ x, y, width, value, showLabels }) {
  if (!showLabels || value === null || value === undefined) return null;
  const color = value >= 0 ? '#059669' : '#dc2626';
  return <text x={(x||0)+(width||0)/2} y={value >= 0 ? (y||0)-5 : (y||0)+14} textAnchor="middle" fontSize={10} fontWeight={600} fill={color} fontFamily="DM Sans">{value >= 0 ? '+' : ''}{value.toFixed(1).replace('.', ',')}%</text>;
}

// Retorna as semanas de um mês, numeradas como S1, S2, S3...
function getWeeksOfMonth(records, ano, mes) {
  if (!records.length) return [];

  // Agrupa por Semana_Inicio dentro do mês
  const byWeek = {};
  records.forEach(r => {
    if (r.Ano !== ano || r.Mes !== mes) return;
    const key = r.Semana_Inicio;
    if (!byWeek[key]) byWeek[key] = { inicio: key, label: r.Semana_Label, records: [] };
    byWeek[key].records.push(r);
  });

  return Object.values(byWeek)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((w, i) => ({
      label: `S${i + 1}`,
      labelFull: w.label,
      inicio: w.inicio,
      casa:     sumValues(w.records.filter(r => r.Canal === 'CASA')),
      delivery: sumValues(w.records.filter(r => r.Canal === 'DELIVERY')),
      total:    sumValues(w.records),
    }));
}

export default function Weekly() {
  const { showLabels } = useLabels();
  const { filteredData, rawData } = useFilters();

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
    return { latestKey, ano, mes, lastDay, isIncomplete, label };
  }, [filteredData, rawData]);

  // ── Semanas do mês atual + mesmo mês ano anterior ──────────────
  const semanaData = useMemo(() => {
    if (!periodo) return [];
    const { ano, mes } = periodo;

    const semanasAtual = getWeeksOfMonth(filteredData, ano, mes);
    const semanasAnt   = getWeeksOfMonth(rawData, ano - 1, mes);

    return semanasAtual.map((s, i) => {
      const ant = semanasAnt[i];
      const yoy = ant ? calcVariation(s.total, ant.total) : null;
      return {
        ...s,
        totalAnt:    ant?.total    || null,
        casaAnt:     ant?.casa     || null,
        deliveryAnt: ant?.delivery || null,
        yoy,
        labelAnt:    ant?.labelFull || null,
      };
    });
  }, [filteredData, rawData, periodo]);

  // ── KPIs ───────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!semanaData.length) return null;
    const ultima = semanaData[semanaData.length - 1];
    const penultima = semanaData[semanaData.length - 2];
    const wowVar = penultima ? calcVariation(ultima.total, penultima.total) : null;
    const totalMes = semanaData.reduce((s, w) => s + w.total, 0);
    const totalMesAnt = semanaData.reduce((s, w) => s + (w.totalAnt || 0), 0);
    const yoyMes = totalMesAnt > 0 ? calcVariation(totalMes, totalMesAnt) : null;
    return { ultima, wowVar, totalMes, yoyMes };
  }, [semanaData]);

  if (!periodo || !semanaData.length) return null;

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* Aviso de corte */}
      {periodo.isIncomplete && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Calendar size={13} className="flex-shrink-0" />
          <span>
            <strong>{periodo.label}</strong> incompleto — semana atual parcial até o dia <strong>{periodo.lastDay}</strong>.
          </span>
        </div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="kpi-card">
            <p className="klbl text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Semana Atual</p>
            <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(kpis.ultima.total, true)}</p>
            {kpis.wowVar !== null && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${kpis.wowVar >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpis.wowVar >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                {formatPercent(kpis.wowVar)} vs semana ant.
              </div>
            )}
            {kpis.ultima.yoy !== null && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${kpis.ultima.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpis.ultima.yoy >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                {formatPercent(kpis.ultima.yoy)} YoY
              </div>
            )}
          </div>
          <div className="kpi-card">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Total {periodo.label}</p>
            <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(kpis.totalMes, true)}</p>
            {kpis.yoyMes !== null && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${kpis.yoyMes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpis.yoyMes >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                {formatPercent(kpis.yoyMes)} vs {periodo.label.split('/')[0]}/{String(periodo.ano - 1).slice(2)}
              </div>
            )}
          </div>
          <div className="kpi-card">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Semanas no mês</p>
            <p className="text-2xl font-bold font-display text-brand-black">{semanaData.length}</p>
            <p className="text-xs text-zinc-400 mt-2">
              {semanaData.filter(s => s.yoy !== null && s.yoy >= 0).length} acima do ano anterior
            </p>
          </div>
          <div className="kpi-card">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Melhor semana</p>
            {(() => {
              const best = [...semanaData].sort((a, b) => b.total - a.total)[0];
              return (
                <>
                  <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(best.total, true)}</p>
                  <p className="text-xs text-zinc-400 mt-2">{best.label} — {best.labelFull}</p>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Gráfico de colunas: semanas do mês atual vs ano anterior ── */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-1"><h3 className="section-title">Semanas de {periodo.label}</h3><InfoTip text="Cada semana do mês dividida em S1, S2, S3... Compara o faturamento desta semana com a mesma semana do ano anterior no mesmo mês." /></div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Colunas = {periodo.ano} · Linha tracejada = mesmo período {periodo.ano - 1}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-3 h-3 rounded-sm inline-block bg-brand-olive" />Casa {periodo.ano}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#D9B504' }} />Delivery {periodo.ano}
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={semanaData} margin={{ top: 16, right: 4, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#52525B', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = semanaData.find(s => s.label === label);
                return (
                  <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[210px]">
                    <p className="text-xs font-semibold text-zinc-700 mb-1">{label} — {d?.labelFull}</p>
                    <div className="space-y-1.5 text-xs mt-2">
                      <div className="flex justify-between gap-4">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-olive inline-block"/><span className="text-zinc-500">Casa {periodo.ano}</span></div>
                        <span className="font-semibold">{formatBRL(d?.casa || 0, true)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:'#D9B504'}}/><span className="text-zinc-500">Delivery {periodo.ano}</span></div>
                        <span className="font-semibold">{formatBRL(d?.delivery || 0, true)}</span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1.5 border-t border-surface-border">
                        <span className="font-semibold text-zinc-700">Total {periodo.ano}</span>
                        <span className="font-bold">{formatBRL(d?.total || 0, true)}</span>
                      </div>
                      {d?.totalAnt && (
                        <>
                          <div className="flex justify-between gap-4 pt-1.5 border-t border-surface-border">
                            <span className="text-zinc-400">Total {periodo.ano - 1}</span>
                            <span className="text-zinc-400">{formatBRL(d.totalAnt, true)}</span>
                          </div>
                          {d.yoy !== null && (
                            <div className={`flex justify-between gap-4 font-bold ${d.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              <span>YoY</span>
                              <span>{d.yoy >= 0 ? '▲ +' : '▼ '}{d.yoy.toFixed(1).replace('.', ',')}%</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="casa"     name="Casa"     fill="#97A624" stackId="a" radius={[0,0,0,0]} maxBarSize={56}>
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} />} />
            </Bar>
            <Bar dataKey="delivery" name="Delivery" fill="#D9B504" stackId="a" radius={[4,4,0,0]} maxBarSize={56}>
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tabela de semanas */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="table-header text-left py-2 pr-4">Semana</th>
                <th className="table-header text-left py-2 pr-4">Período</th>
                <th className="table-header text-right py-2 px-4">Casa</th>
                <th className="table-header text-right py-2 px-4">Delivery</th>
                <th className="table-header text-right py-2 px-4">Total {periodo.ano}</th>
                <th className="table-header text-right py-2 px-4">Total {periodo.ano - 1}</th>
                <th className="table-header text-right py-2 pl-4">YoY</th>
              </tr>
            </thead>
            <tbody>
              {semanaData.map(s => (
                <tr key={s.label} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                  <td className="py-3 pr-4 font-bold text-brand-black text-sm">{s.label}</td>
                  <td className="py-3 pr-4 text-xs text-zinc-400">{s.labelFull}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-brand-olive">{formatBRL(s.casa)}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm" style={{ color: '#D9B504' }}>{formatBRL(s.delivery)}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-brand-black">{formatBRL(s.total)}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-zinc-400">{s.totalAnt ? formatBRL(s.totalAnt) : '—'}</td>
                  <td className="py-3 pl-4 text-right">
                    {s.yoy !== null ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.yoy >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                        {s.yoy >= 0 ? '▲' : '▼'} {Math.abs(s.yoy).toFixed(1).replace('.', ',')}%
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-surface-border bg-surface-muted/30">
                <td className="py-3 pr-4 text-xs font-semibold text-zinc-500 uppercase" colSpan={2}>Total {periodo.label}</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-bold text-brand-olive">{formatBRL(semanaData.reduce((s,w)=>s+w.casa,0))}</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-bold" style={{ color: '#D9B504' }}>{formatBRL(semanaData.reduce((s,w)=>s+w.delivery,0))}</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-bold text-brand-black">{formatBRL(semanaData.reduce((s,w)=>s+w.total,0))}</td>
                <td className="py-3 px-4 text-right font-mono text-sm text-zinc-400">{formatBRL(semanaData.reduce((s,w)=>s+(w.totalAnt||0),0))}</td>
                <td className="py-3 pl-4 text-right">
                  {kpis?.yoyMes !== null ? (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${kpis.yoyMes >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                      {kpis.yoyMes >= 0 ? '▲' : '▼'} {Math.abs(kpis.yoyMes).toFixed(1).replace('.', ',')}%
                    </span>
                  ) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
