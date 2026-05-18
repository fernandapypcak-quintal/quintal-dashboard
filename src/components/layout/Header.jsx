// src/components/layout/Header.jsx
import { useState } from 'react';
import { SlidersHorizontal, Tag, X, ChevronDown, Filter, Printer, Zap } from 'lucide-react';
import PrintReport from '../pages/Print';
import { useFilters } from '../../hooks/useFilters';
import { useLabels } from '../../hooks/useLabels';
import MultiSelect from '../ui/MultiSelect';

const PAGE_LABELS = {
  overview: 'Visão Geral', trend: 'Tendência',
  weekly: 'Semanal', stores: 'Por Loja', history: 'Histórico',
};

const MESES = [
  {num:1,nome:'Jan'},{num:2,nome:'Fev'},{num:3,nome:'Mar'},{num:4,nome:'Abr'},
  {num:5,nome:'Mai'},{num:6,nome:'Jun'},{num:7,nome:'Jul'},{num:8,nome:'Ago'},
  {num:9,nome:'Set'},{num:10,nome:'Out'},{num:11,nome:'Nov'},{num:12,nome:'Dez'},
];

function today() {
  return new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

export default function Header({ activePage }) {
  const { filters, meta, updateFilter, resetFilters, hasActiveFilters, modoAoVivo, toggleModoAoVivo } = useFilters();
  const { showLabels, toggleLabels } = useLabels();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  const mesesAtivos = [...filters.meses];
  const mesLabel = mesesAtivos.length === 1
    ? MESES.find(m => m.num === mesesAtivos[0])?.nome
    : mesesAtivos.length > 1 ? `${mesesAtivos.length} meses` : null;

  return (
    <>
      <header className="bg-surface-card border-b border-surface-border px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        {/* Left: page title + date */}
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-brand-black truncate">
            {PAGE_LABELS[activePage] || activePage}
          </h1>
          <p className="text-xs text-zinc-400 hidden sm:block">{today()}</p>
        </div>

        {/* Right: filter chips + buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Active filter chips — desktop */}
          <div className="hidden md:flex items-center gap-2">
            {/* Lojas */}
            <MultiSelect
              placeholder="Todas as lojas"
              options={meta.lojas.map(l => ({ value: l, label: l }))}
              selected={filters.lojas}
              onChange={s => updateFilter('lojas', s)}
            />

            {/* Canal */}
            <select
              value={filters.canal}
              onChange={e => updateFilter('canal', e.target.value)}
              className="text-sm border border-surface-border rounded-xl px-3 py-1.5 bg-white text-zinc-700 cursor-pointer hover:border-zinc-400 transition-colors outline-none">
              <option value="Todos">Salão + Delivery</option>
              <option value="CASA">Salão</option>
              <option value="DELIVERY">Delivery</option>
            </select>

            {/* Ano */}
            <select
              value={filters.ano}
              onChange={e => updateFilter('ano', e.target.value)}
              className="text-sm border border-surface-border rounded-xl px-3 py-1.5 bg-white text-zinc-700 cursor-pointer hover:border-zinc-400 transition-colors outline-none">
              <option value="Todos">Todos os anos</option>
              {meta.anos.map(a => <option key={a} value={String(a)}>{a}</option>)}
            </select>

            {/* Mês chip */}
            {mesLabel ? (
              <span className="inline-flex items-center gap-1.5 bg-brand-black text-white text-sm font-medium px-3 py-1.5 rounded-xl">
                {mesLabel}
                <button onClick={() => updateFilter('meses', new Set())} className="hover:opacity-70 transition-opacity">
                  <X size={12}/>
                </button>
              </span>
            ) : (
              <select
                value=""
                onChange={e => {
                  if (e.target.value) updateFilter('meses', new Set([Number(e.target.value)]));
                }}
                className="text-sm border border-surface-border rounded-xl px-3 py-1.5 bg-white text-zinc-700 cursor-pointer hover:border-zinc-400 transition-colors outline-none">
                <option value="">Todos os meses</option>
                {MESES.map(m => <option key={m.num} value={m.num}>{m.nome}</option>)}
              </select>
            )}
          </div>

          {/* Rótulos button */}
          <button
            onClick={toggleLabels}
            className={`hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors
              ${showLabels
                ? 'bg-brand-black text-white border-brand-black'
                : 'border-surface-border text-zinc-500 hover:border-zinc-400'}`}>
            <Tag size={13}/>
            <span className="hidden lg:inline">Rótulos</span>
          </button>

          {/* Mobile filter button */}
          <button
            onClick={() => setFiltersOpen(true)}
            className={`md:hidden flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors
              ${hasActiveFilters
                ? 'bg-brand-black text-white border-brand-black'
                : 'border-surface-border text-zinc-500'}`}>
            <Filter size={14}/>
            {hasActiveFilters && <span className="text-xs">Filtros</span>}
          </button>

          {/* Modo Ao Vivo / Fechado */}
          <button
            onClick={toggleModoAoVivo}
            title={modoAoVivo ? 'Modo Ao Vivo — clique para voltar ao D-1' : 'Modo Fechado (D-1) — clique para ver ao vivo'}
            className={`hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors
              ${modoAoVivo
                ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                : 'border-surface-border text-zinc-500 hover:border-zinc-400'}`}>
            <Zap size={13} className={modoAoVivo ? 'fill-white' : ''}/>
            <span className="hidden lg:inline">{modoAoVivo ? 'Ao Vivo' : 'D-1'}</span>
          </button>

          {/* Imprimir */}
          <button
            onClick={() => setPrinting(true)}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-surface-border text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
            <Printer size={13}/>
            <span className="hidden lg:inline">Imprimir</span>
          </button>

          {/* Limpar — desktop */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="hidden md:flex items-center gap-1 text-sm font-medium text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-xl border border-rose-200 hover:border-rose-300 transition-colors">
              <X size={13}/> Limpar
            </button>
          )}
        </div>
      </header>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)}/>
          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-brand-black">Filtros</h2>
              <button onClick={() => setFiltersOpen(false)}>
                <X size={20} className="text-zinc-400"/>
              </button>
            </div>

            {/* Canal */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Canal</label>
              <div className="flex gap-2">
                {['Todos','CASA','DELIVERY'].map(v => (
                  <button key={v}
                    onClick={() => updateFilter('canal', v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors
                      ${filters.canal === v
                        ? 'bg-brand-black text-white border-brand-black'
                        : 'border-surface-border text-zinc-600'}`}>
                    {v === 'Todos' ? 'Todos' : v === 'CASA' ? 'Salão' : 'Delivery'}
                  </button>
                ))}
              </div>
            </div>

            {/* Ano */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Ano</label>
              <div className="flex gap-2 flex-wrap">
                {['Todos', ...meta.anos.map(String)].map(a => (
                  <button key={a}
                    onClick={() => updateFilter('ano', a)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors
                      ${filters.ano === a
                        ? 'bg-brand-black text-white border-brand-black'
                        : 'border-surface-border text-zinc-600'}`}>
                    {a === 'Todos' ? 'Todos' : a}
                  </button>
                ))}
              </div>
            </div>

            {/* Mês */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Mês</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => updateFilter('meses', new Set())}
                  className={`py-2 rounded-xl text-xs font-medium border transition-colors
                    ${filters.meses.size === 0
                      ? 'bg-brand-black text-white border-brand-black'
                      : 'border-surface-border text-zinc-600'}`}>
                  Todos
                </button>
                {MESES.map(m => (
                  <button key={m.num}
                    onClick={() => updateFilter('meses', new Set([m.num]))}
                    className={`py-2 rounded-xl text-xs font-medium border transition-colors
                      ${filters.meses.has(m.num)
                        ? 'bg-brand-black text-white border-brand-black'
                        : 'border-surface-border text-zinc-600'}`}>
                    {m.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Loja */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Loja</label>
              <div className="grid grid-cols-2 gap-2">
                {meta.lojas.map(l => (
                  <button key={l}
                    onClick={() => {
                      const s = new Set(filters.lojas);
                      s.has(l) ? s.delete(l) : s.add(l);
                      updateFilter('lojas', s);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-left transition-colors
                      ${filters.lojas.has(l)
                        ? 'bg-brand-black text-white border-brand-black'
                        : 'border-surface-border text-zinc-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Modo Ao Vivo */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Modo de dados</label>
              <div className="flex gap-2">
                <button onClick={toggleModoAoVivo}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors
                    ${!modoAoVivo ? 'bg-brand-black text-white border-brand-black' : 'border-surface-border text-zinc-600'}`}>
                  Fechado (D-1)
                </button>
                <button onClick={toggleModoAoVivo}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors
                    ${modoAoVivo ? 'bg-rose-500 text-white border-rose-500' : 'border-surface-border text-zinc-600'}`}>
                  <Zap size={14}/> Ao Vivo
                </button>
              </div>
            </div>

            {/* Rótulos + Limpar */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={toggleLabels}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors
                  ${showLabels
                    ? 'bg-brand-black text-white border-brand-black'
                    : 'border-surface-border text-zinc-600'}`}>
                <Tag size={14}/> Rótulos
              </button>
              {hasActiveFilters && (
                <button
                  onClick={() => { resetFilters(); setFiltersOpen(false); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-rose-200 text-rose-500 transition-colors">
                  <X size={14}/> Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Print trigger */}
      {printing && <PrintReport onClose={() => setPrinting(false)} />}
    </>
  );
}
