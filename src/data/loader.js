// src/data/loader.js
// Carrega dados de faturamento do Google Apps Script

const APPSCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykKgqbmU76C5l0vB_sE7p77kcoDqXBzbacMOjhzaD3Twrgn3GJktMe-rMoxrM1pR8U/exec';

function parseDate(val) {
  if (!val) return '';
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) return val;
  // Sheets retorna datas como ISO string com fuso
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  return d.toISOString().split('T')[0];
}

function parseAnoMes(val) {
  if (!val) return '';
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}$/)) return val;
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  return d.toISOString().slice(0, 7); // "2025-01"
}

function parseRow(row) {
  return {
    Data:              parseDate(row.Data),
    Ano:               Number(row.Ano),
    Mes:               Number(row.Mes),
    Dia:               Number(row.Dia),
    Mes_Nome:          row.Mes_Nome,
    Mes_Nome_Completo: row.Mes_Nome_Completo,
    Ano_Mes:           parseAnoMes(row.Ano_Mes),
    Ano_Mes_Label:     typeof row.Ano_Mes_Label === 'string' && row.Ano_Mes_Label.match(/^\d{4}-/)
                         ? new Date(row.Ano_Mes_Label).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                         : String(row.Ano_Mes_Label || ''),
    Dia_Semana:        row.Dia_Semana,
    Dia_Semana_Abrev:  row.Dia_Semana_Abrev,
    Dia_Semana_Num:    Number(row.Dia_Semana_Num),
    Semana_ISO:        Number(row.Semana_ISO),
    Semana_Inicio:     parseDate(row.Semana_Inicio),
    Semana_Label:      row.Semana_Label,
    Loja:              String(row.Loja || '').trim(),
    Canal:             String(row.Canal || '').trim(),
    Valor:             parseFloat(row.Valor) || 0,
  };
}

export async function loadData() {
  const url = `${APPSCRIPT_URL}?tipo=dados`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ao carregar dados: ${res.status}`);

  const json = await res.json();

  if (json.erro) throw new Error(json.erro);
  if (!json.dados?.length) throw new Error('Nenhum dado retornado pelo AppScript');

  return json.dados
    .map(parseRow)
    .filter(r => r.Data && r.Loja && r.Canal && !isNaN(r.Valor));
}
