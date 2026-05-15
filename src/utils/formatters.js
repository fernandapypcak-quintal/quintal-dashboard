// src/utils/formatters.js

export const MESES_ABREV = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
export const MESES_FULL  = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
// Dia_Semana_Num: 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb  (igual JS getDay())
export const DOW_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
export const DOW_ABREV = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function formatBRL(v, compact = false) {
  if (v == null || isNaN(v)) return 'R$ 0,00';
  if (compact && v >= 1e6) return `R$ ${(v/1e6).toFixed(1).replace('.',',')}M`;
  if (compact && v >= 1e3) return `R$ ${(v/1e3).toFixed(1).replace('.',',')}k`;
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}).format(v);
}

export function formatPct(v, decimals=1) {
  if (v == null || isNaN(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals).replace('.',',')}%`;
}

export function formatPctPlain(v, decimals=1) {
  if (v == null || isNaN(v)) return '—';
  return `${v.toFixed(decimals).replace('.',',')}%`;
}

export function variation(cur, prev) {
  if (!prev || prev === 0) return null;
  return (cur - prev) / prev * 100;
}

export function sum(recs) {
  return recs.reduce((s, r) => s + (r.Valor || 0), 0);
}

// Agrupa array por campo, retorna objeto {key: [recs]}
export function groupBy(recs, key) {
  return recs.reduce((acc, r) => {
    const k = r[key];
    (acc[k] = acc[k] || []).push(r);
    return acc;
  }, {});
}

// Totais mensais ordenados por Ano_Mes
export function monthlyTotals(recs) {
  const g = groupBy(recs, 'Ano_Mes');
  return Object.entries(g)
    .map(([key, rows]) => {
      const casa     = sum(rows.filter(r => r.Canal === 'CASA'));
      const delivery = sum(rows.filter(r => r.Canal === 'DELIVERY'));
      const f = rows[0];
      return { key, label: f.Ano_Mes_Label, ano: f.Ano, mes: f.Mes, casa, delivery, total: casa+delivery };
    })
    .sort((a,b) => a.key.localeCompare(b.key));
}

// Tend Fat — lógica idêntica à planilha de acompanhamento:
// Médias: todos os dias com dados (1..lastDay)
// Projeção: dias lastDay+1..totalDays
// Dia_Semana_Num 0=Dom..6=Sáb = JS getDay()
export function calcTendFat(recs, lastDay, totalDays, ano, mes) {
  if (!recs.length || lastDay >= totalDays) return sum(recs);

  // Média por dia da semana
  const mediaDow = {};
  for (let dow = 0; dow < 7; dow++) {
    const r = recs.filter(x => x.Dia_Semana_Num === dow);
    const dias = new Set(r.map(x => x.Data)).size;
    mediaDow[dow] = dias > 0 ? sum(r) / dias : 0;
  }

  // Projeção
  let proj = 0;
  for (let d = lastDay + 1; d <= totalDays; d++) {
    proj += mediaDow[new Date(ano, mes-1, d).getDay()] || 0;
  }

  return sum(recs) + proj;
}

// Totais por dia da semana (para gráfico DOW)
export function dowTotals(recs) {
  const g = groupBy(recs, 'Dia_Semana_Num');
  return DOW_ABREV.map((label, dow) => {
    const r = g[dow] || [];
    const casa     = sum(r.filter(x => x.Canal === 'CASA'));
    const delivery = sum(r.filter(x => x.Canal === 'DELIVERY'));
    return { label, dow, casa, delivery, total: casa+delivery };
  });
}

// ── Aliases de compatibilidade ─────────────────────────────────────────────
export const sumValues        = sum;
export const calcVariation    = variation;
export const formatPercent    = formatPct;
export const formatPercentPlain = formatPctPlain;
export const getMonthlyTotals = monthlyTotals;

// Totais por loja
export function getStoreTotals(recs) {
  const g = groupBy(recs, 'Loja');
  return Object.entries(g)
    .map(([loja, rows]) => ({
      loja,
      casa:     sum(rows.filter(r => r.Canal === 'CASA')),
      delivery: sum(rows.filter(r => r.Canal === 'DELIVERY')),
      total:    sum(rows),
    }))
    .sort((a,b) => b.total - a.total);
}

// Totais por semana
export function getWeeklyTotals(recs) {
  const g = groupBy(recs, 'Semana_Label');
  return Object.entries(g)
    .map(([key, rows]) => {
      const f = rows[0];
      return {
        key, label: key,
        semana: f.Semana_ISO, ano: f.Ano,
        weekStart: f.Semana_Inicio,
        casa:     sum(rows.filter(r => r.Canal === 'CASA')),
        delivery: sum(rows.filter(r => r.Canal === 'DELIVERY')),
        total:    sum(rows),
      };
    })
    .sort((a,b) => (a.weekStart||'').localeCompare(b.weekStart||''));
}

// Totais por dia
export function getDailyTotals(recs) {
  const g = groupBy(recs, 'Data');
  return Object.entries(g)
    .map(([date, rows]) => {
      const f = rows[0];
      return {
        date, diaSemana: f.Dia_Semana_Abrev,
        diaSemanaNum: f.Dia_Semana_Num,
        casa:     sum(rows.filter(r => r.Canal === 'CASA')),
        delivery: sum(rows.filter(r => r.Canal === 'DELIVERY')),
        total:    sum(rows),
      };
    })
    .sort((a,b) => a.date.localeCompare(b.date));
}

export const getDOWTotals = dowTotals;
