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
  if (compact && v >= 1e6) return `R$ ${(v/1e6).toFixed(2).replace('.',',')}M`;
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
// Feriados nacionais + municipais SP + emendas + sábados atípicos 2025-2027
// Dias excluídos do cálculo da média DOW (não puxam a média para baixo)
export const DIAS_ATIPICOS = {
  '2025-01-01':'feriado','2025-01-25':'feriado',
  '2025-03-03':'emenda','2025-03-04':'feriado',
  '2025-04-18':'feriado','2025-04-19':'sabado-feriado','2025-04-21':'feriado',
  '2025-05-01':'feriado','2025-05-02':'emenda','2025-05-03':'sabado-feriado',
  '2025-06-19':'feriado','2025-06-20':'emenda','2025-06-21':'sabado-feriado',
  '2025-07-09':'feriado',
  '2025-09-07':'feriado','2025-10-12':'feriado',
  '2025-11-02':'feriado','2025-11-15':'feriado',
  '2025-11-20':'feriado','2025-11-21':'emenda','2025-11-22':'sabado-feriado',
  '2025-12-25':'feriado','2025-12-26':'emenda','2025-12-27':'sabado-feriado',
  '2026-01-01':'feriado','2026-01-02':'emenda','2026-01-03':'sabado-feriado',
  '2026-01-25':'feriado',
  '2026-02-16':'emenda','2026-02-17':'feriado',
  '2026-04-03':'feriado','2026-04-04':'sabado-feriado',
  '2026-04-20':'emenda','2026-04-21':'feriado',
  '2026-05-01':'feriado','2026-05-02':'sabado-feriado',
  '2026-06-04':'feriado','2026-06-05':'emenda','2026-06-06':'sabado-feriado',
  '2026-07-09':'feriado','2026-07-10':'emenda','2026-07-11':'sabado-feriado',
  '2026-09-07':'feriado','2026-10-12':'feriado',
  '2026-11-02':'feriado','2026-11-15':'feriado',
  '2026-11-20':'feriado','2026-11-21':'sabado-feriado',
  '2026-12-25':'feriado','2026-12-26':'sabado-feriado',
  '2027-01-01':'feriado','2027-01-02':'sabado-feriado','2027-01-25':'feriado',
  '2027-02-08':'emenda','2027-02-09':'feriado',
  '2027-03-26':'feriado','2027-03-27':'sabado-feriado','2027-04-21':'feriado',
  '2027-05-01':'feriado',
  '2027-05-27':'feriado','2027-05-28':'emenda','2027-05-29':'sabado-feriado',
  '2027-07-09':'feriado','2027-07-10':'sabado-feriado',
  '2027-09-06':'emenda','2027-09-07':'feriado',
  '2027-10-11':'emenda','2027-10-12':'feriado',
  '2027-11-01':'emenda','2027-11-02':'feriado',
  '2027-11-15':'feriado','2027-11-20':'feriado','2027-12-25':'feriado',
};


export function calcTendFat(recs, lastDay, totalDays, ano, mes) {
  if (!recs.length || lastDay >= totalDays) return sum(recs);

  // Médias por DOW — dias atípicos (feriados/emendas) são excluídos da média
  // pois representam faturamento abaixo do normal e distorceriam a projeção
  // Calcula média por DOW
  // Dias atípicos passados entram com valor × 1.3 (corrige o dia ruim na projeção)
  const mediaDow = {};
  for (let dow = 0; dow < 7; dow++) {
    const r = recs.filter(x => x.Dia_Semana_Num === dow);
    const dias = new Set(r.map(x => x.Dia)).size;
    if (dias === 0) { mediaDow[dow] = 0; continue; }
    // Soma: dias normais com valor real, dias atípicos com valor × 1.3
    const totalAjustado = r.reduce((s, x) => {
      const ds = `${ano}-${String(mes).padStart(2,'0')}-${String(x.Dia).padStart(2,'0')}`;
      return s + (DIAS_ATIPICOS[ds] ? x.Valor * 1.3 : x.Valor);
    }, 0);
    mediaDow[dow] = totalAjustado / dias;
  }

  // Projeção: dias lastDay+1 até fim do mês
  // Dias atípicos futuros recebem +30% sobre a média do DOW
  // (feriado/emenda/sábado atípico = compensação de movimento)
  let proj = 0;
  for (let d = lastDay + 1; d <= totalDays; d++) {
    const dow = new Date(ano, mes-1, d).getDay();
    const ds  = `${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const media = mediaDow[dow] || 0;
    proj += DIAS_ATIPICOS[ds] ? media * 1.3 : media;
  }

  return sum(recs) + proj;
}

// Retorna quais dias atípicos existem no mês (para mostrar no dashboard)
export function getDiasAtipicos(ano, mes) {
  const totalDays = daysInMonth(ano, mes);
  const result = [];
  for (let d = 1; d <= totalDays; d++) {
    const ds = `${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (DIAS_ATIPICOS[ds]) {
      result.push({ dia: d, data: ds, tipo: DIAS_ATIPICOS[ds],
        dow: new Date(ano, mes-1, d).getDay() });
    }
  }
  return result;
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
