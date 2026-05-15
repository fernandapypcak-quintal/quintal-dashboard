// src/components/pages/History.jsx
import { useMemo, useState } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { AtingBadge } from '../ui/GoalProgress';
import { monthlyTotals, formatBRL, formatPctPlain, variation, formatPct } from '../../utils/formatters';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react';

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={12} className="text-zinc-300" />;
  return sortDir === 'asc' ? <ChevronUp size={12} className="text-brand-olive" /> : <ChevronDown size={12} className="text-brand-olive" />;
}

export default function History() {
  const { filteredData, rawData } = useFilters();
  const { getMetaTotal } = useMetas();
  const [sortField, setSortField] = useState('key');
  const [sortDir, setSortDir]     = useState('desc');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const PER_PAGE = 20;

  const lojas = useMemo(() => [...new Set(rawData.map(r => r.Loja))].sort(), [rawData]);

  const monthly = useMemo(() => {
    return monthlyTotals(filteredData).map((d, i, arr) => {
      const meta  = getMetaTotal(d.key, lojas);
      const ating = meta > 0 ? (d.total / meta) * 100 : null;
      return {
        ...d,
        growth: i > 0 ? variation(d.total, arr[i - 1].total) : null,
        pctCasa: d.total > 0 ? d.casa / d.total * 100 : 0,
        pctDel:  d.total > 0 ? d.delivery / d.total * 100 : 0,
        meta, ating,
      };
    });
  }, [filteredData, lojas, getMetaTotal]);

  const filtered = useMemo(() =>
    monthly.filter(d => !search || d.label.toLowerCase().includes(search.toLowerCase())),
    [monthly, search]
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortField] ?? -Infinity;
      const bv = b[sortField] ?? -Infinity;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const paginated  = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(sorted.length / PER_PAGE);

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function handleExport() {
    const headers = ['Período','Casa','Delivery','Total','Meta','% Ating.','% Casa','% Delivery','MoM%'];
    const rows = sorted.map(d => [
      d.label, d.casa.toFixed(2), d.delivery.toFixed(2), d.total.toFixed(2),
      d.meta ? d.meta.toFixed(2) : '',
      d.ating !== null ? d.ating.toFixed(1)+'%' : '',
      d.pctCasa.toFixed(1)+'%', d.pctDel.toFixed(1)+'%',
      d.growth !== null ? d.growth.toFixed(1)+'%' : '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'quintal_historico.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const COLS = [
    { key: 'label',   label: 'Período' },
    { key: 'casa',    label: 'Casa' },
    { key: 'delivery',label: 'Delivery' },
    { key: 'total',   label: 'Total' },
    { key: 'meta',    label: 'Meta' },
    { key: 'ating',   label: '% Ating.' },
    { key: 'pctCasa', label: '% Casa' },
    { key: 'pctDel',  label: '% Del' },
    { key: 'growth',  label: 'MoM %' },
  ];

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="section-title">Histórico Mensal</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{sorted.length} períodos encontrados</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text" placeholder="Filtrar período..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-8 px-3 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-olive/30 focus:border-brand-olive w-36"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-brand-black text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <Download size={12} />Exportar CSV
          </button>
        </div>
      </div>

      <div className="chart-card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-surface-border">
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`table-header py-3 cursor-pointer select-none hover:text-zinc-600 transition-colors ${col.key === 'label' ? 'text-left pr-4' : 'text-right px-3'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(d => (
              <tr key={d.key} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                <td className="py-3 pr-4">
                  <span className="text-sm font-semibold text-brand-black">{d.label}</span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs text-brand-olive">{formatBRL(d.casa)}</td>
                <td className="py-3 px-3 text-right font-mono text-xs" style={{ color: '#D9B504' }}>{formatBRL(d.delivery)}</td>
                <td className="py-3 px-3 text-right font-mono text-sm font-semibold text-brand-black">{formatBRL(d.total)}</td>
                <td className="py-3 px-3 text-right font-mono text-xs text-zinc-400">{d.meta ? formatBRL(d.meta) : '—'}</td>
                <td className="py-3 px-3 text-right"><AtingBadge pct={d.ating} /></td>
                <td className="py-3 px-3 text-right text-xs text-zinc-500">{formatPctPlain(d.pctCasa)}</td>
                <td className="py-3 px-3 text-right text-xs text-zinc-500">{formatPctPlain(d.pctDel)}</td>
                <td className="py-3 pl-3 text-right">
                  {d.growth !== null
                    ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.growth >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>{formatPct(d.growth)}</span>
                    : <span className="text-zinc-300 text-sm">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-border bg-surface-muted/30">
              <td className="py-3 pr-4 text-xs font-semibold text-zinc-500">TOTAL</td>
              <td className="py-3 px-3 text-right font-mono text-xs font-bold text-brand-olive">{formatBRL(sorted.reduce((s,d)=>s+d.casa,0))}</td>
              <td className="py-3 px-3 text-right font-mono text-xs font-bold" style={{ color:'#D9B504' }}>{formatBRL(sorted.reduce((s,d)=>s+d.delivery,0))}</td>
              <td className="py-3 px-3 text-right font-mono text-sm font-bold text-brand-black">{formatBRL(sorted.reduce((s,d)=>s+d.total,0))}</td>
              <td className="py-3 px-3 text-right font-mono text-xs text-zinc-400">{formatBRL(sorted.reduce((s,d)=>s+(d.meta||0),0))}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Mostrando {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,sorted.length)} de {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-surface-border text-zinc-500 hover:bg-surface-muted disabled:opacity-30 text-xs">‹</button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${p===page?'bg-brand-black text-white':'border border-surface-border text-zinc-500 hover:bg-surface-muted'}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-surface-border text-zinc-500 hover:bg-surface-muted disabled:opacity-30 text-xs">›</button>
          </div>
        </div>
      )}
    </div>
  );
}
