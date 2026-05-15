// src/components/pages/Overview.jsx
import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, BarChart, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { DollarSign, Home, Truck, Target, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useAlmoco } from '../../hooks/useAlmoco';
import { useMetas } from '../../hooks/useMetas';
import { useLabels } from '../../hooks/useLabels';
import KpiCard from '../ui/KpiCard';
import { BigProgressBar } from '../ui/GoalProgress';
import { CustomTooltip } from '../ui/ChartTooltip';
import InfoTip from '../ui/InfoTip';
import {
  sum, variation, monthlyTotals, dowTotals, calcTendFat, daysInMonth,
  formatBRL, formatPct, formatPctPlain, DOW_FULL, DOW_ABREV
} from '../../utils/formatters';

// ── helpers ──────────────────────────────────────────────────────
function getPeriodo(rawData) {
  if (!rawData.length) return null;
  const keys = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
  const key  = keys[keys.length - 1];
  const recs = rawData.filter(r => r.Ano_Mes === key);
  const [anoS, mesS] = key.split('-');
  const ano  = Number(anoS), mes = Number(mesS);
  const lastDay   = Math.max(...recs.map(r => r.Dia));
  const totalDays = daysInMonth(ano, mes);
  const label     = recs[0]?.Ano_Mes_Label || key;
  return { key, ano, mes, lastDay, totalDays, label, isIncomplete: lastDay < totalDays };
}

const BRLk = v => v>=1e6 ? `R$\u00a0${(v/1e6).toFixed(1).replace('.',',')}M`
                : v>=1e3 ? `R$\u00a0${(v/1e3).toFixed(0)}k`
                : `R$\u00a0${v.toFixed(0)}`;

function CLabel({ x, y, width, value, showLabels }) {
  if (!showLabels || !value) return null;
  return <text x={(x||0)+(width||0)/2} y={(y||0)-5} textAnchor="middle"
    fontSize={10} fontWeight={500} fill="#52525B" fontFamily="DM Sans">{BRLk(value)}</text>;
}

const PIE_COLORS = ['#97A624','#D9B504'];
const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return <text x={cx + r*Math.cos(-midAngle*RADIAN)} y={cy + r*Math.sin(-midAngle*RADIAN)}
    fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
    {(percent*100).toFixed(0)}%
  </text>;
}

export default function Overview() {
  const { filteredData, rawData } = useFilters();
  const { getMetaTotal } = useMetas();
  const { showLabels } = useLabels();
  const { getAlmoco } = useAlmoco();

  const periodo = useMemo(() => getPeriodo(rawData), [rawData]);
  const lojas   = useMemo(() => [...new Set(rawData.map(r => r.Loja))].sort(), [rawData]);

  // ── KPIs do mês atual — sempre usando rawData filtrado por ano atual ──
  const kpis = useMemo(() => {
    if (!periodo) return null;
    const { key, ano, mes, lastDay, totalDays } = periodo;

    // Dados do mês atual (ano atual, mês atual)
    const recsMes = rawData.filter(r => r.Ano === ano && r.Mes === mes);
    const total   = sum(recsMes);
    const casa    = sum(recsMes.filter(r => r.Canal === 'CASA'));
    const del     = sum(recsMes.filter(r => r.Canal === 'DELIVERY'));

    // YoY: mês atual vs mesmo mês ano anterior, cortado no mesmo dia
    const recsAA = rawData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Dia <= lastDay);
    const yoy    = variation(total, sum(recsAA));

    // Tend Fat
    const tendFat  = calcTendFat(recsMes, lastDay, totalDays, ano, mes);
    // Tend Fat por canal
    const recsMesCasa = recsMes.filter(r => r.Canal === 'CASA');
    const recsMesDel  = recsMes.filter(r => r.Canal === 'DELIVERY');
    const tendFatCasa   = calcTendFat(recsMesCasa, lastDay, totalDays, ano, mes);
    const tendFatDel    = calcTendFat(recsMesDel,  lastDay, totalDays, ano, mes);
    const totalAAFull   = sum(rawData.filter(r => r.Ano === ano-1 && r.Mes === mes));
    const tendVsAA      = variation(tendFat, totalAAFull);
    const totalAAFull_casa = sum(rawData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Canal === 'CASA'));
    const totalAAFull_del  = sum(rawData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Canal === 'DELIVERY'));
    const tendVsAACasa = variation(tendFatCasa, totalAAFull_casa);
    const tendVsAADel  = variation(tendFatDel,  totalAAFull_del);

    // Almoço
    const recsAlmoco = getAlmoco(ano, mes);
    const totalAlmoco = recsAlmoco.reduce((s,r) => s + r.Valor, 0);
    const pesoAlmoco  = casa > 0 ? totalAlmoco / casa * 100 : 0;
    const jantarCasa  = casa - totalAlmoco;

    return { total, casa, del, yoy, tendFat, tendVsAA,
      totalAlmoco, pesoAlmoco, jantarCasa,
      tendFatCasa, tendFatDel, tendVsAACasa, tendVsAADel,
      pctCasa: total>0 ? casa/total*100 : 0,
      pctDel:  total>0 ? del/total*100  : 0 };
  }, [rawData, periodo]);

  // ── Contexto do mês ──────────────────────────────────────────────
  const contexto = useMemo(() => {
    if (!periodo || !kpis) return null;
    const { key, ano, mes, lastDay, totalDays } = periodo;
    const diasRestantes = totalDays - lastDay;
    const pctMes = lastDay / totalDays * 100;

    const meta = getMetaTotal(key, lojas);
    const faltaMeta = meta > 0 ? meta - kpis.total : null;
    const necessarioPorDia = faltaMeta !== null && diasRestantes > 0
      ? faltaMeta / diasRestantes : null;
    const mediaDiariaAtual = lastDay > 0 ? kpis.total / lastDay : 0;

    // Melhor dia da semana
    const recsMes  = rawData.filter(r => r.Ano === ano && r.Mes === mes);
    const recsAA   = rawData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Dia <= lastDay);
    const melhorDia = Array.from({length:7},(_,dow) => {
      const r = recsMes.filter(x => x.Dia_Semana_Num === dow);
      const dias = new Set(r.map(x => x.Dia)).size;
      const media = dias > 0 ? sum(r)/dias : 0;
      const rAA = recsAA.filter(x => x.Dia_Semana_Num === dow);
      const diasAA = new Set(rAA.map(x => x.Dia)).size;
      const mediaAA = diasAA > 0 ? sum(rAA)/diasAA : 0;
      return { dow, media, variacao: variation(media, mediaAA) };
    }).filter(d => d.media > 0).sort((a,b) => b.media-a.media)[0];

    return { diasRestantes, pctMes, meta, necessarioPorDia, mediaDiariaAtual, melhorDia };
  }, [periodo, kpis, rawData, lojas, getMetaTotal]);

  // ── Gráfico mensal: barras ano atual + linha ano anterior ─────────
  const chartData = useMemo(() => {
    if (!periodo) return [];
    const { ano } = periodo;
    const cur = monthlyTotals(rawData.filter(r => r.Ano === ano));
    return cur.map(m => {
      const prev = rawData.filter(r => r.Ano === ano-1 && r.Mes === m.mes);
      const prevVal = prev.length > 0
        ? (m.key === periodo.key
          ? sum(prev.filter(r => r.Dia <= periodo.lastDay))
          : sum(prev))
        : null;
      const almocoMes    = getAlmoco(m.ano, m.mes).reduce((s,r) => s+r.Valor, 0);
      const jantarCasaMes = Math.max(0, (m.casa||0) - almocoMes);
      return { ...m, prevYear: prevVal, almoco: almocoMes, jantarCasa: jantarCasaMes };
    });
  }, [rawData, periodo, getAlmoco]);

  // ── DOW e meta ───────────────────────────────────────────────────
  const dowData = useMemo(() => {
    if (!periodo) return [];
    const { ano, mes } = periodo;
    return dowTotals(rawData.filter(r => r.Ano === ano && r.Mes === mes));
  }, [rawData, periodo]);

  const metaProgresso = useMemo(() => {
    if (!periodo) return null;
    const meta = getMetaTotal(periodo.key, lojas);
    if (!meta) return null;
    const real = sum(rawData.filter(r => r.Ano === periodo.ano && r.Mes === periodo.mes));
    return { meta, real, label: periodo.label };
  }, [periodo, lojas, getMetaTotal, rawData]);

  const pieData = [
    { name: 'Casa',     value: kpis?.casa || 0 },
    { name: 'Delivery', value: kpis?.del  || 0 },
  ];

  if (!periodo || !kpis) return null;

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* Aviso */}
      {periodo.isIncomplete && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Calendar size={13} className="flex-shrink-0"/>
          <span><strong>{periodo.label}</strong> — dados até dia <strong>{periodo.lastDay}</strong>.
          YoY e Tend Fat calculados com base nesse período.</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Faturamento Total" value={kpis.total} icon={DollarSign} accent="#97A624"
          tooltip="Faturamento acumulado do mês atual. YoY compara com o mesmo período do ano anterior."
          variation={kpis.yoy}
          variationLabel={`YoY até dia ${periodo.lastDay}`} delay={0} />
        <KpiCard title="Casa" value={kpis.casa} icon={Home} accent="#8C1414"
          tooltip={`Realizado Casa até dia ${periodo?.lastDay}. Tend Fat = R$${(kpis.tendFatCasa/1e6).toFixed(2).replace('.',',')}M (projeção do mês).`}
          variation={kpis.tendVsAACasa}
          variationLabel={`Tend vs ${periodo?.label?.split('/')[0]}/${String(periodo?.ano-1).slice(2)}`}
          subtitle={`Tend Fat ${formatBRL(kpis.tendFatCasa, true)}`}
          delay={80} />
        <KpiCard title="Delivery" value={kpis.del} icon={Truck} accent="#D9B504"
          tooltip={`Realizado Delivery até dia ${periodo?.lastDay}. Tend Fat = ${formatBRL(kpis.tendFatDel, true)} (projeção do mês).`}
          variation={kpis.tendVsAADel}
          variationLabel={`Tend vs ${periodo?.label?.split('/')[0]}/${String(periodo?.ano-1).slice(2)}`}
          subtitle={`Tend Fat ${formatBRL(kpis.tendFatDel, true)}`}
          delay={160} />
        <KpiCard title="Projeção do Mês" value={kpis.tendFat} icon={Target} accent="#97A624"
          tooltip="Tend Fat = Realizado + Σ(média de cada dia da semana × dias restantes). Mesma fórmula da planilha."
          variation={kpis.tendVsAA}
          variationLabel={`vs ${periodo.label.split('/')[0]}/${String(periodo.ano-1).slice(2)}`} delay={240} />
      </div>

      {/* Almoço — só aparece se houver dados */}
      {kpis.totalAlmoco > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <KpiCard title="Almoço — Total" value={kpis.totalAlmoco} icon={Home} accent="#0D9488"
            tooltip="Faturamento total do almoço nas casas no mês atual."
            subtitle={`${kpis.pesoAlmoco.toFixed(1).replace('.',',')}% do faturamento Casa`} delay={0} />
          <KpiCard title="Jantar Casa" value={kpis.jantarCasa} icon={Home} accent="#8C1414"
            tooltip="Faturamento Casa excluindo o almoço. Casa total − Almoço."
            subtitle={`${(100-kpis.pesoAlmoco).toFixed(1).replace('.',',')}% do faturamento Casa`} delay={80} />
          <div className="bg-white border border-surface-border rounded-2xl p-5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Peso do Almoço por Loja
            </p>
            <div className="space-y-2">
              {[...new Set(getAlmoco(periodo.ano, periodo.mes).map(r => r.Loja))].sort().map(loja => {
                const vAlmoco = getAlmoco(periodo.ano, periodo.mes)
                  .filter(r => r.Loja === loja).reduce((s,r) => s+r.Valor, 0);
                const vCasa = rawData.filter(r =>
                  r.Ano_Mes === periodo.key && r.Loja === loja && r.Canal === 'CASA'
                ).reduce((s,r) => s+r.Valor, 0);
                const peso = vCasa > 0 ? vAlmoco/vCasa*100 : 0;
                return (
                  <div key={loja} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 truncate mr-2">{loja}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500" style={{width:`${Math.min(peso,100)}%`}}/>
                      </div>
                      <span className="font-semibold text-zinc-700 w-10 text-right">{peso.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Contexto do mês */}
      {contexto && (
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-zinc-400"/>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Contexto — {periodo.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-brand-olive"
                  style={{ width: `${contexto.pctMes.toFixed(0)}%` }} />
              </div>
              <span className="text-xs text-zinc-400">dia {periodo.lastDay} de {periodo.totalDays} ({contexto.pctMes.toFixed(0)}%)</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-muted rounded-xl p-4">
              <div className="flex items-center gap-1 mb-2">
                <p className="text-xs text-zinc-400">Dias restantes</p>
                <InfoTip text="Dias que faltam até o fim do mês." />
              </div>
              <p className="text-2xl font-bold font-display text-brand-black">{contexto.diasRestantes}</p>
              <p className="text-xs text-zinc-400 mt-1">até o fim do mês</p>
            </div>
            <div className="bg-surface-muted rounded-xl p-4">
              <div className="flex items-center gap-1 mb-2">
                <p className="text-xs text-zinc-400">Necessário p/ meta</p>
                <InfoTip text="(Meta − Realizado) ÷ Dias restantes. Comparado com o ritmo diário atual." />
              </div>
              {contexto.necessarioPorDia !== null ? (
                <>
                  <p className="text-xl font-bold font-display text-brand-black">
                    {formatBRL(contexto.necessarioPorDia, true)}<span className="text-sm font-normal text-zinc-400">/dia</span>
                  </p>
                  <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${contexto.mediaDiariaAtual >= contexto.necessarioPorDia ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {contexto.mediaDiariaAtual >= contexto.necessarioPorDia ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                    ritmo atual {formatBRL(contexto.mediaDiariaAtual, true)}/dia
                  </div>
                </>
              ) : <p className="text-sm text-zinc-400 mt-1">Meta não definida</p>}
            </div>
            <div className="bg-surface-muted rounded-xl p-4">
              <div className="flex items-center gap-1 mb-2">
                <p className="text-xs text-zinc-400">Melhor dia do mês</p>
                <InfoTip text="Dia da semana com maior média de faturamento no mês atual." />
              </div>
              {contexto.melhorDia ? (
                <>
                  <p className="text-xl font-bold font-display text-brand-black">
                    {DOW_FULL[contexto.melhorDia.dow]}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-xs text-zinc-400">média</span>
                    <span className="text-xs font-semibold text-brand-black">{formatBRL(contexto.melhorDia.media, true)}</span>
                    {contexto.melhorDia.variacao !== null && (
                      <span className={`text-xs font-semibold ml-1 ${contexto.melhorDia.variacao >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {contexto.melhorDia.variacao >= 0 ? '▲' : '▼'} {Math.abs(contexto.melhorDia.variacao).toFixed(1).replace('.',',')}% YoY
                      </span>
                    )}
                  </div>
                </>
              ) : <p className="text-sm text-zinc-400">Sem dados</p>}
            </div>
          </div>
        </div>
      )}

      {/* Meta */}
      {metaProgresso && (
        <BigProgressBar label={`Meta — ${metaProgresso.label}`}
          sublabel="Progresso do mês" realizado={metaProgresso.real} meta={metaProgresso.meta} delay={150} />
      )}

      {/* Gráfico mensal */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="section-title">Faturamento Mensal</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Barras = {periodo.ano} · Linha = {periodo.ano-1}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-teal-600"/>Almoço</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#97A624'}}/>Jantar Casa</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#D9B504'}}/>Delivery</div>
            <div className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed inline-block" style={{borderColor:'#8C1414'}}/>Ano ant.</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{top:12,right:4,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false}/>
            <XAxis dataKey="label" tick={{fontSize:11,fill:'#A1A1AA'}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>formatBRL(v,true)} tick={{fontSize:11,fill:'#A1A1AA'}} axisLine={false} tickLine={false} width={76}/>
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = chartData.find(x => x.label === label);
              return (
                <div className="bg-white border border-surface-border rounded-xl shadow-card-hover p-3 min-w-[200px]">
                  <p className="text-xs font-semibold text-zinc-500 mb-2">{label}</p>
                  <div className="space-y-1.5 text-xs">
                    {d?.almoco > 0 && <div className="flex justify-between gap-4"><span className="text-teal-600">Almoço</span><span className="font-semibold text-teal-600">{formatBRL(d.almoco, true)}</span></div>}
                    {d?.almoco > 0 && <div className="flex justify-between gap-4"><span className="text-zinc-400">Jantar Casa</span><span className="font-semibold">{formatBRL(d.jantarCasa, true)}</span></div>}
                    {!d?.almoco && <div className="flex justify-between gap-4"><span className="text-zinc-400">Casa</span><span className="font-semibold">{formatBRL(d?.casa||0, true)}</span></div>}
                    <div className="flex justify-between gap-4"><span className="text-zinc-400">Delivery</span><span className="font-semibold">{formatBRL(d?.delivery||0, true)}</span></div>
                    {d?.prevYear && <div className="flex justify-between gap-4 pt-1 border-t border-surface-border"><span className="text-zinc-400">Ano ant.</span><span className="text-zinc-400">{formatBRL(d.prevYear, true)}</span></div>}
                  </div>
                </div>
              );
            }}/>
            <Bar dataKey="almoco"     name="Almoço"      fill="#0D9488" stackId="a" radius={[0,0,0,0]} maxBarSize={40} />
            <Bar dataKey="jantarCasa" name="Jantar Casa"  fill="#97A624" stackId="a" radius={[0,0,0,0]} maxBarSize={40} />
            <Bar dataKey="delivery"   name="Delivery"     fill="#D9B504" stackId="a" radius={[3,3,0,0]} maxBarSize={40}>
              <LabelList dataKey="delivery" content={(p) => {
                if (!showLabels) return null;
                const d = chartData[p.index];
                if (!d) return null;
                const total = (d.casa||0)+(d.delivery||0);
                return <text x={p.x+(p.width||0)/2} y={(p.y||0)-5} textAnchor="middle" fontSize={10} fontWeight={500} fill="#52525B" fontFamily="DM Sans">{total>=1e6?`R$\xa0${(total/1e6).toFixed(1).replace('.',',')}M`:total>=1e3?`R$\xa0${(total/1e3).toFixed(0)}k`:`R$\xa0${total.toFixed(0)}`}</text>;
              }}/>
            </Bar>
            <Line type="monotone" dataKey="prevYear" name="Ano anterior"
              stroke="#8C1414" strokeWidth={2} strokeDasharray="5 4" dot={false}
              activeDot={{r:4,strokeWidth:0}} connectNulls={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* DOW + Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="chart-card lg:col-span-2">
          <h3 className="section-title mb-1">Por Dia da Semana</h3>
          <p className="text-xs text-zinc-400 mb-5">Volume acumulado — {periodo.label}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dowData} margin={{top:12,right:4,left:0,bottom:0}} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:11,fill:'#A1A1AA'}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>formatBRL(v,true)} tick={{fontSize:11,fill:'#A1A1AA'}} axisLine={false} tickLine={false} width={76}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="casa"     name="Casa"     fill="#97A624" radius={[4,4,0,0]} maxBarSize={32} />
              <Bar dataKey="delivery" name="Delivery" fill="#D9B504" radius={[4,4,0,0]} maxBarSize={32}>
                <LabelList dataKey="delivery" content={(p) => {
                  if (!showLabels) return null;
                  const d = dowData[p.index];
                  if (!d) return null;
                  const total = (d.casa||0)+(d.delivery||0);
                  return <text x={p.x+(p.width||0)/2} y={(p.y||0)-5} textAnchor="middle" fontSize={9} fontWeight={500} fill="#52525B" fontFamily="DM Sans">{total>=1e6?`R$\xa0${(total/1e6).toFixed(1).replace('.',',')}M`:total>=1e3?`R$\xa0${(total/1e3).toFixed(0)}k`:`R$\xa0${total.toFixed(0)}`}</text>;
                }}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card flex flex-col">
          <h3 className="section-title mb-1">Mix de Canal</h3>
          <p className="text-xs text-zinc-400 mb-3">Participação % — {periodo.label}</p>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                  paddingAngle={3} dataKey="value" labelLine={false} label={PieLabel}>
                  {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}
                </Pie>
                <Tooltip formatter={v=>formatBRL(v,true)}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {pieData.map((d,i)=>(
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{background:PIE_COLORS[i]}}/>
                  <span className="text-xs text-zinc-600">{d.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-brand-black">{formatBRL(d.value,true)}</span>
                  <span className="text-xs text-zinc-400 ml-1.5">
                    {kpis.total>0 ? formatPctPlain(d.value/kpis.total*100) : '0%'}
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
