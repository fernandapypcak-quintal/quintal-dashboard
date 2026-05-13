// src/components/layout/Header.jsx
import { Filter, X, Tag } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useLabels } from '../../hooks/useLabels';
import MultiSelect from '../ui/MultiSelect';

const PAGE_TITLES = {
  overview: 'Visão Geral', trend: 'Tendência', yoy: 'Ano vs Ano',
  weekly: 'Semanal', stores: 'Por Loja', metas: 'Metas', history: 'Histórico',
};

export default function Header({ activePage }) {
  const { filters, meta, updateFilter, resetFilters, hasActiveFilters } = useFilters();
  const { showLabels, toggleLabels } = useLabels();

  const lojaOptions = meta.lojas.map(l => ({ value: l, label: l }));
  const mesOptions  = meta.meses.map(m => ({ value: m.num, label: m.nome }));

  return (
    <header className="sticky top-0 z-20 bg-surface-base/90 backdrop-blur-md border-b border-surface-border px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-brand-black font-display">
          {PAGE_TITLES[activePage]}
        </h1>
        <span className="hidden sm:block text-xs text-zinc-400">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Filter size={13} className="text-zinc-400 hidden sm:block" />

        <MultiSelect
          options={lojaOptions}
          selected={filters.lojas}
          onChange={val => updateFilter('lojas', val)}
          placeholder="Todas as lojas"
          allLabel="Todas as lojas"
        />

        <select
          value={filters.canal}
          onChange={e => updateFilter('canal', e.target.value)}
          className="filter-select"
        >
          <option value="Todos">Casa + Delivery</option>
          <option value="CASA">Casa</option>
          <option value="DELIVERY">Delivery</option>
        </select>

        <select
          value={filters.ano}
          onChange={e => updateFilter('ano', e.target.value)}
          className="filter-select"
        >
          <option value="Todos">Todos os anos</option>
          {meta.anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <MultiSelect
          options={mesOptions}
          selected={filters.meses}
          onChange={val => updateFilter('meses', val)}
          placeholder="Todos os meses"
          allLabel="Todos os meses"
        />

        {/* Labels toggle */}
        <button
          onClick={toggleLabels}
          title={showLabels ? 'Ocultar rótulos' : 'Mostrar rótulos nos gráficos'}
          className={`flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg border transition-all ${
            showLabels
              ? 'bg-brand-olive text-white border-brand-olive'
              : 'bg-white text-zinc-500 border-surface-border hover:border-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Tag size={12} />
          <span className="hidden sm:inline">Rótulos</span>
        </button>

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
