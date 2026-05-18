// src/components/pages/Print.jsx
// Relatório de impressão — abre em nova aba, otimizado para A4
import { useMemo } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { sum, variation, calcTendFat, daysInMonth, formatBRL } from '../../utils/formatters';

const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DOW   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function fmt(v) { return formatBRL(v, true); }
function pct(v) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%';
}
function badge(v) {
  if (v === null) return '—';
  return `<span style="color:${v>=0?'#16a34a':'#dc2626'};font-weight:700">${pct(v)}</span>`;
}

export default function PrintReport({ onClose }) {
  const { rawData } = useFilters();
  const { getMeta }  = useMetas();

  const data = useMemo(() => {
    if (!rawData.length) return null;

    // Período atual
    const keys    = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const key     = keys[keys.length - 1];
    const recs    = rawData.filter(r => r.Ano_Mes === key);
    const [anoS, mesS] = key.split('-');
    const ano = Number(anoS), mes = Number(mesS);
    const lastDay   = Math.max(...recs.map(r => r.Dia));
    const totalDays = daysInMonth(ano, mes);
    const recsAA    = rawData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Dia <= lastDay);
    const recsAAFull= rawData.filter(r => r.Ano === ano-1 && r.Mes === mes);

    // KPIs gerais
    const total    = sum(recs);
    const casa     = sum(recs.filter(r => r.Canal === 'CASA'));
    const delivery = sum(recs.filter(r => r.Canal === 'DELIVERY'));
    const totalAA  = sum(recsAA);
    const yoy      = variation(total, totalAA);
    const tendFat  = calcTendFat(recs, lastDay, totalDays, ano, mes);
    const tendVsAA = variation(tendFat, sum(recsAAFull));

    // Por loja
    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();
    const porLoja = lojas.map(loja => {
      const lr   = recs.filter(r => r.Loja === loja);
      const lrAA = recsAA.filter(r => r.Loja === loja);
      const lrAAFull = recsAAFull.filter(r => r.Loja === loja);
      const real = sum(lr);
      const tend = calcTendFat(lr, lastDay, totalDays, ano, mes);
      const meta = getMeta(key, loja);
      const ating = meta > 0 ? real/meta*100 : null;
      return {
        loja, real, tend,
        yoy:     variation(real, sum(lrAA)),
        tendVsAA:variation(tend, sum(lrAAFull)),
        meta, ating,
        share: total > 0 ? real/total*100 : 0,
      };
    }).sort((a,b) => (b.ating??-1) - (a.ating??-1));

    // Tabela diária
    const dias = Array.from({length: lastDay}, (_,i) => i+1).map(dia => {
      const d26  = recs.filter(r => r.Dia === dia);
      const d25  = recsAA.filter(r => r.Dia === dia);
      const t26  = sum(d26), t25 = sum(d25);
      const dow  = new Date(ano, mes-1, dia).getDay();
      return { dia, dow: DOW[dow], isWeekend: dow===0||dow===6,
               t26, t25, var: variation(t26, t25) };
    });

    return { ano, mes, lastDay, totalDays, label: `${MESES[mes]}/${ano}`,
             total, casa, delivery, yoy, tendFat, tendVsAA,
             pctCasa: total>0?casa/total*100:0,
             pctDel:  total>0?delivery/total*100:0,
             porLoja, dias, lojas };
  }, [rawData, getMeta]);

  if (!data) return null;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório ${data.label} — Quintal do Espeto</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 11px; color: #1a1a1a;
         background: white; padding: 20px; }
  .page-break { page-break-before: always; }

  /* Header */
  .report-header { display:flex; justify-content:space-between; align-items:center;
    border-bottom: 3px solid #1F3D2E; padding-bottom: 10px; margin-bottom: 16px; }
  .report-header h1 { font-size: 18px; font-weight: 800; color: #1F3D2E; }
  .report-header .sub { font-size: 10px; color: #666; margin-top: 2px; }
  .report-header .badge { background: #1F3D2E; color: white;
    padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; }

  /* Section */
  .section-title { font-size: 13px; font-weight: 700; color: #1F3D2E;
    border-left: 4px solid #97A624; padding-left: 8px; margin: 16px 0 10px; }

  /* KPI grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi { border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; }
  .kpi-label { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 4px; }
  .kpi-value { font-size: 18px; font-weight: 800; color: #1a1a1a; }
  .kpi-sub { font-size: 9px; color: #888; margin-top: 3px; }
  .kpi-var { font-size: 10px; font-weight: 700; margin-top: 4px; }
  .pos { color: #16a34a; } .neg { color: #dc2626; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1F3D2E; color: white; font-weight: 700; padding: 6px 8px;
    text-align: right; font-size: 9px; text-transform: uppercase; }
  th:first-child { text-align: left; }
  td { padding: 5px 8px; text-align: right; border-bottom: 1px solid #f0f0f0; }
  td:first-child { text-align: left; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  .tfoot td { background: #f0f4ec !important; font-weight: 700;
    border-top: 2px solid #1F3D2E; font-size: 10px; }
  .weekend td { background: #fffbeb !important; }

  /* Info bar */
  .info-bar { background: #fffbeb; border: 1px solid #fde68a;
    border-radius: 6px; padding: 6px 10px; font-size: 9px; color: #92400e;
    margin-bottom: 12px; }

  /* Footer */
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e5e5;
    font-size: 9px; color: #999; display: flex; justify-content: space-between; }

  @media print {
    body { padding: 10mm; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    @page { size: A4 landscape; margin: 8mm; }
    table { font-size: 8px !important; }
    .kpi-value { font-size: 14px !important; }
  }
</style>
</head>
<body>

<!-- BOTÃO IMPRIMIR -->
<div class="no-print" style="margin-bottom:16px;display:flex;gap:8px;">
  <button onclick="window.print()"
    style="background:#1F3D2E;color:white;border:none;padding:8px 20px;
    border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">
    🖨️ Imprimir / Salvar PDF
  </button>
  <button onclick="window.close()"
    style="background:#f5f5f5;color:#333;border:1px solid #ddd;padding:8px 16px;
    border-radius:6px;font-size:12px;cursor:pointer;">
    Fechar
  </button>
</div>

<!-- HEADER -->
<div class="report-header">
  <div>
    <h1>Quintal do Espeto</h1>
    <div class="sub">Relatório de Faturamento — Gerado em ${new Date().toLocaleDateString('pt-BR', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
  </div>
  <div class="badge">${data.label} · dados até dia ${data.lastDay}</div>
</div>

<div class="info-bar">
  ⚠️ Dados até dia ${data.lastDay} de ${data.totalDays}. YoY e Tend Fat calculados com base nesse período.
</div>

<!-- SEÇÃO 1: VISÃO GERAL -->
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

<!-- SEÇÃO 2: RANKING POR LOJA -->
<div class="section-title">2. Ranking por Loja — ${data.label}</div>

<table>
  <thead>
    <tr>
      <th style="text-align:left">#&nbsp;&nbsp;Loja</th>
      <th>Realizado</th>
      <th>YoY (dia ${data.lastDay})</th>
      <th>Meta</th>
      <th>% Ating.</th>
      <th>Tend Fat</th>
      <th>Tend vs AA</th>
      <th>Share</th>
    </tr>
  </thead>
  <tbody>
    ${data.porLoja.map((l,i) => `
    <tr>
      <td>#${i+1}&nbsp;&nbsp;${l.loja}</td>
      <td>${fmt(l.real)}</td>
      <td class="${l.yoy>=0?'pos':'neg'}">${pct(l.yoy)}</td>
      <td>${l.meta > 0 ? fmt(l.meta) : '—'}</td>
      <td style="font-weight:800;color:${l.ating===null?'#999':l.ating>=80?'#16a34a':l.ating>=60?'#d97706':'#dc2626'}">
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
      <td>${fmt(data.porLoja.reduce((s,l)=>s+(l.meta||0),0))}</td>
      <td style="font-weight:800">${(() => { const tm=data.porLoja.reduce((s,l)=>s+(l.meta||0),0); return tm>0?(data.total/tm*100).toFixed(1).replace('.',',')+'%':'—'; })()}</td>
      <td style="font-weight:700">${fmt(data.tendFat)}</td>
      <td class="${data.tendVsAA>=0?'pos':'neg'}">${pct(data.tendVsAA)}</td>
      <td>100%</td>
    </tr>
  </tfoot>
</table>

<!-- SEÇÃO 3: FATURAMENTO DIÁRIO POR LOJA -->
<div class="section-title page-break">3. Faturamento Diário por Loja — ${data.label}</div>
<div class="info-bar">
  Valor principal = ${data.ano} &nbsp;|&nbsp; Cinza abaixo = ${data.ano-1} (mesmo dia) &nbsp;|&nbsp; % = variação YoY &nbsp;|&nbsp; ★ = fim de semana
</div>

<table style="font-size:9px">
  <thead>
    <tr>
      <th style="text-align:left;min-width:50px">Dia</th>
      ${data.lojas.map(l => `<th style="min-width:70px">${l.replace('VILA ','V.')}</th>`).join('')}
      <th style="min-width:70px;background:#0a2918">TOTAL</th>
    </tr>
  </thead>
  <tbody>
    ${data.dias.map(d => {
      const recs26 = rawData.filter(r => r.Ano===data.ano   && r.Mes===data.mes && r.Dia===d.dia);
      const recs25 = rawData.filter(r => r.Ano===data.ano-1 && r.Mes===data.mes && r.Dia===d.dia);
      return `<tr class="${d.isWeekend?'weekend':''}">
        <td><b>${d.dia}</b> <span style="color:#999;font-size:8px">${d.dow}${d.isWeekend?' ★':''}</span></td>
        ${data.lojas.map(loja => {
          const v26 = sum(recs26.filter(r=>r.Loja===loja));
          const v25 = sum(recs25.filter(r=>r.Loja===loja));
          const vr  = variation(v26, v25);
          return `<td>
            ${v26>0 ? `<div style="font-weight:700">${fmt(v26)}</div>` : '<div style="color:#ccc">—</div>'}
            ${v25>0 ? `<div style="color:#aaa;font-size:8px">${fmt(v25)} <span style="color:${vr>=0?'#16a34a':'#dc2626'}">${pct(vr)}</span></div>` : ''}
          </td>`;
        }).join('')}
        <td style="border-left:2px solid #1F3D2E">
          ${d.t26>0 ? `<div style="font-weight:800">${fmt(d.t26)}</div>` : '<div style="color:#ccc">—</div>'}
          ${d.t25>0 ? `<div style="color:#aaa;font-size:8px">${fmt(d.t25)} <span style="color:${d.var>=0?'#16a34a':'#dc2626'}">${pct(d.var)}</span></div>` : ''}
        </td>
      </tr>`;
    }).join('')}
  </tbody>
  <tfoot>
    <tr class="tfoot">
      <td>TOTAL</td>
      ${data.lojas.map(loja => {
        const t26 = sum(rawData.filter(r=>r.Ano===data.ano   && r.Mes===data.mes && r.Loja===loja));
        const t25 = sum(rawData.filter(r=>r.Ano===data.ano-1 && r.Mes===data.mes && r.Dia<=data.lastDay && r.Loja===loja));
        const vr  = variation(t26, t25);
        return `<td>
          <div>${fmt(t26)}</div>
          <div style="font-size:8px;color:${vr>=0?'#16a34a':'#dc2626'}">${pct(vr)}</div>
        </td>`;
      }).join('')}
      <td style="border-left:2px solid #1F3D2E">
        <div>${fmt(data.total)}</div>
        <div style="font-size:8px;color:${data.yoy>=0?'#16a34a':'#dc2626'}">${pct(data.yoy)}</div>
      </td>
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

  // Abre em nova aba
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  onClose?.();
  return null;
}
