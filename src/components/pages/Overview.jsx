// src/components/pages/Overview.jsx
import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, BarChart, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { DollarSign, Home, Truck, Target, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useAlmoco } from '../../hooks/useAlmoco';
import { useTicket } from '../../hooks/useTicket';
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
function getPeriodo(data) {
  // data can be filtered (e.g. by mes) or full rawData
  if (!data.length) return null;
  const keys = [...new Set(data.map(r => r.Ano_Mes))].sort();
  const key  = keys[keys.length - 1];
  const recs = data.filter(r => r.Ano_Mes === key);
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
  const { getTicket, getDesconto } = useTicket();

  const lojas   = useMemo(() => [...new Set(rawData.map(r => r.Loja))].sort(), [rawData]);

  // Aplica filtros de loja e canal (mas não de ano/mês) para comparações YoY
  const { filters } = useFilters();

  // Período: respeita filtro de mês e ano
  const periodoData = useMemo(() => {
    // Aplica filtros de ano e mês para determinar o período correto
    let data = rawData;
    if (filters.ano !== 'Todos') data = data.filter(r => r.Ano === Number(filters.ano));
    if (filters.meses.size > 0)  data = data.filter(r => filters.meses.has(r.Mes));
    return data;
  }, [rawData, filters]);

  const periodo = useMemo(() => getPeriodo(periodoData), [periodoData]);
  const baseData = useMemo(() => rawData.filter(r => {
    if (filters.lojas.size > 0 && !filters.lojas.has(r.Loja)) return false;
    if (filters.canal !== 'Todos' && r.Canal !== filters.canal)  return false;
    return true;
  }), [rawData, filters]);

  // ── KPIs do mês atual — sempre usando rawData filtrado por ano atual ──
  const kpis = useMemo(() => {
    if (!periodo) return null;
    const { key, ano, mes, lastDay, totalDays } = periodo;

    // Dados do mês atual (ano atual, mês atual)
    const recsMes = baseData.filter(r => r.Ano === ano && r.Mes === mes);
    const total   = sum(recsMes);
    const casa    = sum(recsMes.filter(r => r.Canal === 'CASA'));
    const del     = sum(recsMes.filter(r => r.Canal === 'DELIVERY'));

    // YoY: mês atual vs mesmo mês ano anterior, cortado no mesmo dia
    const recsAA = baseData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Dia <= lastDay);
    const yoy    = variation(total, sum(recsAA));

    // Tend Fat
    const tendFat  = calcTendFat(recsMes, lastDay, totalDays, ano, mes);
    // Tend Fat por canal
    const recsMesCasa = recsMes.filter(r => r.Canal === 'CASA');
    const recsMesDel  = recsMes.filter(r => r.Canal === 'DELIVERY');
    const tendFatCasa   = calcTendFat(recsMesCasa, lastDay, totalDays, ano, mes);
    const tendFatDel    = calcTendFat(recsMesDel,  lastDay, totalDays, ano, mes);
    const totalAAFull   = sum(baseData.filter(r => r.Ano === ano-1 && r.Mes === mes));
    const tendVsAA      = variation(tendFat, totalAAFull);
    const totalAAFull_casa = sum(baseData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Canal === 'CASA'));
    const totalAAFull_del  = sum(baseData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Canal === 'DELIVERY'));
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
  }, [baseData, periodo]);

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
    const recsMes  = baseData.filter(r => r.Ano === ano && r.Mes === mes);
    const recsAA   = baseData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Dia <= lastDay);
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
  }, [periodo, kpis, baseData, rawData, lojas, getMetaTotal]);

  // ── Gráfico mensal: barras ano atual + linha ano anterior ─────────
  const chartData = useMemo(() => {
    if (!periodo) return [];
    const { ano } = periodo;
    const cur = monthlyTotals(baseData.filter(r => r.Ano === ano));
    return cur.map(m => {
      const prev = baseData.filter(r => r.Ano === ano-1 && r.Mes === m.mes);
      const prevVal = prev.length > 0
        ? (m.key === periodo.key
          ? sum(prev.filter(r => r.Dia <= periodo.lastDay))
          : sum(prev))
        : null;
      const almocoMes    = getAlmoco(m.ano, m.mes).reduce((s,r) => s+r.Valor, 0);
      const jantarCasaMes = Math.max(0, (m.casa||0) - almocoMes);
      return { ...m, prevYear: prevVal, almoco: almocoMes, jantarCasa: jantarCasaMes };
    });
  }, [baseData, periodo, getAlmoco]);

  // ── DOW e meta ───────────────────────────────────────────────────
  const dowData = useMemo(() => {
    if (!periodo) return [];
    const { ano, mes } = periodo;
    return dowTotals(baseData.filter(r => r.Ano === ano && r.Mes === mes));
  }, [rawData, periodo]);

  // ── Dados gerais do almoço ────────────────────────────────────
  const almocoData = useMemo(() => {
    if (!periodo) return null;
    const { ano, mes, key, lastDay, totalDays } = periodo;

    // Aplica filtro de loja (igual ao baseData)
    // Não filtra por Dia aqui — o corte de lastDay é feito só no mês atual via recsAlmoco
    const filtrarAlmoco = (recs, maxDia = 31) => {
      const filtered = recs.filter(r => r.Dia <= maxDia);
      if (filters.lojas.size === 0) return filtered;
      return filtered.filter(r => filters.lojas.has(r.Loja));
    };

    // Mês atual — corta no lastDay para não incluir hoje (pode estar incompleto)
    const recsAlmoco = filtrarAlmoco(getAlmoco(ano, mes), lastDay);
    const totalAlmoco = recsAlmoco.reduce((s,r) => s+r.Valor, 0);
    if (totalAlmoco === 0) return null;

    const casaMes = sum(baseData.filter(r => r.Ano === ano && r.Mes === mes && r.Canal === 'CASA'));
    const pesoAlmoco = casaMes > 0 ? totalAlmoco/casaMes*100 : 0;

    // Tend Fat almoço - almoço só existe seg-sex, usa Dia_Semana_Num do registro
    // Se Dia_Semana_Num não existir, calcula do campo Data
    const recsAlmocoFixed = recsAlmoco.map(r => ({
      ...r,
      Dia_Semana_Num: r.Dia_Semana_Num !== undefined
        ? r.Dia_Semana_Num
        : new Date(r.Data).getDay(),
    }));
    const tendAlmoco = calcTendFat(recsAlmocoFixed, lastDay, totalDays, ano, mes);

    // Evolução mensal (com filtro de loja aplicado)
    const evolucao = {};
    const MESES_ABREV = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    // Mostra só meses com dados de almoço (não os zeros do início do ano)
    if (getAlmoco) {
      for (let m = 1; m <= mes; m++) {
        // Para o mês atual, corta no lastDay; para meses passados, usa tudo
        const maxDia = m === mes ? lastDay : 31;
        const v = filtrarAlmoco(getAlmoco(ano, m), maxDia).reduce((s,r) => s+r.Valor, 0);
        if (v > 0) {
          evolucao[`${MESES_ABREV[m]}/${String(ano).slice(2)}`] = v;
        }
      }
    }

    // Por loja (já filtrado por filtrarAlmoco acima)
    const lojasAlmoco = [...new Set(recsAlmoco.map(r => r.Loja))].sort();
    const porLoja = lojasAlmoco.map(loja => {
        const vAlmoco        = recsAlmoco.filter(r => r.Loja === loja).reduce((s,r) => s+r.Valor, 0);
        const vCasa          = baseData.filter(r => r.Ano_Mes === key && r.Loja === loja && r.Canal === 'CASA').reduce((s,r) => s+r.Valor, 0);
        const recsAlmocoLoja = filtrarAlmoco(getAlmoco(ano, mes), lastDay).filter(r => r.Loja === loja).map(r => ({
          ...r, Dia_Semana_Num: r.Dia_Semana_Num !== undefined ? r.Dia_Semana_Num : new Date(r.Data).getDay(),
        }));
        const tendAlmocoLoja = calcTendFat(recsAlmocoLoja, lastDay, totalDays, ano, mes);
        const inicio = getAlmoco && (() => {
          for (let m2 = 1; m2 <= mes; m2++) {
            const recs = getAlmoco(ano, m2).filter(r => r.Loja === loja);
            if (recs.length) return recs.map(r => r.Data).sort()[0];
          }
          return null;
        })();
        return { loja, vAlmoco, vCasa, peso: vCasa>0?vAlmoco/vCasa*100:0, inicio, tendAlmocoLoja };
      }).sort((a,b) => b.vAlmoco - a.vAlmoco);

    return { totalAlmoco, pesoAlmoco, tendAlmoco, evolucao, porLoja, nLojas: lojasAlmoco.length };
  }, [periodo, getAlmoco, baseData, filters]);

  const metaProgresso = useMemo(() => {
    if (!periodo) return null;
    const meta = getMetaTotal(periodo.key, lojas);
    if (!meta) return null;
    const real = sum(rawData.filter(r => r.Ano === periodo.ano && r.Mes === periodo.mes));
    return { meta, real, label: periodo.label };
  }, [periodo, lojas, getMetaTotal, rawData]);

  const pieData = [
    { name: 'Salão',    value: kpis?.casa || 0 },
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
        <KpiCard title="Salão" value={kpis.casa} icon={Home} accent="#8C1414"
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

      {/* ── TICKET MÉDIO + DESCONTO ── */}
      {periodo && (() => {
        const lojasF = filters.lojas;
        // Busca apenas o número de compradores do hook
        const tk    = getTicket(periodo.ano, periodo.mes, null,       lojasF);
        const tkSal = getTicket(periodo.ano, periodo.mes, 'CASA',     lojasF);
        const tkDel = getTicket(periodo.ano, periodo.mes, 'DELIVERY', lojasF);
        const dsc   = getDesconto(periodo.ano, periodo.mes, lojasF);
        if (tk.pessoas === 0) return null;

        // Faturamento real do período (já filtrado por loja/canal via baseData)
        const recsMesAtual = baseData.filter(r => r.Ano === periodo.ano && r.Mes === periodo.mes);
        const fatTotal  = sum(recsMesAtual);
        const fatSalao  = sum(recsMesAtual.filter(r => r.Canal === 'CASA'));
        const fatDel    = sum(recsMesAtual.filter(r => r.Canal === 'DELIVERY'));

        // Ticket médio = faturamento / compradores (metodologia Zig)
        const ticketTotal = tk.pessoas    > 0 ? fatTotal / tk.pessoas    : 0;
        const ticketSal   = tkSal.pessoas > 0 ? fatSalao / tkSal.pessoas : 0;
        const ticketDel   = tkDel.pessoas > 0 ? fatDel   / tkDel.pessoas : 0;

        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-surface-border rounded-2xl p-5">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Ticket Médio</p>
                <InfoTip text="Faturamento total dividido pelo número de compradores no período (metodologia Zig)." />
              </div>
              <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(ticketTotal)}</p>
              <p className="text-xs text-zinc-400 mt-1">{tk.pessoas.toLocaleString('pt-BR')} pessoas</p>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-5">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Ticket Salão</p>
                <InfoTip text="Faturamento salão dividido pelo número de compradores no canal Casa." />
              </div>
              <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(ticketSal)}</p>
              <p className="text-xs text-zinc-400 mt-1">{tkSal.pessoas.toLocaleString('pt-BR')} pessoas</p>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-5">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Ticket Delivery</p>
                <InfoTip text="Faturamento delivery dividido pelo número de pedidos no canal Delivery." />
              </div>
              <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(ticketDel)}</p>
              <p className="text-xs text-zinc-400 mt-1">{tkDel.pessoas.toLocaleString('pt-BR')} pedidos</p>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-5">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Desconto</p>
                <InfoTip text="Total de desconto concedido no período e % sobre o faturamento bruto." />
              </div>
              <p className="text-2xl font-bold font-display text-rose-600">{formatBRL(dsc.desconto, true)}</p>
              <p className="text-xs text-zinc-400 mt-1">{dsc.pct.toFixed(1).replace('.',',')}% do bruto</p>
            </div>
          </div>
        );
      })()}

      {/* ── ALMOÇO ── */}
      {almocoData && (
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="w-1 h-5 rounded-full bg-teal-500 flex-shrink-0"/>
            <h3 className="section-title">Almoço — {periodo.label}</h3>
            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5">
              {almocoData.nLojas} {almocoData.nLojas === 1 ? 'loja ativa' : 'lojas ativas'}
            </span>
          </div>
          {/* Observação */}
          <div className="flex items-start gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2 mb-4">
            <span className="flex-shrink-0">ℹ️</span>
            <span>Faturamento do almoço nas unidades Casa — serviço de <strong>segunda a sexta</strong> (sem feriados), das <strong>11h às 15h</strong>.</span>
          </div>

          {/* Cards resumo */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-surface-muted rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Total almoço</p>
                <InfoTip text="Faturamento total do almoço no mês atual, considerando todas as lojas ativas com serviço de almoço." />
              </div>
              <p className="text-xl font-bold font-display text-teal-600">{formatBRL(almocoData.totalAlmoco, true)}</p>
            </div>
            <div className="bg-surface-muted rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Peso no Salão</p>
                <InfoTip text="% que o almoço representa no faturamento total do canal Salão. Indica a relevância do almoço dentro do serviço presencial." />
              </div>
              <p className="text-xl font-bold font-display text-brand-black">{almocoData.pesoAlmoco.toFixed(1).replace('.',',')}%</p>
            </div>
            <div className="bg-surface-muted rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Tend Fat almoço</p>
                <InfoTip text="Projeção do faturamento do almoço para o mês cheio. Calculado com a mesma fórmula do Tend Fat: médias por dia da semana × dias restantes." />
              </div>
              <p className="text-xl font-bold font-display text-brand-black">{formatBRL(almocoData.tendAlmoco, true)}</p>
            </div>

          </div>

          {/* Gráfico + Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Evolução mensal */}
            <div>
              <div className="flex items-center gap-1 mb-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Crescimento mensal</p>
                <InfoTip text="Evolução do faturamento do almoço mês a mês em 2026. Barras maiores = mais faturamento. Cresce conforme novas lojas aderem ao serviço." />
              </div>
              <div className="flex items-end gap-2 h-20">
                {Object.entries(almocoData.evolucao).map(([label, val]) => {
                  const maxVal = Math.max(...Object.values(almocoData.evolucao));
                  const pct = maxVal > 0 ? val/maxVal : 0;
                  const isCur = label === periodo.label;
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t flex flex-col items-center justify-end"
                        style={{height:'64px'}}>
                        {val > 0 && (
                          <span className={`text-[9px] font-semibold mb-0.5 ${isCur ? 'text-teal-700' : 'text-zinc-400'}`}>
                            {val>=1e6?`R$${(val/1e6).toFixed(1).replace('.',',')}M`:val>=1e3?`R$${(val/1e3).toFixed(0)}k`:`R$${val.toFixed(0)}`}
                          </span>
                        )}
                        <div className="w-full rounded-t-lg transition-all"
                          style={{
                            height: `${Math.max(pct*100,val>0?8:2)}%`,
                            background: val === 0 ? '#E4E4E0' : isCur ? '#0D9488' : '#5ECEBD',
                            opacity: val === 0 ? 0.4 : 1,
                          }}/>
                      </div>
                      <span className={`text-[10px] font-${isCur?'semibold':'normal'} ${isCur?'text-teal-600':'text-zinc-400'}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ranking por loja */}
            <div>
              <div className="flex items-center gap-1 mb-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Por loja</p>
                <InfoTip text="Ranking das lojas com almoço ativo. Badge verde mostra quando cada loja iniciou o serviço. % = peso do almoço no faturamento Salão da loja." />
              </div>
              <div className="space-y-2.5">
                {almocoData.porLoja.map(l => {
                  const maxVal = almocoData.porLoja[0]?.vAlmoco || 1;
                  return (
                    <div key={l.loja}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-700">{l.loja}</span>
                          {l.inicio && (
                            <span className="text-[10px] bg-teal-50 text-teal-600 border border-teal-100 rounded px-1.5 py-0.5">
                              desde {l.inicio.split('-').slice(1).reverse().join('/')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-semibold text-zinc-700">{formatBRL(l.vAlmoco, true)}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">Tend: <span className="text-teal-600 font-semibold">{formatBRL(l.tendAlmocoLoja, true)}</span></div>
                          </div>
                          <span className="text-teal-600 font-semibold w-10 text-right">{l.peso.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500"
                          style={{width:`${l.vAlmoco/maxVal*100}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
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
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#97A624'}}/>Jantar Salão</div>
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
                    {d?.almoco > 0 && <div className="flex justify-between gap-4"><span className="text-zinc-400">Jantar Salão</span><span className="font-semibold">{formatBRL(d.jantarCasa, true)}</span></div>}
                    {!d?.almoco && <div className="flex justify-between gap-4"><span className="text-zinc-400">Salão</span><span className="font-semibold">{formatBRL(d?.casa||0, true)}</span></div>}
                    <div className="flex justify-between gap-4"><span className="text-zinc-400">Delivery</span><span className="font-semibold">{formatBRL(d?.delivery||0, true)}</span></div>
                    {d?.prevYear && <div className="flex justify-between gap-4 pt-1 border-t border-surface-border"><span className="text-zinc-400">Ano ant.</span><span className="text-zinc-400">{formatBRL(d.prevYear, true)}</span></div>}
                  </div>
                </div>
              );
            }}/>
            <Bar dataKey="almoco"     name="Almoço"      fill="#0D9488" stackId="a" radius={[0,0,0,0]} maxBarSize={40} />
            <Bar dataKey="jantarCasa" name="Jantar Salão"  fill="#97A624" stackId="a" radius={[0,0,0,0]} maxBarSize={40} />
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

      {/* DOW — Tabela média e volume 2025 vs 2026 */}
      {periodo && (() => {
        const { ano, mes, lastDay } = periodo;
        const DOW_LABELS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
        const rows = Array.from({length:7}, (_,dow) => {
          const r26 = baseData.filter(r => r.Ano === ano   && r.Mes === mes && r.Dia_Semana_Num === dow);
          const r25 = baseData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Dia_Semana_Num === dow);
          const dias26 = new Set(r26.map(r => r.Dia)).size;
          const dias25 = new Set(r25.map(r => r.Dia)).size;
          const vol26  = sum(r26);
          const vol25  = sum(r25);
          const med26  = dias26 > 0 ? vol26/dias26 : 0;
          const med25  = dias25 > 0 ? vol25/dias25 : 0;
          const varMed = variation(med26, med25);
          return { dow, label: DOW_LABELS[dow], dias26, dias25, vol26, vol25, med26, med25, varMed };
        }).filter(r => r.vol26 > 0 || r.vol25 > 0);

        return (
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="section-title">Média por Dia da Semana</h3>
                <InfoTip text="Média diária de faturamento por dia da semana no mês selecionado. Compara 2026 com o mesmo mês de 2025." />
              </div>
              <span className="text-xs text-zinc-400">{periodo.label} vs {periodo.label.split('/')[0]}/{String(periodo.ano-1).slice(2)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/30">
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Dia</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Média {ano-1}</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Média {ano}</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Variação</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Dias {ano-1}</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Dias {ano}</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Volume {ano-1}</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Volume {ano}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.dow} className="border-b border-surface-border/50 hover:bg-surface-muted/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-brand-black">{r.label}</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-400">{r.med25 > 0 ? formatBRL(r.med25, true) : '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-brand-black">{r.med26 > 0 ? formatBRL(r.med26, true) : '—'}</td>
                      <td className="py-3 px-4 text-right">
                        {r.varMed !== null ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                            ${r.varMed >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                            {r.varMed >= 0 ? '▲' : '▼'} {Math.abs(r.varMed).toFixed(1).replace('.',',')}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400 text-xs">{r.dias25 > 0 ? r.dias25 : '—'}</td>
                      <td className="py-3 px-4 text-right text-zinc-500 text-xs font-semibold">{r.dias26 > 0 ? r.dias26 : '—'}</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-400">{r.vol25 > 0 ? formatBRL(r.vol25, true) : '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-brand-black">{r.vol26 > 0 ? formatBRL(r.vol26, true) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Mix de Canal */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="section-title mb-1">Mix de Canal</h3>
            <p className="text-xs text-zinc-400">Participação % — {periodo.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-8 justify-center">
          <div style={{width:200, height:170}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                  paddingAngle={3} dataKey="value" labelLine={false} label={PieLabel}>
                  {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}
                </Pie>
                <Tooltip formatter={v=>formatBRL(v,true)}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {pieData.map((d,i)=>(
              <div key={d.name} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{background:PIE_COLORS[i]}}/>
                  <span className="text-sm text-zinc-600">{d.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-brand-black">{formatBRL(d.value,true)}</span>
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
