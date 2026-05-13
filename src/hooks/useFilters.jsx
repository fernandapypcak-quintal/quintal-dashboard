// src/hooks/useFilters.jsx
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { loadData } from '../data/loader';

const FilterContext = createContext(null);

const MESES = [
  { num: 1, nome: 'Jan' }, { num: 2, nome: 'Fev' }, { num: 3, nome: 'Mar' },
  { num: 4, nome: 'Abr' }, { num: 5, nome: 'Mai' }, { num: 6, nome: 'Jun' },
  { num: 7, nome: 'Jul' }, { num: 8, nome: 'Ago' }, { num: 9, nome: 'Set' },
  { num: 10, nome: 'Out' }, { num: 11, nome: 'Nov' }, { num: 12, nome: 'Dez' },
];

export function FilterProvider({ children }) {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Filters — lojas and meses are Sets (empty = "all")
  const [filters, setFilters] = useState({
    lojas: new Set(),   // Set<string> — empty = todas
    meses: new Set(),   // Set<number> — empty = todos
    canal: 'Todos',
    ano:   'Todos',
  });

  useEffect(() => {
    loadData()
      .then(data => { setRawData(data); setLoading(false); })
      .catch(err  => { setError(err);   setLoading(false); });
  }, []);

  const meta = useMemo(() => {
    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();
    const anos  = [...new Set(rawData.map(r => r.Ano))].sort((a, b) => b - a);
    return { lojas, anos, meses: MESES };
  }, [rawData]);

  const filteredData = useMemo(() => {
    const { lojas, meses, canal, ano } = filters;
    return rawData.filter(r => {
      if (lojas.size > 0 && !lojas.has(r.Loja))           return false;
      if (meses.size > 0 && !meses.has(r.Mes))             return false;
      if (canal !== 'Todos' && r.Canal !== canal)           return false;
      if (ano   !== 'Todos' && r.Ano   !== Number(ano))     return false;
      return true;
    });
  }, [rawData, filters]);

  const updateFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const resetFilters = () =>
    setFilters({ lojas: new Set(), meses: new Set(), canal: 'Todos', ano: 'Todos' });

  const hasActiveFilters =
    filters.lojas.size > 0 ||
    filters.meses.size > 0 ||
    filters.canal !== 'Todos' ||
    filters.ano   !== 'Todos';

  return (
    <FilterContext.Provider value={{
      filters, filteredData, meta, updateFilter, resetFilters,
      rawData, loading, error, hasActiveFilters,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
