// src/data/loader.js
// Carrega dados do CSV (local ou Google Sheets) via PapaParse

import Papa from 'papaparse';
import { getDataURL } from './dataConfig';

function parseRow(row) {
  return {
    Data:              row.Data,
    Ano:               Number(row.Ano),
    Mes:               Number(row.Mes),
    Dia:               Number(row.Dia),
    Mes_Nome:          row.Mes_Nome,
    Mes_Nome_Completo: row.Mes_Nome_Completo,
    Ano_Mes:           row.Ano_Mes,
    Ano_Mes_Label:     row.Ano_Mes_Label,
    Dia_Semana:        row.Dia_Semana,
    Dia_Semana_Abrev:  row.Dia_Semana_Abrev,
    Dia_Semana_Num:    Number(row.Dia_Semana_Num),
    Semana_ISO:        Number(row.Semana_ISO),
    Semana_Inicio:     row.Semana_Inicio,
    Semana_Label:      row.Semana_Label,
    Loja:              row.Loja?.trim(),
    Canal:             row.Canal?.trim(),
    Valor:             parseFloat(row.Valor) || 0,
  };
}

export function loadData() {
  return new Promise((resolve, reject) => {
    const url = getDataURL();

    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      // Para Google Sheets CORS não é problema pois é uma URL pública
      complete: (results) => {
        const cleaned = results.data
          .map(parseRow)
          .filter(r => r.Data && r.Loja && r.Canal && !isNaN(r.Valor));
        resolve(cleaned);
      },
      error: (err) => reject(err),
    });
  });
}
