// src/hooks/useMetas.jsx
// Gerencia metas mensais por loja.
// Fontes de dados (em ordem de prioridade):
//   1. Google Sheets (URL configurada pelo usuário)
//   2. localStorage (editado direto no dashboard)
// Ambas as fontes são compartilhadas via Sheets ou ficam por navegador se local.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';

const MetasContext = createContext(null);

const STORAGE_KEY       = 'quintal_metas_v1';
const STORAGE_SHEETS_KEY = 'quintal_metas_sheets_url';

// Retorna a chave Ano_Mes como "2025-05"
function toKey(ano, mes) {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

export function MetasProvider({ children }) {
  // { '2025-05': { 'CARINAS': 2000000, 'TATUAPÉ': 1500000, ... }, ... }
  const [metas, setMetas]       = useState({});
  const [sheetsURL, setSheetsURL] = useState('');
  const [sheetsStatus, setSheetsStatus] = useState('idle'); // idle | loading | ok | error
  const [sheetsError, setSheetsError]   = useState('');

  // Carrega do localStorage ao iniciar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMetas(JSON.parse(raw));
      const url = localStorage.getItem(STORAGE_SHEETS_KEY);
      if (url) setSheetsURL(url);
    } catch (e) {}
  }, []);

  // Persiste metas locais sempre que mudam
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(metas)); } catch (e) {}
  }, [metas]);

  // Retorna meta de loja num período (0 se não definida)
  const getMeta = useCallback((anoMes, loja) => {
    return metas[anoMes]?.[loja] ?? 0;
  }, [metas]);

  // Retorna meta total de um período (soma de todas as lojas)
  const getMetaTotal = useCallback((anoMes, lojas) => {
    return lojas.reduce((s, l) => s + (metas[anoMes]?.[l] ?? 0), 0);
  }, [metas]);

  // Salva metas de um período (objeto { loja: valor })
  const savePeriodMetas = useCallback((anoMes, valoresPorLoja) => {
    setMetas(prev => ({ ...prev, [anoMes]: { ...valoresPorLoja } }));
  }, []);

  // Carrega do Google Sheets e popula metas
  const loadFromSheets = useCallback(async (url) => {
    setSheetsStatus('loading');
    setSheetsError('');
    try {
      // Proxy para evitar CORS
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res   = await fetch(proxy);
      if (!res.ok) throw new Error('Não foi possível acessar a planilha');
      const text  = await res.text();

      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!parsed.data?.length) throw new Error('Planilha vazia ou formato inválido');

      // Espera colunas: Ano, Mes, Loja, Meta
      const newMetas = {};
      parsed.data.forEach(row => {
        const ano  = Number(row.Ano  || row.ano);
        const mes  = Number(row.Mes  || row.mes);
        const loja = (row.Loja || row.loja || '').trim();
        const val  = parseFloat((row.Meta || row.meta || '0').toString().replace(',', '.'));
        if (!ano || !mes || !loja || isNaN(val)) return;
        const key = toKey(ano, mes);
        if (!newMetas[key]) newMetas[key] = {};
        newMetas[key][loja] = val;
      });

      if (!Object.keys(newMetas).length) throw new Error('Nenhuma meta encontrada. Verifique as colunas: Ano, Mes, Loja, Meta');

      setMetas(newMetas);
      setSheetsURL(url);
      localStorage.setItem(STORAGE_SHEETS_KEY, url);
      setSheetsStatus('ok');
      return { ok: true, count: Object.values(newMetas).reduce((s, m) => s + Object.keys(m).length, 0) };
    } catch (e) {
      setSheetsStatus('error');
      setSheetsError(e.message);
      return { ok: false, error: e.message };
    }
  }, []);

  const clearSheetsURL = useCallback(() => {
    setSheetsURL('');
    setSheetsStatus('idle');
    localStorage.removeItem(STORAGE_SHEETS_KEY);
  }, []);

  return (
    <MetasContext.Provider value={{
      metas, getMeta, getMetaTotal,
      savePeriodMetas,
      sheetsURL, sheetsStatus, sheetsError,
      loadFromSheets, clearSheetsURL,
    }}>
      {children}
    </MetasContext.Provider>
  );
}

export function useMetas() {
  const ctx = useContext(MetasContext);
  if (!ctx) throw new Error('useMetas must be used within MetasProvider');
  return ctx;
}
