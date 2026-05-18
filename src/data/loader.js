// src/data/loader.js
const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function toDate(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : '';
}

function toAnoMes(v, ano, mes) {
  if (ano && mes) return `${ano}-${String(mes).padStart(2,'0')}`;
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return s.slice(0,7);
}

// Parseia row da planilha (fonte legada)
function parseRowPlanilha(r) {
  const ano = Number(r.Ano);
  const mes = Number(r.Mes);
  const dia = Number(r.Dia);
  return {
    Data:           toDate(r.Data),
    Ano:            ano,
    Mes:            mes,
    Dia:            dia,
    Ano_Mes:        toAnoMes(r.Ano_Mes, ano, mes),
    Ano_Mes_Label:  `${MESES[mes]}/${String(ano).slice(2)}`,
    Dia_Semana_Num: Number(r.Dia_Semana_Num),
    Loja:           String(r.Loja || '').trim(),
    Canal:          String(r.Canal || '').trim().toUpperCase(),
    Valor:          parseFloat(String(r.Valor).replace(',','.')) || 0,
  };
}

// Parseia row da ZIG (fonte nova)
function parseRowZig(r) {
  const s   = String(r.Data || '').trim().slice(0,10); // 'YYYY-MM-DD'
  const [ano, mes, dia] = s.split('-').map(Number);
  const dow = new Date(ano, mes-1, dia).getDay(); // 0=Dom
  return {
    Data:           s,
    Ano:            ano,
    Mes:            mes,
    Dia:            dia,
    Ano_Mes:        `${ano}-${String(mes).padStart(2,'0')}`,
    Ano_Mes_Label:  `${MESES[mes]}/${String(ano).slice(2)}`,
    Dia_Semana_Num: dow,
    Loja:           String(r.Loja || '').trim(),
    Canal:          String(r.Canal || '').trim().toUpperCase(),
    Valor:          parseFloat(r.Valor) || 0,
  };
}

function isValid(r) {
  return r.Data && r.Loja && r.Canal &&
    r.Ano > 2000 && r.Mes >= 1 && r.Mes <= 12 &&
    r.Dia >= 1   && r.Dia <= 31 && r.Valor > 0;
}

export async function loadData() {
  // Tenta ZIG primeiro — se falhar, cai na planilha legada
  try {
    const res  = await fetch(`${URL}?tipo=zig`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.erro) throw new Error(json.erro);
    if (json.zig?.length) {
      console.log(`[loader] Fonte: ZIG (${json.zig.length} registros)`);
      return json.zig.map(parseRowZig).filter(isValid);
    }
    throw new Error('ZIG sem dados');
  } catch (zigErr) {
    console.warn(`[loader] ZIG falhou (${zigErr.message}), usando planilha...`);
  }

  // Fallback: planilha legada
  const res  = await fetch(`${URL}?tipo=dados`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.erro) throw new Error(json.erro);
  if (!json.dados?.length) throw new Error('Sem dados');
  console.log(`[loader] Fonte: Planilha (${json.dados.length} registros)`);
  return json.dados.map(parseRowPlanilha).filter(isValid);
}
