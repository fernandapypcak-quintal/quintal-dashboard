// src/utils/formatters.js

export function formatBRL(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  if (compact && value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (compact && value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals).replace('.', ',')}%`;
}

export function formatPercentPlain(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

export function calcVariation(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function sumValues(records) {
  return records.reduce((acc, r) => acc + (r.Valor || 0), 0);
}

export function groupBy(records, key) {
  return records.reduce((acc, r) => {
    const k = r[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});
}

export function getMonthlyTotals(records) {
  const grouped = groupBy(records, 'Ano_Mes');
  return Object.entries(grouped)
    .map(([key, recs]) => {
      const casa = recs.filter(r => r.Canal === 'CASA').reduce((s, r) => s + r.Valor, 0);
      const delivery = recs.filter(r => r.Canal === 'DELIVERY').reduce((s, r) => s + r.Valor, 0);
      const first = recs[0];
      return {
        key,
        label: first.Ano_Mes_Label,
        mes: first.Mes,
        ano: first.Ano,
        casa,
        delivery,
        total: casa + delivery,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function getWeeklyTotals(records) {
  const grouped = groupBy(records, 'Semana_Label');
  return Object.entries(grouped)
    .map(([key, recs]) => {
      const casa = recs.filter(r => r.Canal === 'CASA').reduce((s, r) => s + r.Valor, 0);
      const delivery = recs.filter(r => r.Canal === 'DELIVERY').reduce((s, r) => s + r.Valor, 0);
      const first = recs[0];
      return {
        key,
        label: key,
        semana: first.Semana_ISO,
        ano: first.Ano,
        weekStart: first.Semana_Inicio,
        casa,
        delivery,
        total: casa + delivery,
      };
    })
    .sort((a, b) => a.weekStart?.localeCompare(b.weekStart));
}

export function getDailyTotals(records) {
  const grouped = groupBy(records, 'Data');
  return Object.entries(grouped)
    .map(([date, recs]) => {
      const casa = recs.filter(r => r.Canal === 'CASA').reduce((s, r) => s + r.Valor, 0);
      const delivery = recs.filter(r => r.Canal === 'DELIVERY').reduce((s, r) => s + r.Valor, 0);
      const first = recs[0];
      return {
        date,
        diaSemana: first.Dia_Semana_Abrev,
        diaSemanaNum: first.Dia_Semana_Num,
        casa,
        delivery,
        total: casa + delivery,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getStoreTotals(records) {
  const grouped = groupBy(records, 'Loja');
  return Object.entries(grouped)
    .map(([loja, recs]) => {
      const casa = recs.filter(r => r.Canal === 'CASA').reduce((s, r) => s + r.Valor, 0);
      const delivery = recs.filter(r => r.Canal === 'DELIVERY').reduce((s, r) => s + r.Valor, 0);
      return {
        loja,
        casa,
        delivery,
        total: casa + delivery,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function getDOWTotals(records) {
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const grouped = groupBy(records, 'Dia_Semana_Num');
  return DAYS.map((label, num) => {
    const recs = grouped[num] || [];
    const casa = recs.filter(r => r.Canal === 'CASA').reduce((s, r) => s + r.Valor, 0);
    const delivery = recs.filter(r => r.Canal === 'DELIVERY').reduce((s, r) => s + r.Valor, 0);
    return { label, num, casa, delivery, total: casa + delivery };
  });
}
