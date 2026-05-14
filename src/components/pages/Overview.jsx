// src/components/pages/Overview.jsx
import { useMemo } from 'react';
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { DollarSign, Truck, Home, Target, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { useLabels } from '../../hooks/useLabels';
import KpiCard from '../ui/KpiCard';
import { BigProgressBar } from '../ui/GoalProgress';
import { CustomTooltip } from '../ui/ChartTooltip';
import InfoTip from '../ui/InfoTip';
import {
  sumValues, getMonthlyTotals, getDOWTotals, calcVariation,
  formatBRL, formatPercentPlain, formatPercent
} from '../../utils/formatters';

const COLORS = { casa: '#97A624', delivery: '#D9B504' };
const RADIAN = Math.PI / 180;
const BRLk = v => v >= 1e6 ? 'R$\u00a0'+(v/1e6).toFixed(1).replace('.',',')+'M' : v >= 1e3 ? 'R$\u00a0'+(v/1e3).toFixed(0)+'k' : 'R$\u00a0'+v.toFixed(0);

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

function CLabel({ x, y, width, value, showLabels }) {
  if (!showLabels || !value) return null;
  return <text x={(x||0)+(width||0)/2} y={(y||0)-5} textAnchor="middle" fontSize={10} fontWeight={500} fill="#52525B" fontFamily="DM Sans">{BRLk(value)}</text>;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

const DOW_LABELS = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];


// ── Tend Fat: realizado + projeção dias restantes por dia da semana ──────
// Médias calculadas excluindo o último dia (que é o dia do update, d-1)
// para alinhar com o cálculo da planilha de acompanhamento
function calcTendFat(recsAtual, lastDay, totalDays, ano, mes) {
  if (!recsAtual.length) return 0;

  // Todos os dias com dados, excluindo o lastDay do cálculo de médias
  // (lastDay = dia mais recente nos dados, cujos dados são o último dia completo)
  // A planilha calcula médias dos dias ANTERIORES ao último dia registrado
  const diasComDados = [...new Set(recsAtual.map(r => r.Data))].sort();
  const diasParaMedia = diasComDados.slice(0, -1); // exclui o último dia

  // Média por dia da semana (usando dias 1 até lastDay-1)
  const mediaPorDow = {};
  for (let dow = 0; dow < 7; dow++) {
    const recsDow = recsAtual.filter(r =>
      r.Dia_Semana_Num === dow && diasParaMedia.includes(r.Data)
    );
    const diasDow = new Set(recsDow.map(r => r.Data)).size;
    mediaPorDow[dow] = diasDow > 0
      ? recsDow.reduce((s, r) => s + r.Valor, 0) / diasDow
      : 0;
  }

  // Projeção dos dias restantes a partir de lastDay+1
  // CSV usa Dia_Semana_Num: 0=Dom, 1=Seg...6=Sáb (igual ao JS getDay())
  // Não precisa converter - dow_js == dow_csv diretamente
  let projecaoRestante = 0;
  for (let dia = lastDay + 1; dia <= totalDays; dia++) {
    const dow = new Date(ano, mes - 1, dia).getDay(); // 0=Dom, igual ao CSV
    projecaoRestante += mediaPorDow[dow] || 0;
  }

  const realizado = recsAtual.reduce((s, r) => s + r.Valor, 0);
  return realizado + projecaoRestante;
}

export default function Overview() {
  const { filteredData, rawData } = useFilters();
  const { getMetaTotal } = useMetas();
  const { showLabels } = useLabels();
  const lojas = useMemo(() => [...new Set(rawData.map(r => r.Loja))].sort(), [rawData]);

  // ── Período atual ──────────────────────────────────────────────
  const periodo = useMemo(() => {
    if (!rawData.length) return null;
    // Sempre deriva o período do rawData para garantir que ano = ano atual
    const allMonths = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const latestKey = allMonths[allMonths.length - 1];
    const [anoStr, mesStr] = latestKey.split('-');
    const ano = Number(anoStr), mes = Number(mesStr);
    const recsLatest = rawData.filter(r => r.Ano_Mes === latestKey);
    const lastDay = Math.max(...recsLatest.map(r => r.Dia));
    const isIncomplete = latestKey === allMonths[allMonths.length - 1];
    const label = recsLatest[0]?.Ano_Mes_Label || latestKey;
    const totalDays = daysInMonth(ano, mes);
    return { latestKey, ano, mes, lastDay, isIncomplete, label, totalDays };
  }, [filteredData, rawData]);

  // ── KPI stats com YoY cortado ──────────────────────────────────
  const stats = useMemo(() => {
    if (!periodo) return null;
    const { latestKey, ano, mes, lastDay, isIncomplete } = periodo;
    // Sempre usa só o ano atual (independente do filtro de ano)
    const anoAtualData  = filteredData.filter(r => r.Ano === ano);
    const total = sumValues(anoAtualData);
    const casa  = sumValues(anoAtualData.filter(r => r.Canal === 'CASA'));
    const del   = sumValues(anoAtualData.filter(r => r.Canal === 'DELIVERY'));

    // YoY mês atual (com corte)
    const curMonthRecs  = anoAtualData.filter(r => r.Ano_Mes === latestKey);
    const prevYearRecs  = rawData.filter(r =>
      r.Ano === ano - 1 && r.Mes === mes &&
      (!isIncomplete || r.Dia <= lastDay)
    );
    const yoyMes = calcVariation(sumValues(curMonthRecs), sumValues(prevYearRecs));

    // Projeção do mês
    const realizado   = sumValues(curMonthRecs);
    // Dias com faturamento real (exclui dias sem registro)
    // Usa dias fechados (exclui o dia atual, que pode estar incompleto)
    // Tend Fat = realizado + projeção dos dias restantes por dia da semana
    const projetado = calcTendFat(curMonthRecs, lastDay, periodo.totalDays, ano, mes);
    const mediaDiaria = lastDay > 0 ? realizado / lastDay : 0; // só para exibição
    const prevMesAno  = sumValues(rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes));
    const tendVsAA    = calcVariation(projetado, prevMesAno);

    return {
      total, casa, del, yoyMes, realizado, mediaDiaria, projetado, tendVsAA,
      pctCasa: total > 0 ? casa / total * 100 : 0,
      pctDel:  total > 0 ? del  / total * 100 : 0,
    };
  }, [filteredData, rawData, periodo]);

  // ── Contexto do mês ────────────────────────────────────────────
  const contexto = useMemo(() => {
    if (!periodo || !stats) return null;
    const { lastDay, totalDays, ano, mes, latestKey } = periodo;
    const diasRestantes = totalDays - lastDay;
    const pctMes = lastDay / totalDays * 100;

    // Meta
    const meta = getMetaTotal(latestKey, lojas);
    const faltaMeta = meta > 0 ? meta - stats.realizado : null;
    const necessarioPorDia = faltaMeta !== null && diasRestantes > 0
      ? faltaMeta / diasRestantes : null;

    // Melhor dia da semana no mês atual vs ano anterior
    const recsAtual = filteredData.filter(r => r.Ano_Mes === latestKey);
    const recsAnt   = rawData.filter(r => r.Ano === ano - 1 && r.Mes === mes && r.Dia <= lastDay);

    const dowStats = DOW_LABELS.map((label, idx) => {
      const cur  = recsAtual.filter(r => r.Dia_Semana_Num === idx);
      const prev = recsAnt.filter(r => r.Dia_Semana_Num === idx);
      const diasCur  = [...new Set(cur.map(r => r.Data))].length;
      const diasPrev = [...new Set(prev.map(r => r.Data))].length;
      const mediaCur  = diasCur  > 0 ? sumValues(cur)  / diasCur  : 0;
      const mediaPrev = diasPrev > 0 ? sumValues(prev) / diasPrev : 0;
      const variacao  = calcVariation(mediaCur, mediaPrev);
      return { label, mediaCur, mediaPrev, variacao };
    }).filter(d => d.mediaCur > 0);

    const melhorDia = [...dowStats].sort((a, b) => b.mediaCur - a.mediaCur)[0];

    return {
      diasRestantes, pctMes, meta, faltaMeta,
      necessarioPorDia, mediaDiariaAtual: stats.mediaDiaria,
      melhorDia,
    };
  }, [periodo, stats, filteredData, rawData, lojas, getMetaTotal]);

  // ── Gráfico: barras do ano atual + linha do ano anterior ────────
  // Mostra APENAS o ano atual (ou o filtrado), com linha do mesmo
  // período no ano anterior — sem misturar os dois anos nas barras.
  const chartData = useMemo(() => {
    if (!periodo) return [];

    // Determina qual ano mostrar nas barras
    // Se filtro de ano ativo: usa esse ano. Senão: ano mais recente com dados.
    const anos = [...new Set(filteredData.map(r => r.Ano))].sort();
    const anoAtual = anos[anos.length - 1];
    const anoAnt   = anoAtual - 1;

    // Meses do ano atual presentes nos dados filtrados
    const mesesAnoAtual = getMonthlyTotals(
      filteredData.filter(r => r.Ano === anoAtual)
    );

    return mesesAnoAtual.map(m => {
      // Mesmo mês no ano anterior (com corte se incompleto)
      const prevRecs = rawData.filter(r => r.Ano === anoAnt && r.Mes === m.mes);
      const hasPrev  = prevRecs.length > 0;
      const prevValue = !hasPrev
        ? null
        : (periodo.isIncomplete && m.key === periodo.latestKey)
          ? sumValues(rawData.filter(r =>
              r.Ano === anoAnt && r.Mes === m.mes && r.Dia <= periodo.lastDay
            ))
          : sumValues(prevRecs);
      return { ...m, prevYear: prevValue };
    });
  }, [filteredData, rawData, periodo]);

  const dowData = useMemo(() => getDOWTotals(filteredData), [filteredData]);

  const pieData = [
    { name: 'Casa',     value: stats?.casa  || 0 },
    { name: 'Delivery', value: stats?.del   || 0 },
  ];

  const metaMesAtual = useMemo(() => {
    if (!periodo) return null;
    const meta = getMetaTotal(periodo.latestKey, lojas);
    if (!meta) return null;
    const real = sumValues(filteredData.filter(r => r.Ano_Mes === periodo.latestKey));
    return { meta, real, label: periodo.label };
  }, [periodo, lojas, getMetaTotal, filteredData]);

  if (!stats || !periodo) return null;

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* Aviso de corte */}
      {periodo.isIncomplete && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Calendar size={13} className="flex-shrink-0" />
          <span>
            <strong>{periodo.label}</strong> incompleto — comparações YoY cortadas no dia <strong>{periodo.lastDay}</strong> para análise justa.
          </span>
        </div>
      )}

      {/* ── 4 KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Faturamento Total"
          value={stats.total}
          icon={DollarSign}
          accent="#97A624"
          tooltip="Soma do faturamento no período filtrado. A variação YoY compara com o mesmo mês do ano anterior, cortada no mesmo dia para análise justa."
          variation={stats.yoyMes}
          variationLabel={periodo.isIncomplete ? `YoY até dia ${periodo.lastDay}` : 'vs mesmo mês ano ant.'}
          delay={0}
        />
        <KpiCard
          title="Casa"
          value={stats.casa}
          icon={Home}
          accent="#8C1414"
          tooltip="Faturamento gerado pelo canal CASA (consumo no local) no período filtrado."
          subtitle={`${formatPercentPlain(stats.pctCasa)} do total`}
          delay={80}
        />
        <KpiCard
          title="Delivery"
          value={stats.del}
          icon={Truck}
          accent="#D9B504"
          tooltip="Faturamento gerado pelo canal DELIVERY no período filtrado."
          subtitle={`${formatPercentPlain(stats.pctDel)} do total`}
          delay={160}
        />
        <KpiCard
          title="Projeção do Mês"
          value={stats.projetado}
          icon={Target}
          accent="#97A624"
          tooltip="Tend Fat: média diária × dias do mês. Mostra como o mês deve fechar mantendo o ritmo atual. Tend vs AA = variação vs mesmo mês do ano passado (completo)."
          variation={stats.tendVsAA}
          variationLabel={`vs ${periodo.label.split('/')[0]}/${String(periodo.ano - 1).slice(2)}`}
          delay={240}
        />
      </div>

      {/* ── Contexto do mês ── */}
      {contexto && (
        <div
          className="bg-white border border-surface-border rounded-2xl p-5 animate-slide-up"
          style={{ animationDelay: '100ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Contexto do mês — {periodo.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Progress bar do mês */}
              <div className="w-24 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-brand-olive transition-all duration-700"
                  style={{ width: `${contexto.pctMes.toFixed(1)}%` }} />
              </div>
              <span className="text-xs text-zinc-400">
                dia {periodo.lastDay} de {periodo.totalDays} ({contexto.pctMes.toFixed(0)}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Dias restantes */}
            <div className="bg-surface-muted rounded-xl p-4">
              <div className="flex items-center gap-1 mb-2"><p className="text-xs text-zinc-400">Dias restantes</p><InfoTip text="Dias que faltam até o fim do mês, contando a partir do último dia com dados registrados." /></div>
              <p className="text-2xl font-bold font-display text-brand-black">{contexto.diasRestantes}</p>
              <p className="text-xs text-zinc-400 mt-1">até o fim do mês</p>
            </div>

            {/* Necessário por dia para meta */}
            <div className="bg-surface-muted rounded-xl p-4">
              <div className="flex items-center gap-1 mb-2"><p className="text-xs text-zinc-400">Necessário p/ meta</p><InfoTip text="Quanto precisa faturar por dia para atingir a meta. Cálculo: (Meta - Realizado) ÷ Dias restantes. Comparado com o ritmo diário atual." /></div>
              {contexto.necessarioPorDia !== null ? (
                <>
                  <p className="text-xl font-bold font-display text-brand-black">
                    {formatBRL(contexto.necessarioPorDia, true)}<span className="text-sm font-normal text-zinc-400">/dia</span>
                  </p>
                  <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${
                    contexto.mediaDiariaAtual >= contexto.necessarioPorDia ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {contexto.mediaDiariaAtual >= contexto.necessarioPorDia
                      ? <TrendingUp size={11}/>
                      : <TrendingDown size={11}/>
                    }
                    ritmo atual {formatBRL(contexto.mediaDiariaAtual, true)}/dia
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-400">Meta não definida</p>
              )}
            </div>

            {/* Melhor dia da semana */}
            <div className="bg-surface-muted rounded-xl p-4">
              <div className="flex items-center gap-1 mb-2"><p className="text-xs text-zinc-400">Melhor dia do mês</p><InfoTip text="Dia da semana com maior média de faturamento no mês atual. Mostra em qual dia a operação performa melhor." /></div>
              {contexto.melhorDia ? (
                <>
                  <p className="text-xl font-bold font-display text-brand-black">
                    {contexto.melhorDia.label}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-xs text-zinc-400">média</span>
                    <span className="text-xs font-semibold text-brand-black">
                      {formatBRL(contexto.melhorDia.mediaCur, true)}
                    </span>
                    {contexto.melhorDia.variacao !== null && (
                      <span className={`text-xs font-semibold ml-1 ${
                        contexto.melhorDia.variacao >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {contexto.melhorDia.variacao >= 0 ? '▲' : '▼'} {Math.abs(contexto.melhorDia.variacao).toFixed(1).replace('.', ',')}% YoY
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-400">Sem dados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Meta ── */}
      {metaMesAtual && (
        <BigProgressBar
          label={`Meta — ${metaMesAtual.label}`}
          sublabel="Progresso do mês mais recente"
          realizado={metaMesAtual.real}
          meta={metaMesAtual.meta}
          delay={150}
        />
      )}

      {/* ── Gráfico: barras mensais + linha ano anterior ── */}
      <div className="chart-card animate-slide-up" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="section-title">Faturamento Mensal</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Barras = atual · Linha = mesmo mês ano anterior</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#97A624' }} />Casa
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#D9B504' }} />Delivery
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: '#8C1414', borderTop: '2px dashed #8C1414' }} />Ano ant.
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="casa"     name="Casa"     fill="#97A624" radius={[0,0,0,0]} stackId="a" maxBarSize={36}>
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} />} />
            </Bar>
            <Bar dataKey="delivery" name="Delivery" fill="#D9B504" radius={[3,3,0,0]} stackId="a" maxBarSize={36}>
              <LabelList content={props => <CLabel {...props} showLabels={showLabels} />} />
            </Bar>
            <Line
              type="monotone"
              dataKey="prevYear"
              name="Ano anterior"
              stroke="#8C1414"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Dia da semana + Mix canal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="chart-card lg:col-span-2 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <h3 className="section-title mb-1">Por Dia da Semana</h3>
          <p className="text-xs text-zinc-400 mb-5">Volume acumulado por dia</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dowData} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="casa"     name="Casa"     fill="#97A624" radius={[4,4,0,0]} maxBarSize={32}>
                <LabelList content={props => <CLabel {...props} showLabels={showLabels} />} />
              </Bar>
              <Bar dataKey="delivery" name="Delivery" fill="#D9B504" radius={[4,4,0,0]} maxBarSize={32}>
                <LabelList content={props => <CLabel {...props} showLabels={showLabels} />} />
              </Bar>
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
                <Tooltip formatter={v => formatBRL(v, true)} />
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
