// src/components/pages/YoY.jsx
import { useMemo, useState } from 'react';
import {
  ComposedChart, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Cell, LabelList, PieChart, Pie
} from 'recharts';
import { useLabels } from '../../hooks/useLabels';
import { useFilters } from '../../hooks/useFilters';
import { CustomTooltip } from '../ui/ChartTooltip';
import { sumValues, formatBRL, formatPercentPlain, calcVariation, formatPercent } from '../../utils/formatters';
import { TrendingUp, TrendingDown, Info, Scissors } from 'lucide-react';

const YEAR_COLORS = ['#0D0D0D', '#97A624', '#D9B504', '#8C1414'];
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];


const BRLk = v => v >= 1e6 ? 'R$ '+(v/1e6).toFixed(1).replace('.',',')+'M' : v >= 1e3 ? 'R$ '+(v/1e3).toFixed(0)+'k' : 'R$ '+v.toFixed(0);
function CLabel({ x, y, width, value, showLabels, pct }) {
  if (!showLabels || value === null || value === undefined || value === 0) return null;
  const display = pct ? (value >= 0 ? '+' : '') + value.toFixed(1).replace('.', ',') + '%' : BRLk(value);
  const color = pct ? (value >= 0 ? '#059669' : '#dc2626') : '#52525B';
  return <text x={(x||0)+(width||0)/2} y={pct && value < 0 ? (y||0)+14 : (y||0)-5} textAnchor="middle" fontSize={10} fontWeight={500} fill={color} fontFamily="DM Sans">{display}</text>;
}

export default function YoY() {
  const { showLabels } = useLabels();
  const { filteredData, rawData } = useFilters();
  const [view, setView]       = useState('total');
  const [adjusted, setAdjusted] = useState(false); // false = completo, true = ajustado

  // Detect latest date in data to know the cutoff day
  const cutoff = useMemo(() => {
    const dates = rawData.map(r => r.Data).filter(Boolean).sort();
    if (!dates.length) return null;
    const latest = new Date(dates[dates.length - 1]);
    return { year: latest.getFullYear(), month: latest.getMonth() + 1, day: latest.getDate() };
  }, [rawData]);

  const years = useMemo(() => {
    return [...new Set(filteredData.map(r => r.Ano))].sort();
  }, [filteredData]);

  // For each month/year, optionally cap to cutoff day if it's the "current" month
  function getMonthValue(year, mes1, canal) {
    let recs = filteredData.filter(r => r.Ano === year && r.Mes === mes1);
    if (canal !== 'total') recs = recs.filter(r => r.Canal === canal.toUpperCase());

    if (adjusted && cutoff && year < cutoff.year) {
      // Cut previous years to the same day of month as cutoff
      if (mes1 === cutoff.month) {
        // Only include up to cutoff.day
        recs = recs.filter(r => r.Dia <= cutoff.day);
      } else if (mes1 > cutoff.month) {
        // Months beyond current month in previous year — zero them out
        return 0;
      }
    }
    return sumValues(recs);
  }

  // Monthly comparison data
  const monthlyByYear = useMemo(() => {
    return MESES_ABREV.map((label, idx) => {
      const mes1 = idx + 1;
      const row = { mes: label, _mes: mes1 };
      years.forEach(year => {
        row[`${year}`] = getMonthValue(year, mes1, view);
      });
      // Mark partial month
      row._partial = cutoff && mes1 === cutoff.month;
      return row;
    });
  }, [filteredData, years, view, adjusted, cutoff]);

  // Annual totals (always full, with note for current year)
  const annualTotals = useMemo(() => {
    return years.map((year, i) => {
      const isCurrentYear = cutoff && year === cutoff.year;

      // When adjusted, cut all years to the same period as the current year
      // (up to cutoff.month / cutoff.day)
      const cutRecs = (recs) => {
        if (!adjusted || !cutoff) return recs;
        return recs.filter(r =>
          r.Mes < cutoff.month ||
          (r.Mes === cutoff.month && r.Dia <= cutoff.day)
        );
      };

      const allRecs = filteredData.filter(r => r.Ano === year);
      const recs    = cutRecs(allRecs);

      const total = sumValues(recs);
      const casa  = sumValues(recs.filter(r => r.Canal === 'CASA'));
      const del   = sumValues(recs.filter(r => r.Canal === 'DELIVERY'));

      const prevYear = years[i - 1];
      const prevRecs = prevYear ? cutRecs(filteredData.filter(r => r.Ano === prevYear)) : [];

      const growth    = calcVariation(total, sumValues(prevRecs));

      // growthAdj = same as growth when adjusted is on (already cut),
      // otherwise compute it separately for the table column
      let growthAdj = null;
      if (!adjusted && cutoff && prevYear) {
        const curCut  = filteredData.filter(r =>
          r.Ano === year &&
          (r.Mes < cutoff.month || (r.Mes === cutoff.month && r.Dia <= cutoff.day))
        );
        const prevCut = filteredData.filter(r =>
          r.Ano === prevYear &&
          (r.Mes < cutoff.month || (r.Mes === cutoff.month && r.Dia <= cutoff.day))
        );
        growthAdj = calcVariation(sumValues(curCut), sumValues(prevCut));
      }

      return { year, total, casa, del, growth, growthAdj, isCurrentYear };
    });
  }, [filteredData, years, adjusted, cutoff]);

  // Partial month label
  const partialLabel = cutoff
    ? `até dia ${cutoff.day}/${String(cutoff.month).padStart(2,'0')}`
    : '';

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* Top: KPI cards per year */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {annualTotals.map((d, i) => (
          <div
            key={d.year}
            className="kpi-card relative"
            style={{ borderTop: `3px solid ${YEAR_COLORS[i % YEAR_COLORS.length]}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-zinc-400">{d.year}</p>
              {d.isCurrentYear && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  parcial
                </span>
              )}
            </div>
            <p className="text-xl font-bold font-display text-brand-black">{formatBRL(d.total, true)}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Casa</span>
                <span className="font-medium">{formatBRL(d.casa, true)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Delivery</span>
                <span className="font-medium">{formatBRL(d.del, true)}</span>
              </div>
              {/* Show adjusted growth if toggled, else regular */}
              {(adjusted && d.growthAdj !== null ? d.growthAdj : d.growth) !== null && (
                <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${
                  (adjusted && d.growthAdj !== null ? d.growthAdj : d.growth) >= 0
                    ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {(adjusted && d.growthAdj !== null ? d.growthAdj : d.growth) >= 0
                    ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                  {formatPercent(adjusted && d.growthAdj !== null ? d.growthAdj : d.growth)}
                  <span className="text-zinc-400 font-normal ml-0.5">
                    {adjusted ? 'mesmo período' : 'YoY'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Adjusted toggle notice */}
      {cutoff && (
        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm transition-all ${
          adjusted
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-surface-muted border-surface-border text-zinc-500'
        }`}>
          <Info size={15} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {adjusted ? (
              <span>
                <strong>Comparação ajustada:</strong> anos anteriores cortados no mesmo dia ({partialLabel}).
                O mês de {MESES_ABREV[cutoff.month - 1]}/{cutoff.year} está incompleto — comparação justa entre períodos equivalentes.
              </span>
            ) : (
              <span>
                O mês de <strong>{MESES_ABREV[cutoff.month - 1]}/{cutoff.year}</strong> está incompleto ({partialLabel}).
                Ative <strong>Comparação Ajustada</strong> para cortar anos anteriores no mesmo dia e ter uma comparação justa.
              </span>
            )}
          </div>
          <button
            onClick={() => setAdjusted(a => !a)}
            className={`flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              adjusted
                ? 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                : 'bg-brand-black text-white hover:bg-zinc-800'
            }`}
          >
            <Scissors size={12} />
            {adjusted ? 'Desativar ajuste' : 'Comparação Ajustada'}
          </button>
        </div>
      )}

      {/* Line chart */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="section-title">Evolução Mensal por Ano</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {adjusted
                ? `Meses anteriores cortados no mesmo dia — comparação equivalente`
                : 'Totais completos de cada mês por ano'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-surface-muted rounded-lg p-0.5 gap-0.5">
              {['total', 'casa', 'delivery'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    view === v ? 'bg-white shadow-sm text-brand-black' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {v === 'total' ? 'Total' : v === 'casa' ? 'Casa' : 'Delivery'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyByYear} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: '#A1A1AA' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={v => formatBRL(v, true)}
              tick={{ fontSize: 11, fill: '#A1A1AA' }}
              axisLine={false}
              tickLine={false}
              width={76}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {/* Vertical reference line at current month */}
            {cutoff && (
              <ReferenceLine
                x={MESES_ABREV[cutoff.month - 1]}
                stroke="#D97706"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: adjusted ? `corte dia ${cutoff.day}` : 'mês atual',
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: '#D97706',
                }}
              />
            )}
            {years.map((year, i) => (
              <Line
                key={year}
                type="monotone"
                dataKey={`${year}`}
                name={`${year}`}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                strokeWidth={2}
                dot={false}
                strokeDasharray={adjusted && cutoff && year === cutoff.year ? '6 3' : undefined}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {adjusted && cutoff && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
            <Scissors size={11} />
            Linha tracejada = ano atual (parcial). Meses após {MESES_ABREV[cutoff.month - 1]} zerados nos anos anteriores.
          </p>
        )}
      </div>

      {/* Annual bar comparison */}
      <div className="chart-card">
        <h3 className="section-title mb-1">Faturamento Anual — Casa vs Delivery</h3>
        <p className="text-xs text-zinc-400 mb-5">
          {adjusted && cutoff
            ? `Todos os anos cortados no mesmo período — ${partialLabel}`
            : annualTotals.some(a => a.isCurrentYear)
              ? `* ${cutoff?.year} inclui apenas dados até ${partialLabel}`
              : 'Composição por canal em cada ano'}
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={annualTotals} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="casa" name="Casa"     fill="#97A624" radius={[0,0,0,0]} stackId="a" maxBarSize={60}>
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} pct={false} />} />
            </Bar>
            <Bar dataKey="del"  name="Delivery" fill="#D9B504" radius={[4,4,0,0]} stackId="a" maxBarSize={60}>
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} pct={false} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="chart-card overflow-x-auto">
        <h3 className="section-title mb-4">Resumo Anual</h3>
        <table className="w-full min-w-[580px]">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="table-header text-left py-2 pr-4">Ano</th>
              <th className="table-header text-right py-2 px-4">Total</th>
              <th className="table-header text-right py-2 px-4">Casa</th>
              <th className="table-header text-right py-2 px-4">Delivery</th>
              <th className="table-header text-right py-2 px-4">% Del</th>
              <th className="table-header text-right py-2 px-4">YoY completo</th>
              <th className="table-header text-right py-2 pl-4">YoY ajustado</th>
            </tr>
          </thead>
          <tbody>
            {annualTotals.map(d => (
              <tr key={d.year} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                <td className="py-3 pr-4">
                  <span className="font-semibold text-brand-black">{d.year}</span>
                  {d.isCurrentYear && (
                    <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      parcial
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm">{formatBRL(d.total)}</td>
                <td className="py-3 px-4 text-right font-mono text-sm text-brand-olive">{formatBRL(d.casa)}</td>
                <td className="py-3 px-4 text-right font-mono text-sm" style={{ color: '#D9B504' }}>{formatBRL(d.del)}</td>
                <td className="py-3 px-4 text-right text-sm">{d.total > 0 ? formatPercentPlain(d.del/d.total*100) : '—'}</td>
                <td className="py-3 px-4 text-right">
                  {d.growth !== null ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.growth >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                      {formatPercent(d.growth)}
                    </span>
                  ) : <span className="text-zinc-300">—</span>}
                </td>
                <td className="py-3 pl-4 text-right">
                  {d.growthAdj !== null ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.growthAdj >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                      {formatPercent(d.growthAdj)}
                    </span>
                  ) : <span className="text-zinc-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-zinc-400 mt-3">
          <strong>YoY completo</strong> = ano inteiro vs ano inteiro &nbsp;|&nbsp;
          <strong>YoY ajustado</strong> = mesmo período ({partialLabel}) entre anos
        </p>
      </div>
    </div>
  );
}
