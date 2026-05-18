// src/hooks/useFilters.jsx
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { loadData } from '../data/loader';

const Ctx = createContext(null);

const MESES = [
  {num:1,nome:'Jan'},{num:2,nome:'Fev'},{num:3,nome:'Mar'},{num:4,nome:'Abr'},
  {num:5,nome:'Mai'},{num:6,nome:'Jun'},{num:7,nome:'Jul'},{num:8,nome:'Ago'},
  {num:9,nome:'Set'},{num:10,nome:'Out'},{num:11,nome:'Nov'},{num:12,nome:'Dez'},
];

function defaultFilters() {
  const now = new Date();
  return {
    lojas: new Set(),                    // vazio = todas
    meses: new Set([now.getMonth()+1]),  // mês atual
    canal: 'Todos',
    ano:   String(now.getFullYear()),    // ano atual
  };
}

export function FilterProvider({ children }) {
  const [modoAoVivo, setModoAoVivo] = useState(false);
  const [reloadKey, setReloadKey]   = useState(0);

  function toggleModoAoVivo() {
    setModoAoVivo(v => !v);
    setReloadKey(k => k + 1); // força reload dos dados
  }
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filters, setFilters] = useState(defaultFilters());

  useEffect(() => {
    loadData(modoAoVivo)
      .then(d => { setRawData(d); setLoading(false); })
      .catch(e => { setError(e);  setLoading(false); });
  }, [reloadKey, modoAoVivo]);

  const meta = useMemo(() => ({
    lojas: [...new Set(rawData.map(r => r.Loja))].sort(),
    anos:  [...new Set(rawData.map(r => r.Ano))].sort((a,b) => b-a),
    meses: MESES,
  }), [rawData]);

  const filteredData = useMemo(() => {
    const { lojas, meses, canal, ano } = filters;
    return rawData.filter(r => {
      if (lojas.size > 0 && !lojas.has(r.Loja))        return false;
      if (meses.size > 0 && !meses.has(r.Mes))          return false;
      if (canal !== 'Todos' && r.Canal !== canal)        return false;
      if (ano   !== 'Todos' && r.Ano   !== Number(ano))  return false;
      return true;
    });
  }, [rawData, filters]);

  const updateFilter = (key, val) => setFilters(p => ({...p, [key]: val}));
  const resetFilters = () => setFilters(defaultFilters());
  const hasActiveFilters =
    filters.lojas.size > 0 || filters.meses.size > 0 ||
    filters.canal !== 'Todos' || filters.ano !== 'Todos';

  return (
    <Ctx.Provider value={{ rawData, filteredData, filters, meta,
      updateFilter, resetFilters, hasActiveFilters, loading, error,
      modoAoVivo, toggleModoAoVivo }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFilters fora do FilterProvider');
  return ctx;
}
