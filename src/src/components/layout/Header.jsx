// src/components/layout/Header.jsx
import { Filter, X, RefreshCw } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';

const PAGE_TITLES = {
  overview: 'Visão Geral',
  trend:    'Tendência',
  yoy:      'Ano vs Ano',
  weekly:   'Semanal',
  stores:   'Por Loja',
  history:  'Histórico',
};

export default function Header({ activePage }) {
  const { filters, meta, updateFilter, resetFilters } = useFilters();

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => {
    if (k === 'loja' && v !== 'Todas') return true;
    if (k === 'canal' && v !== 'Todos') return true;
    if (k === 'ano' && v !== 'Todos') return true;
    if (k === 'mes' && v !== 'Todos') return true;
    return false;
  });

  return (
    <header className="sticky top-0 z-10 bg-surface-base/80 backdrop-blur-md border-b border-surface-border px-6 py-3 flex items-center justify-between gap-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-brand-black font-display">
          {PAGE_TITLES[activePage]}
        </h1>
        <span className="hidden sm:block text-xs text-zinc-400">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Filter size={13} className="text-zinc-400 hidden sm:block" />

        {/* Loja */}
        <select
          value={filters.loja}
          onChange={e => updateFilter('loja', e.target.value)}
          className="filter-select"
        >
          <option value="Todas">Todas as lojas</option>
          {meta.lojas.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        {/* Canal */}
        <select
          value={filters.canal}
          onChange={e => updateFilter('canal', e.target.value)}
          className="filter-select"
        >
          <option value="Todos">Casa + Delivery</option>
          <option value="CASA">Casa</option>
          <option value="DELIVERY">Delivery</option>
        </select>

        {/* Ano */}
        <select
          value={filters.ano}
          onChange={e => updateFilter('ano', e.target.value)}
          className="filter-select"
        >
          <option value="Todos">Todos os anos</option>
          {meta.anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Mês */}
        <select
          value={filters.mes}
          onChange={e => updateFilter('mes', e.target.value)}
          className="filter-select"
        >
          <option value="Todos">Todos os meses</option>
          {meta.meses.map(m => <option key={m.num} value={m.num}>{m.nome}</option>)}
        </select>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
          >
            <X size={12} />
            Limpar
          </button>
        )}
      </div>
    </header>
  );
}
