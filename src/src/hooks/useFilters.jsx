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
  const [rawData, setRawData]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filters, setFilters]   = useState({
    loja:  'Todas',
    canal: 'Todos',
    ano:   'Todos',
    mes:   'Todos',
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
    return rawData.filter(r => {
      if (filters.loja  !== 'Todas' && r.Loja  !== filters.loja)           return false;
      if (filters.canal !== 'Todos' && r.Canal !== filters.canal)           return false;
      if (filters.ano   !== 'Todos' && r.Ano   !== Number(filters.ano))    return false;
      if (filters.mes   !== 'Todos' && r.Mes   !== Number(filters.mes))    return false;
      return true;
    });
  }, [rawData, filters]);

  const updateFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const resetFilters = () =>
    setFilters({ loja: 'Todas', canal: 'Todos', ano: 'Todos', mes: 'Todos' });

  return (
    <FilterContext.Provider value={{
      filters, filteredData, meta, updateFilter, resetFilters,
      rawData, loading, error,
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
