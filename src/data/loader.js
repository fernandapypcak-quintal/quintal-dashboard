// src/data/loader.js
const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function toDate(v) {
  // Aceita "2026-05-14" ou "14/05/2026" — sem tocar no fuso horário
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : '';
}

function toAnoMes(v, ano, mes) {
  // Constrói YYYY-MM diretamente dos números — sem risco de fuso
  if (ano && mes) return `${ano}-${String(mes).padStart(2,'0')}`;
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return s.slice(0,7); // pega os primeiros 7 chars se for data completa
}

function parseRow(r) {
  const ano  = Number(r.Ano);
  const mes  = Number(r.Mes);
  const dia  = Number(r.Dia);
  const data = toDate(r.Data);
  return {
    Data:             data,
    Ano:              ano,
    Mes:              mes,
    Dia:              dia,
    Ano_Mes:          toAnoMes(r.Ano_Mes, ano, mes),
    Ano_Mes_Label:    `${MESES[mes]}/${String(ano).slice(2)}`,
    Dia_Semana_Num:   Number(r.Dia_Semana_Num), // 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb
    Semana_Inicio:    toDate(r.Semana_Inicio),
    Semana_Label:     String(r.Semana_Label || ''),
    Loja:             String(r.Loja || '').trim(),
    Canal:            String(r.Canal || '').trim().toUpperCase(),
    Valor:            parseFloat(String(r.Valor).replace(',','.')) || 0,
  };
}

export async function loadData() {
  const res  = await fetch(`${URL}?tipo=dados`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.erro) throw new Error(json.erro);
  if (!json.dados?.length) throw new Error('Sem dados');
  return json.dados
    .map(parseRow)
    .filter(r =>
      r.Data && r.Loja && r.Canal &&
      r.Ano > 2000 && r.Mes >= 1 && r.Mes <= 12 &&
      r.Dia >= 1  && r.Dia <= 31 && r.Valor > 0
    );
}
