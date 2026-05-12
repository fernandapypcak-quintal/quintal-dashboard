// src/data/dataConfig.js
//
// ╔══════════════════════════════════════════════════════════════╗
// ║  CONFIGURAÇÃO DA FONTE DE DADOS                              ║
// ║                                                              ║
// ║  Mude SOURCE para alternar entre as opções abaixo           ║
// ╚══════════════════════════════════════════════════════════════╝

export const DATA_CONFIG = {

  // ─── OPÇÃO 1: CSV local (padrão — arquivo em /public/data.csv) ─────────────
  SOURCE: 'csv',
  CSV_PATH: '/data.csv',

  // ─── OPÇÃO 2: Google Sheets ─────────────────────────────────────────────────
  // 1. Abra sua planilha no Google Sheets
  // 2. Arquivo → Compartilhar → Publicar na web
  //    Selecione a aba correta → Formato: CSV → Publicar
  // 3. Copie o link gerado e cole em SHEETS_URL abaixo
  // 4. Mude SOURCE para 'sheets'
  //
  // SOURCE: 'sheets',
  SHEETS_URL: '',
  // Exemplo de URL:
  // 'https://docs.google.com/spreadsheets/d/SEU_ID/export?format=csv&gid=0'
  //
  // Para GID diferente de 0, veja a aba na URL da planilha: ...#gid=123456789

};

// ─── Helper para montar a URL correta ──────────────────────────────────────
export function getDataURL() {
  if (DATA_CONFIG.SOURCE === 'sheets' && DATA_CONFIG.SHEETS_URL) {
    return DATA_CONFIG.SHEETS_URL;
  }
  return DATA_CONFIG.CSV_PATH;
}
