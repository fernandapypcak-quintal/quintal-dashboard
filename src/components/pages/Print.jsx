// src/components/pages/Print.jsx
import { useMemo } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { sum, variation, calcTendFat, daysInMonth, formatBRL } from '../../utils/formatters';

const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DOW_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function fmt(v) { return formatBRL(v, true); }
function pct(v) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%';
}
function clr(v) { return v >= 0 ? '#16a34a' : '#dc2626'; }

export default function PrintReport({ onClose }) {
  const { rawData } = useFilters();
  const { getMeta } = useMetas();

  const data = useMemo(() => {
    if (!rawData.length) return null;

    const keys = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const key  = keys[keys.length - 1];
    const [anoS, mesS] = key.split('-');
    const ano = Number(anoS), mes = Number(mesS);
    const recs      = rawData.filter(r => r.Ano_Mes === key);
    const lastDay   = Math.max(...recs.map(r => r.Dia));
    const totalDays = daysInMonth(ano, mes);
    const recsAA     = rawData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Dia <= lastDay);
    const recsAAFull = rawData.filter(r => r.Ano === ano-1 && r.Mes === mes);

    const total    = sum(recs);
    const casa     = sum(recs.filter(r => r.Canal === 'CASA'));
    const delivery = sum(recs.filter(r => r.Canal === 'DELIVERY'));
    const yoy      = variation(total, sum(recsAA));
    const tendFat  = calcTendFat(recs, lastDay, totalDays, ano, mes);
    const tendVsAA = variation(tendFat, sum(recsAAFull));

    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();

    const porLoja = lojas.map(loja => {
      const lr       = recs.filter(r => r.Loja === loja);
      const lrAA     = recsAA.filter(r => r.Loja === loja);
      const lrAAFull = recsAAFull.filter(r => r.Loja === loja);
      const real = sum(lr);
      const tend = calcTendFat(lr, lastDay, totalDays, ano, mes);
      const meta = getMeta(key, loja);
      return {
        loja, real, tend, meta,
        yoy:      variation(real, sum(lrAA)),
        tendVsAA: variation(tend, sum(lrAAFull)),
        ating:    meta > 0 ? real/meta*100 : null,
        share:    total > 0 ? real/total*100 : 0,
      };
    }).sort((a,b) => (b.ating??-1) - (a.ating??-1));

    // Dia anterior
    const ontem   = new Date(); ontem.setDate(ontem.getDate() - 1);
    const diaO    = ontem.getDate();
    const mesO    = ontem.getMonth() + 1;
    const anoO    = ontem.getFullYear();
    const recsO   = rawData.filter(r => r.Ano === anoO   && r.Mes === mesO && r.Dia === diaO);
    const recsOAA = rawData.filter(r => r.Ano === anoO-1 && r.Mes === mesO && r.Dia === diaO);
    const totalO  = sum(recsO);
    const casaO   = sum(recsO.filter(r => r.Canal === 'CASA'));
    const delO    = sum(recsO.filter(r => r.Canal === 'DELIVERY'));
    const yoyO    = variation(totalO, sum(recsOAA));
    const porLojaO = lojas.map(loja => {
      const v26 = sum(recsO.filter(r => r.Loja === loja));
      const v25 = sum(recsOAA.filter(r => r.Loja === loja));
      return { loja, v26, v25, var: variation(v26, v25) };
    }).filter(l => l.v26 > 0).sort((a,b) => b.v26 - a.v26);

    return { ano, mes, lastDay, totalDays, key,
      label: `${MESES[mes]}/${ano}`,
      total, casa, delivery, yoy, tendFat, tendVsAA,
      pctCasa: total>0?casa/total*100:0,
      pctDel:  total>0?delivery/total*100:0,
      porLoja,
      ontem: { dow: DOW_NAMES[ontem.getDay()], dia:diaO, mes:mesO, ano:anoO,
               total:totalO, totalAA:sum(recsOAA), yoy:yoyO,
               casa:casaO, delivery:delO, porLoja:porLojaO } };
  }, [rawData, getMeta]);

  if (!data) return null;

  const totalMeta = data.porLoja.reduce((s,l) => s+(l.meta||0), 0);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório ${data.label} — Quintal do Espeto</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a;
         background: white; padding: 16px; }

  .header { display:flex; justify-content:space-between; align-items:center;
    border-bottom: 3px solid #1F3D2E; padding-bottom: 10px; margin-bottom: 14px; }
  .header h1 { font-size: 17px; font-weight: 800; color: #1F3D2E; }
  .header .sub { font-size: 9px; color: #666; margin-top: 2px; }
  .header .badge { background:#1F3D2E; color:white; padding:4px 10px;
    border-radius:6px; font-size:10px; font-weight:700; }

  .info-bar { background:#fffbeb; border:1px solid #fde68a; border-radius:6px;
    padding:5px 10px; font-size:9px; color:#92400e; margin-bottom:12px; }

  .section-title { font-size:12px; font-weight:700; color:#1F3D2E;
    border-left:4px solid #97A624; padding-left:8px; margin:14px 0 8px; }

  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px; }
  .kpi { border:1px solid #e5e5e5; border-radius:8px; padding:9px 11px; }
  .kpi-label { font-size:8px; font-weight:700; color:#888; text-transform:uppercase;
    letter-spacing:0.5px; margin-bottom:3px; }
  .kpi-value { font-size:17px; font-weight:800; }
  .kpi-sub { font-size:8px; color:#888; margin-top:2px; }
  .kpi-var { font-size:9px; font-weight:700; margin-top:3px; }

  table { width:100%; border-collapse:collapse; font-size:10px; margin-bottom:14px; }
  th { background:#1F3D2E; color:white; font-weight:700; padding:5px 8px;
    text-align:right; font-size:8px; text-transform:uppercase; }
  th:first-child { text-align:left; }
  td { padding:4px 8px; text-align:right; border-bottom:1px solid #f0f0f0; }
  td:first-child { text-align:left; font-weight:600; }
  tr:nth-child(even) td { background:#fafafa; }
  .tfoot td { background:#f0f4ec !important; font-weight:700;
    border-top:2px solid #1F3D2E; }

  .pos { color:#16a34a; } .neg { color:#dc2626; }

  .footer { margin-top:14px; padding-top:8px; border-top:1px solid #e5e5e5;
    font-size:8px; color:#999; display:flex; justify-content:space-between; }

  @media print {
    body { padding:8mm; }
    .no-print { display:none !important; }
    @page { size: A4 landscape; margin:8mm; }
  }
</style>
</head>
<body>

<div class="no-print" style="margin-bottom:14px;display:flex;gap:8px;">
  <button onclick="window.print()"
    style="background:#1F3D2E;color:white;border:none;padding:7px 18px;
    border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">
    🖨️ Imprimir / Salvar PDF
  </button>
  <button onclick="window.close()"
    style="background:#f5f5f5;color:#333;border:1px solid #ddd;padding:7px 14px;
    border-radius:6px;font-size:12px;cursor:pointer;">
    Fechar
  </button>
</div>

<!-- HEADER -->
<div class="header">
  <div>
    <h1>Quintal do Espeto</h1>
    <div class="sub">Relatório de Faturamento · Gerado em ${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
  </div>
  <div class="badge">${data.label} · dados até dia ${data.lastDay}</div>
</div>

<div class="info-bar">
  ⚠️ Dados até dia ${data.lastDay} de ${data.totalDays}. YoY e Tend Fat calculados com base nesse período.
</div>

<!-- 1. VISÃO GERAL -->
<div class="section-title">1. Visão Geral — ${data.label}</div>
<div class="kpi-grid">
  <div class="kpi">
    <div class="kpi-label">Faturamento Total</div>
    <div class="kpi-value">${fmt(data.total)}</div>
    <div class="kpi-var ${data.yoy>=0?'pos':'neg'}">${pct(data.yoy)} YoY até dia ${data.lastDay}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Salão</div>
    <div class="kpi-value">${fmt(data.casa)}</div>
    <div class="kpi-sub">${data.pctCasa.toFixed(1).replace('.',',')}% do total</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Delivery</div>
    <div class="kpi-value">${fmt(data.delivery)}</div>
    <div class="kpi-sub">${data.pctDel.toFixed(1).replace('.',',')}% do total</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Projeção do Mês (Tend Fat)</div>
    <div class="kpi-value">${fmt(data.tendFat)}</div>
    <div class="kpi-var ${data.tendVsAA>=0?'pos':'neg'}">${pct(data.tendVsAA)} vs ${MESES[data.mes]}/${data.ano-1}</div>
  </div>
</div>

<!-- 2. DIA ANTERIOR -->
<div class="section-title">2. Dia Anterior — ${data.ontem.dow}, ${data.ontem.dia}/${data.ontem.mes}/${data.ontem.ano}</div>
<div class="kpi-grid">
  <div class="kpi">
    <div class="kpi-label">Faturamento Total</div>
    <div class="kpi-value">${fmt(data.ontem.total)}</div>
    ${data.ontem.yoy !== null ? `<div class="kpi-var ${data.ontem.yoy>=0?'pos':'neg'}">${pct(data.ontem.yoy)} vs mesmo dia ${data.ontem.ano-1}</div>` : ''}
  </div>
  <div class="kpi">
    <div class="kpi-label">Salão</div>
    <div class="kpi-value">${fmt(data.ontem.casa)}</div>
    <div class="kpi-sub">${data.ontem.total>0?(data.ontem.casa/data.ontem.total*100).toFixed(1).replace('.',',')+'%':''} do total</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Delivery</div>
    <div class="kpi-value">${fmt(data.ontem.delivery)}</div>
    <div class="kpi-sub">${data.ontem.total>0?(data.ontem.delivery/data.ontem.total*100).toFixed(1).replace('.',',')+'%':''} do total</div>
  </div>
  <div class="kpi" style="border-left:3px solid #1F3D2E">
    <div class="kpi-label">Mesmo dia ${data.ontem.ano-1}</div>
    <div class="kpi-value" style="color:#999;font-size:15px">${fmt(data.ontem.totalAA)}</div>
    ${data.ontem.yoy !== null ? `<div class="kpi-var ${data.ontem.yoy>=0?'pos':'neg'}">${pct(data.ontem.yoy)}</div>` : '<div class="kpi-sub">sem dado anterior</div>'}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="text-align:left">Loja</th>
      <th>${data.ontem.ano}</th>
      <th>${data.ontem.ano-1}</th>
      <th>Variação YoY</th>
      <th>Share</th>
    </tr>
  </thead>
  <tbody>
    ${data.ontem.porLoja.map(l => `
    <tr>
      <td>${l.loja}</td>
      <td style="font-weight:700">${fmt(l.v26)}</td>
      <td style="color:#999">${l.v25>0?fmt(l.v25):'—'}</td>
      <td class="${l.var>=0?'pos':'neg'}">${l.v25>0?pct(l.var):'—'}</td>
      <td>${data.ontem.total>0?(l.v26/data.ontem.total*100).toFixed(1).replace('.',',')+'%':'—'}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr class="tfoot">
      <td>TOTAL</td>
      <td>${fmt(data.ontem.total)}</td>
      <td style="color:#666">${fmt(data.ontem.totalAA)}</td>
      <td class="${data.ontem.yoy>=0?'pos':'neg'}">${pct(data.ontem.yoy)}</td>
      <td>100%</td>
    </tr>
  </tfoot>
</table>

<!-- 3. RANKING POR LOJA -->
<div class="section-title">3. Ranking por Loja — ${data.label}</div>
<table>
  <thead>
    <tr>
      <th style="text-align:left"># Loja</th>
      <th>Realizado</th>
      <th>YoY (dia ${data.lastDay})</th>
      <th>Meta</th>
      <th>% Ating.</th>
      <th>Tend Fat</th>
      <th>Tend vs AA</th>
      <th>Peso</th>
    </tr>
  </thead>
  <tbody>
    ${data.porLoja.map((l,i) => `
    <tr>
      <td>#${i+1} ${l.loja}</td>
      <td style="font-weight:700">${fmt(l.real)}</td>
      <td class="${l.yoy>=0?'pos':'neg'}">${pct(l.yoy)}</td>
      <td>${l.meta > 0 ? fmt(l.meta) : '—'}</td>
      <td style="font-weight:800;color:${l.ating===null?'#999':l.ating>=100?'#16a34a':l.ating>=80?'#d97706':'#dc2626'}">
        ${l.ating !== null ? l.ating.toFixed(1).replace('.',',')+'%' : '—'}
      </td>
      <td style="font-weight:700">${fmt(l.tend)}</td>
      <td class="${l.tendVsAA>=0?'pos':'neg'}">${pct(l.tendVsAA)}</td>
      <td>${l.share.toFixed(1).replace('.',',')}%</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr class="tfoot">
      <td>TOTAL</td>
      <td>${fmt(data.total)}</td>
      <td class="${data.yoy>=0?'pos':'neg'}">${pct(data.yoy)}</td>
      <td>${totalMeta > 0 ? fmt(totalMeta) : '—'}</td>
      <td style="font-weight:800;color:${totalMeta>0&&data.total/totalMeta>=1?'#16a34a':totalMeta>0&&data.total/totalMeta>=0.8?'#d97706':'#dc2626'}">
        ${totalMeta > 0 ? (data.total/totalMeta*100).toFixed(1).replace('.',',')+'%' : '—'}
      </td>
      <td style="font-weight:700">${fmt(data.tendFat)}</td>
      <td class="${data.tendVsAA>=0?'pos':'neg'}">${pct(data.tendVsAA)}</td>
      <td>100%</td>
    </tr>
  </tfoot>
</table>

<!-- FOOTER -->
<div class="footer">
  <span>Quintal do Espeto · Dashboard de Faturamento</span>
  <span>Gerado em ${new Date().toLocaleString('pt-BR')}</span>
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  onClose?.();
  return null;
}

export function PrintWeekend({ onClose }) {
  const { rawData } = useFilters();

  const data = useMemo(() => {
    if (!rawData.length) return null;
    const datas = [...new Set(rawData.map(r => r.Data))].sort().reverse();
    const diasFds = [];
    for (const dt of datas) {
      const d = new Date(dt + 'T12:00:00');
      const dow = d.getDay();
      if ((dow === 5 || dow === 6 || dow === 0) && !diasFds.find(x => x.data === dt)) {
        diasFds.push({ data: dt, dow, d });
      }
      if (diasFds.length === 3) break;
    }
    diasFds.sort((a,b) => a.data.localeCompare(b.data));
    console.log('[PrintWeekend] diasFds:', diasFds.map(x => x.data + ' dow=' + x.dow));
    console.log('[PrintWeekend] rawData sample:', rawData[0]);
    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();
    const DOW_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    const dias = diasFds.map(({ data, dow, d }) => {
      const recs = rawData.filter(r => r.Data === data);
      const dAA  = new Date(d); dAA.setFullYear(d.getFullYear() - 1);
      const dataAA = dAA.getFullYear() + '-' + String(dAA.getMonth()+1).padStart(2,'0') + '-' + String(dAA.getDate()).padStart(2,'0');
      const recsAA = rawData.filter(r => r.Data === dataAA);
      const porLoja = lojas.map(loja => ({
        loja,
        v26: sum(recs.filter(r => r.Loja === loja)),
        v25: sum(recsAA.filter(r => r.Loja === loja)),
      })).filter(l => l.v26 > 0 || l.v25 > 0);
      porLoja.forEach(l => { l.yoy = variation(l.v26, l.v25); });
      const total26 = sum(recs), total25 = sum(recsAA);
      return { data, dow, label: DOW_NAMES[dow],
        dataFmt: d.toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'}),
        ano: d.getFullYear(), porLoja, total26, total25, yoy: variation(total26, total25) };
    });
    return { dias, lojas, geradoEm: new Date().toLocaleString('pt-BR') };
  }, [rawData]);

  if (!data) return null;

  function fmt(v) { return formatBRL(v, true); }
  function pct(v) {
    if (v === null || v === undefined) return '—';
    return (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%';
  }

  const css = [
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; background: white; padding: 16px; }',
    '.header { display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid #1F3D2E; padding-bottom: 10px; margin-bottom: 14px; }',
    '.header h1 { font-size: 17px; font-weight: 800; color: #1F3D2E; }',
    '.header .sub { font-size: 9px; color: #666; margin-top: 2px; }',
    '.kpi-row { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }',
    '.kpi { border:1px solid #e5e5e5; border-radius:8px; padding:9px 11px; }',
    '.kpi-label { font-size:8px; font-weight:700; color:#888; text-transform:uppercase; margin-bottom:3px; }',
    '.kpi-value { font-size:20px; font-weight:800; }',
    '.kpi-var { font-size:9px; font-weight:700; margin-top:3px; }',
    '.section-title { font-size:12px; font-weight:700; color:#1F3D2E; border-left:4px solid #97A624; padding-left:8px; margin:14px 0 8px; }',
    'table { width:100%; border-collapse:collapse; font-size:10px; margin-bottom:16px; }',
    'th { background:#1F3D2E; color:white; font-weight:700; padding:5px 8px; text-align:right; font-size:8px; text-transform:uppercase; }',
    'th:first-child { text-align:left; }',
    'td { padding:4px 8px; text-align:right; border-bottom:1px solid #f0f0f0; }',
    'td:first-child { text-align:left; font-weight:600; }',
    'tr:nth-child(even) td { background:#fafafa; }',
    '.tfoot td { background:#f0f4ec !important; font-weight:700; border-top:2px solid #1F3D2E; }',
    '.pos { color:#16a34a; } .neg { color:#dc2626; }',
    '.no-print { margin-bottom:14px; display:flex; gap:8px; }',
    '.footer { margin-top:14px; padding-top:8px; border-top:1px solid #e5e5e5; font-size:8px; color:#999; display:flex; justify-content:space-between; }',
    '@media print { body { padding:8mm; } .no-print { display:none !important; } @page { size: A4 landscape; margin:8mm; } }',
  ].join(' ');

  // Build KPI cards
  const kpiCards = data.dias.map(d =>
    '<div class="kpi">' +
    '<div class="kpi-label">' + d.label + ' · ' + d.dataFmt + '</div>' +
    '<div class="kpi-value">' + fmt(d.total26) + '</div>' +
    (d.yoy !== null ? '<div class="kpi-var ' + (d.yoy>=0?'pos':'neg') + '">' + pct(d.yoy) + ' vs mesmo ' + d.label + ' ' + (d.ano-1) + '</div>' : '') +
    '</div>'
  ).join('');

  // Build tables
  const tables = data.dias.map(d => {
    const rows = d.porLoja.map(l =>
      '<tr>' +
      '<td>' + l.loja + '</td>' +
      '<td style="font-weight:700">' + fmt(l.v26) + '</td>' +
      '<td style="color:#999">' + (l.v25>0 ? fmt(l.v25) : '—') + '</td>' +
      '<td class="' + (l.yoy>=0?'pos':'neg') + '">' + (l.v25>0 ? pct(l.yoy) : '—') + '</td>' +
      '<td>' + (d.total26>0 ? (l.v26/d.total26*100).toFixed(1).replace('.',',')+'%' : '—') + '</td>' +
      '</tr>'
    ).join('');
    return '<div class="section-title">' + d.label + ' — ' + d.dataFmt + '</div>' +
      '<table><thead><tr>' +
      '<th style="text-align:left">Loja</th>' +
      '<th>' + d.ano + '</th>' +
      '<th>' + (d.ano-1) + '</th>' +
      '<th>Variação YoY</th>' +
      '<th>Share</th>' +
      '</tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr class="tfoot">' +
      '<td>TOTAL</td>' +
      '<td>' + fmt(d.total26) + '</td>' +
      '<td style="color:#666">' + (d.total25>0?fmt(d.total25):'—') + '</td>' +
      '<td class="' + (d.yoy>=0?'pos':'neg') + '">' + pct(d.yoy) + '</td>' +
      '<td>100%</td>' +
      '</tr></tfoot></table>';
  }).join('');

  const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>' +
    '<title>Faturamento Final de Semana — Quintal do Espeto</title>' +
    '<style>' + css + '</style></head><body>' +
    '<div class="no-print">' +
    '<button onclick="window.print()" style="background:#1F3D2E;color:white;border:none;padding:7px 18px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">🖨️ Imprimir / Salvar PDF</button>' +
    '<button onclick="window.close()" style="background:#f5f5f5;color:#333;border:1px solid #ddd;padding:7px 14px;border-radius:6px;font-size:12px;cursor:pointer;">Fechar</button>' +
    '</div>' +
    '<div class="header"><div><h1>Quintal do Espeto — Final de Semana</h1>' +
    '<div class="sub">Faturamento por dia e por casa · Gerado em ' + data.geradoEm + '</div></div>' +
    '<div style="background:#1F3D2E;color:white;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;">' +
    data.dias.map(function(d){ return d.label; }).join(' · ') +
    '</div></div>' +
    '<div class="kpi-row">' + kpiCards + '</div>' +
    tables +
    '<div class="footer"><span>Quintal do Espeto · Relatório de Final de Semana</span><span>' + data.geradoEm + '</span></div>' +
    '</body></html>';

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  onClose?.();
  return null;
}