// src/data/loader.js
// Estratégia: planilha legada (histórico) + ZIG (dados recentes) mesclados
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

function parseRowPlanilha(r) {
  const ano = Number(r.Ano);
  const mes = Number(r.Mes);
  const dia = Number(r.Dia);
  return {
    Data:           toDate(r.Data),
    Ano:            ano,
    Mes:            mes,
    Dia:            dia,
    Ano_Mes:        `${ano}-${String(mes).padStart(2,'0')}`,
    Ano_Mes_Label:  `${MESES[mes]}/${String(ano).slice(2)}`,
    Dia_Semana_Num: Number(r.Dia_Semana_Num),
    Loja:           String(r.Loja || '').trim(),
    Canal:          String(r.Canal || '').trim().toUpperCase(),
    Valor:          parseFloat(String(r.Valor).replace(',','.')) || 0,
  };
}

function parseRowZig(r) {
  const s   = String(r.Data || '').trim().slice(0,10);
  const [ano, mes, dia] = s.split('-').map(Number);
  const dow = new Date(ano, mes-1, dia).getDay();
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

// Data de corte: a partir de quando a ZIG passa a ser a fonte verdade
// Tudo antes disso vem da planilha, tudo a partir disso vem da ZIG
function getDataCorte() {
  // Usa ontem como corte — planilha tem histórico até ontem, ZIG completa a partir daí
  const hoje = new Date();
  hoje.setDate(hoje.getDate() - 1);
  return `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
}

export async function loadData() {
  const dataCorte = getDataCorte();
  console.log(`[loader] Corte: planilha até ${dataCorte}, ZIG a partir daí`);

  // Busca planilha e ZIG em paralelo
  const [resPlanilha, resZig] = await Promise.allSettled([
    fetch(`${URL}?tipo=dados`).then(r => r.json()),
    fetch(`${URL}?tipo=zig`).then(r => r.json()),
  ]);

  // Dados da planilha (histórico até o corte)
  let dadosPlanilha = [];
  if (resPlanilha.status === 'fulfilled' && resPlanilha.value?.dados?.length) {
    dadosPlanilha = resPlanilha.value.dados
      .map(parseRowPlanilha)
      .filter(isValid)
      .filter(r => r.Data < dataCorte); // só até antes do corte
    console.log(`[loader] Planilha: ${dadosPlanilha.length} registros (até ${dataCorte})`);
  } else {
    console.warn('[loader] Planilha indisponível');
  }

  // Dados da ZIG (recentes a partir do corte)
  let dadosZig = [];
  if (resZig.status === 'fulfilled' && resZig.value?.zig?.length) {
    dadosZig = resZig.value.zig
      .map(parseRowZig)
      .filter(isValid)
      .filter(r => r.Data >= dataCorte); // só a partir do corte
    console.log(`[loader] ZIG: ${dadosZig.length} registros (desde ${dataCorte})`);
  } else {
    console.warn('[loader] ZIG indisponível');
  }

  // Se não tiver nenhum dado, erro
  if (!dadosPlanilha.length && !dadosZig.length) {
    throw new Error('Sem dados disponíveis — verifique planilha e ZIG');
  }

  // Mescla: planilha (histórico) + ZIG (recente)
  const total = [...dadosPlanilha, ...dadosZig];
  console.log(`[loader] Total mesclado: ${total.length} registros`);
  return total;
}
