// src/data/loader.js
const APPSCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

// Converte data sem risco de fuso: aceita "2026-05-14" ou "14/05/2026"
function parseDate(val) {
  if (!val) return '';
  const s = String(val).trim();
  // Já está no formato correto YYYY-MM-DD
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  // Formato DD/MM/YYYY (vindo do Sheets)
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  // Fallback: tenta extrair YYYY-MM-DD de ISO string
  const iso = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return s;
}

// Converte Ano_Mes sem risco de fuso: aceita "2026-05" diretamente
function parseAnoMes(val) {
  if (!val) return '';
  const s = String(val).trim();
  // Já está no formato correto YYYY-MM
  if (s.match(/^\d{4}-\d{2}$/)) return s;
  // Tenta extrair de uma data completa YYYY-MM-DD
  const m = s.match(/^(\d{4}-\d{2})/);
  if (m) return m[1];
  return s;
}

function parseRow(row) {
  const data     = parseDate(row.Data);
  const anoMes   = parseAnoMes(row.Ano_Mes || (data ? data.slice(0, 7) : ''));
  const ano      = Number(row.Ano) || Number(anoMes.slice(0, 4));
  const mes      = Number(row.Mes) || Number(anoMes.slice(5, 7));
  const dia      = Number(row.Dia);

  // Ano_Mes_Label: se vier como "Mai/26" usa direto, senão constrói
  let anoMesLabel = String(row.Ano_Mes_Label || '').trim();
  if (!anoMesLabel || anoMesLabel.match(/^\d{4}/)) {
    // Constrói a partir do mês/ano
    const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    anoMesLabel = mes > 0 ? `${MESES[mes]}/${String(ano).slice(2)}` : '';
  }

  return {
    Data:              data,
    Ano:               ano,
    Mes:               mes,
    Dia:               dia,
    Mes_Nome:          String(row.Mes_Nome || '').trim(),
    Mes_Nome_Completo: String(row.Mes_Nome_Completo || '').trim(),
    Ano_Mes:           anoMes,
    Ano_Mes_Label:     anoMesLabel,
    Dia_Semana:        String(row.Dia_Semana || '').trim(),
    Dia_Semana_Abrev:  String(row.Dia_Semana_Abrev || '').trim(),
    Dia_Semana_Num:    Number(row.Dia_Semana_Num),  // 0=Dom,1=Seg...6=Sáb
    Semana_ISO:        Number(row.Semana_ISO),
    Semana_Inicio:     parseDate(row.Semana_Inicio),
    Semana_Label:      String(row.Semana_Label || '').trim(),
    Loja:              String(row.Loja || '').trim(),
    Canal:             String(row.Canal || '').trim().toUpperCase(),
    Valor:             parseFloat(String(row.Valor).replace(',', '.')) || 0,
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
    .filter(r =>
      r.Data &&
      r.Ano > 2000 &&
      r.Mes >= 1 && r.Mes <= 12 &&
      r.Dia >= 1 && r.Dia <= 31 &&
      r.Loja &&
      r.Canal &&
      r.Valor > 0  // filtra valores zerados
    );
}
