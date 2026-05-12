// src/components/pages/Metas.jsx
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { Settings, Link, X, TrendingUp, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { BigProgressBar, AtingBadge, progressColor } from '../ui/GoalProgress';
import { CustomTooltip } from '../ui/ChartTooltip';
import {
  getMonthlyTotals, getStoreTotals, sumValues, groupBy,
  formatBRL, formatPercentPlain, formatPercent
} from '../../utils/formatters';

// Modal de configuração
function MetasModal({ onClose, lojas, allMonths }) {
  const { metas, savePeriodMetas, sheetsURL, sheetsStatus, sheetsError, loadFromSheets, clearSheetsURL } = useMetas();
  const [tab, setTab]         = useState('manual');
  const [period, setPeriod]   = useState(allMonths[allMonths.length - 1]?.key || '');
  const [form, setForm]       = useState({});
  const [url, setUrl]         = useState(sheetsURL);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // Preenche o form sempre que muda o período
  function loadForm(p) {
    setPeriod(p);
    const vals = {};
    lojas.forEach(l => { vals[l] = metas[p]?.[l] ?? 0; });
    setForm(vals);
  }

  useMemo(() => { if (period) loadForm(period); }, []); // eslint-disable-line

  function handleSave() {
    savePeriodMetas(period, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function suggestFromHistory() {
    // +5% sobre a média dos últimos 3 meses para cada loja no form
    const keys = allMonths.map(m => m.key);
    const idx  = keys.indexOf(period);
    const prev3 = keys.slice(Math.max(0, idx - 3), idx);
    const newForm = { ...form };
    lojas.forEach(l => {
      const vals = prev3.map(k => metas[k]?.[l] ?? 0).filter(v => v > 0);
      if (vals.length) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        newForm[l] = Math.round(avg * 1.05 / 1000) * 1000;
      }
    });
    setForm(newForm);
  }

  async function handleConnectSheets() {
    setSaving(true);
    const result = await loadFromSheets(url);
    setSaving(false);
    if (result.ok) {
      setTimeout(onClose, 1200);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <div>
            <h2 className="text-base font-semibold font-display text-brand-black">Configurar Metas</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Defina metas mensais por loja</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-surface-muted hover:text-zinc-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-border px-6">
          {[['manual', '✏️ Editar manualmente'], ['sheets', '📊 Google Sheets']].map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? 'border-brand-olive text-brand-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* TAB MANUAL */}
          {tab === 'manual' && (
            <div>
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs font-medium text-zinc-500">Período:</label>
                  <select
                    value={period}
                    onChange={e => loadForm(e.target.value)}
                    className="h-8 pl-3 pr-8 text-xs font-medium bg-white border border-surface-border rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-olive/30 focus:border-brand-olive"
                  >
                    {allMonths.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>
                <button
                  onClick={suggestFromHistory}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-surface-border rounded-lg text-zinc-600 hover:bg-surface-muted transition-colors"
                >
                  <TrendingUp size={12} />
                  Sugerir +5% histórico
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {lojas.map(loja => (
                  <div key={loja}>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{loja}</label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={form[loja] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [loja]: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full h-9 px-3 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-olive/30 focus:border-brand-olive transition-colors font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-400">
                  Total: <strong className="text-brand-black">{formatBRL(Object.values(form).reduce((s, v) => s + (v || 0), 0), true)}</strong>
                </div>
                <div className="flex gap-2">
                  <button onClick={onClose} className="h-9 px-4 text-sm font-medium border border-surface-border rounded-lg text-zinc-600 hover:bg-surface-muted transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="h-9 px-5 text-sm font-medium bg-brand-black text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2"
                  >
                    {saved ? <><CheckCircle size={14} /> Salvo!</> : '💾 Salvar metas'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB SHEETS */}
          {tab === 'sheets' && (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 text-xs leading-relaxed text-green-800">
                <strong className="block mb-2">Como conectar ao Google Sheets:</strong>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Na sua planilha, crie uma aba chamada <code className="bg-white px-1 rounded border border-green-200">Metas</code></li>
                  <li>Colunas obrigatórias: <code className="bg-white px-1 rounded border border-green-200">Ano</code> · <code className="bg-white px-1 rounded border border-green-200">Mes</code> · <code className="bg-white px-1 rounded border border-green-200">Loja</code> · <code className="bg-white px-1 rounded border border-green-200">Meta</code></li>
                  <li>Vá em <strong>Arquivo → Compartilhar → Publicar na web</strong></li>
                  <li>Selecione a aba <strong>Metas</strong> → formato <strong>CSV</strong> → Publicar</li>
                  <li>Cole a URL gerada abaixo</li>
                </ol>
              </div>

              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">URL do Google Sheets (CSV)</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?gid=...&output=csv"
                className="w-full h-9 px-3 text-xs font-mono border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-olive/30 focus:border-brand-olive mb-4"
              />

              {sheetsStatus === 'error' && (
                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
                  <AlertCircle size={13} />
                  {sheetsError}
                </div>
              )}
              {sheetsStatus === 'ok' && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
                  <CheckCircle size={13} />
                  Google Sheets conectado com sucesso!
                </div>
              )}

              {sheetsURL && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                  <Link size={12} />
                  <span className="truncate flex-1">{sheetsURL}</span>
                  <button onClick={clearSheetsURL} className="text-rose-500 hover:text-rose-700 flex-shrink-0">
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button onClick={onClose} className="h-9 px-4 text-sm font-medium border border-surface-border rounded-lg text-zinc-600 hover:bg-surface-muted">
                  Cancelar
                </button>
                <button
                  onClick={handleConnectSheets}
                  disabled={saving || !url}
                  className="h-9 px-5 text-sm font-medium bg-brand-black text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {saving ? <><RefreshCw size={13} className="animate-spin" /> Carregando...</> : <><Link size={13} /> Conectar planilha</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function Metas() {
  const { filteredData, rawData } = useFilters();
  const { getMeta, getMetaTotal, sheetsURL } = useMetas();
  const [showModal, setShowModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const allMonths = useMemo(() => getMonthlyTotals(rawData), [rawData]);
  const lojas     = useMemo(() => [...new Set(rawData.map(r => r.Loja))].sort(), [rawData]);

  // Período selecionado — default = último mês
  const period = selectedPeriod || allMonths[allMonths.length - 1]?.key;
  const periodLabel = allMonths.find(m => m.key === period)?.label || period;

  // Realizado do período selecionado por loja
  const realizadoPorLoja = useMemo(() => {
    const periodoData = rawData.filter(r => r.Ano_Mes === period);
    const byLoja = groupBy(periodoData, 'Loja');
    const result = {};
    lojas.forEach(l => {
      result[l] = sumValues(byLoja[l] || []);
    });
    return result;
  }, [rawData, period, lojas]);

  const totalMeta     = getMetaTotal(period, lojas);
  const totalRealizado = Object.values(realizadoPorLoja).reduce((s, v) => s + v, 0);
  const totalPct      = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;

  // Histórico de atingimento (todos os meses)
  const histData = useMemo(() => {
    return allMonths.map(m => {
      const real = m.total;
      const meta = getMetaTotal(m.key, lojas);
      const pct  = meta > 0 ? (real / meta) * 100 : null;
      return { label: m.label, key: m.key, real, meta, pct };
    });
  }, [allMonths, lojas, getMeta]);

  // Lojas ordenadas por % atingimento
  const lojasOrdenadas = useMemo(() => {
    return lojas
      .map(l => {
        const real = realizadoPorLoja[l] || 0;
        const meta = getMeta(period, l);
        const pct  = meta > 0 ? (real / meta) * 100 : null;
        return { loja: l, real, meta, pct, saldo: real - meta };
      })
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  }, [lojas, realizadoPorLoja, period, getMeta]);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {showModal && (
        <MetasModal
          onClose={() => setShowModal(false)}
          lojas={lojas}
          allMonths={allMonths}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold font-display text-brand-black">Metas por Loja</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {sheetsURL
              ? <span className="text-emerald-600 font-medium">📊 Dados via Google Sheets</span>
              : <span>💾 Metas salvas localmente</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="h-8 pl-3 pr-8 text-xs font-medium bg-white border border-surface-border rounded-lg text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-olive/30 focus:border-brand-olive"
          >
            {allMonths.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-8 px-3 text-xs font-medium border border-surface-border rounded-lg text-zinc-600 hover:bg-surface-muted hover:text-brand-black transition-colors"
          >
            <Settings size={13} />
            Configurar metas
          </button>
        </div>
      </div>

      {/* Barra de progresso total */}
      <BigProgressBar
        label={`Meta Total — ${periodLabel}`}
        sublabel={`${lojas.length} lojas`}
        realizado={totalRealizado}
        meta={totalMeta}
        delay={0}
      />

      {/* Cards por loja */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {lojasOrdenadas.map((l, i) => {
          const col = progressColor(l.pct ?? 0);
          return (
            <div
              key={l.loja}
              className="bg-white border border-surface-border rounded-2xl p-4 animate-slide-up hover:shadow-card-hover transition-all"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both', borderLeft: `4px solid ${col.bar}` }}
            >
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate mb-2">{l.loja}</p>
              <p className="text-lg font-bold font-display" style={{ color: col.text }}>
                {formatBRL(l.real, true)}
              </p>
              <p className="text-xs text-zinc-400 mb-3">meta {formatBRL(l.meta, true)}</p>
              <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(l.pct ?? 0, 100)}%`, backgroundColor: col.bar }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: col.text }}>
                  {l.pct !== null ? l.pct.toFixed(1).replace('.', ',') + '%' : '—'}
                </span>
                <span style={{ color: l.saldo >= 0 ? '#059669' : '#dc2626' }}>
                  {l.saldo >= 0 ? '+' : ''}{formatBRL(l.saldo, true)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico histórico realizado vs meta */}
      <div className="bg-white border border-surface-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold font-display text-brand-black mb-1">Realizado vs Meta — histórico mensal</h3>
        <p className="text-xs text-zinc-400 mb-5">Barras = realizado · Linha tracejada = meta</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={histData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatBRL(v, true)} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={76} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="real" name="Realizado" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {histData.map((d, i) => (
                <Cell key={i} fill={progressColor(d.pct ?? 0).bar} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="meta" name="Meta" stroke="#0D0D0D" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* % de atingimento ao longo do tempo */}
      <div className="bg-white border border-surface-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold font-display text-brand-black mb-1">% de Atingimento por Mês</h3>
        <p className="text-xs text-zinc-400 mb-5">Linha de referência em 100%</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={histData.filter(d => d.pct !== null)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => v + '%'} tick={{ fontSize: 11, fill: '#A1A1AA' }} axisLine={false} tickLine={false} width={45} />
            <Tooltip formatter={v => v !== null ? v.toFixed(1) + '%' : '—'} />
            <ReferenceLine y={100} stroke="#059669" strokeDasharray="5 4" strokeWidth={1.5} />
            <Line type="monotone" dataKey="pct" name="% Atingimento" stroke="#97A624" strokeWidth={2.5} dot={{ r: 3, fill: '#97A624', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela detalhada */}
      <div className="bg-white border border-surface-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold font-display text-brand-black mb-4">Detalhe por Loja — {periodLabel}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2 pr-4">Loja</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2 px-4">Meta</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2 px-4">Realizado</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2 px-4">Saldo</th>
                <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2 pl-4">% Ating.</th>
              </tr>
            </thead>
            <tbody>
              {lojasOrdenadas.map(l => (
                <tr key={l.loja} className="border-b border-surface-border/50 hover:bg-surface-muted/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-brand-black">{l.loja}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-zinc-500">{formatBRL(l.meta)}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-brand-black">{formatBRL(l.real)}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm" style={{ color: l.saldo >= 0 ? '#059669' : '#dc2626' }}>
                    {l.saldo >= 0 ? '+' : ''}{formatBRL(l.saldo)}
                  </td>
                  <td className="py-3 pl-4 text-right"><AtingBadge pct={l.pct} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-surface-border bg-surface-muted/30">
                <td className="py-3 pr-4 text-xs font-semibold text-zinc-500 uppercase">Total</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-semibold">{formatBRL(totalMeta)}</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-semibold">{formatBRL(totalRealizado)}</td>
                <td className="py-3 px-4 text-right font-mono text-sm font-semibold" style={{ color: (totalRealizado - totalMeta) >= 0 ? '#059669' : '#dc2626' }}>
                  {(totalRealizado - totalMeta) >= 0 ? '+' : ''}{formatBRL(totalRealizado - totalMeta)}
                </td>
                <td className="py-3 pl-4 text-right"><AtingBadge pct={totalPct} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
