// src/components/pages/Hoje.jsx
// Página de dados em tempo real — busca direto da ZIG API
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, Users, Tag, Clock } from 'lucide-react';
import { formatBRL } from '../../utils/formatters';

const ZIG_TOKEN = '2ecab4ee4268947c2b964fbbd999bf87960cf3c9dd77dabc25db479af38223d6';
const ZIG_BASE  = 'https://api.zigcore.com.br/integration';
const ZIG_REDE  = '46ec43b2-f955-453e-840d-02e68e40a9c2';
const AS_URL    = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const MAPA_LOJAS = {
  'Quintal do Espeto Carinás':          { loja: 'CARINAS',       canal: 'CASA' },
  'Delivery Carinás':                   { loja: 'CARINAS',       canal: 'DELIVERY' },
  'Quintal do Espeto Lapa ':            { loja: 'LAPA',          canal: 'CASA' },
  'Delivery Lapa':                      { loja: 'LAPA',          canal: 'DELIVERY' },
  'Quintal do Espeto  V. Mariana':      { loja: 'VILA MARIANA',  canal: 'CASA' },
  'Delivery V. Mariana':                { loja: 'VILA MARIANA',  canal: 'DELIVERY' },
  'Quintal do Espeto Chac Sto Antonio': { loja: 'CHÁCARA',       canal: 'CASA' },
  'Delivery Chac. Sto Antonio':         { loja: 'CHÁCARA',       canal: 'DELIVERY' },
  'Quintal do Espeto Santo André':      { loja: 'SANTO ANDRÉ',   canal: 'CASA' },
  'Delivery Santo André':               { loja: 'SANTO ANDRÉ',   canal: 'DELIVERY' },
  'Quintal do Espeto Pavão':            { loja: 'PAVÃO',         canal: 'CASA' },
  'Delivery Pavão':                     { loja: 'PAVÃO',         canal: 'DELIVERY' },
  'Quintal do Espeto  V. Madalena':     { loja: 'VILA MADALENA', canal: 'CASA' },
  'Delivery Vila Madalena':             { loja: 'VILA MADALENA', canal: 'DELIVERY' },
  'Quintal do Espeto Perdizes':         { loja: 'PERDIZES',      canal: 'CASA' },
  'Delivery Perdizes':                  { loja: 'PERDIZES',      canal: 'DELIVERY' },
  'Quintal do Espeto Tatuapé':          { loja: 'TATUAPÉ',       canal: 'CASA' },
  'Delivery Tatuapé':                   { loja: 'TATUAPÉ',       canal: 'DELIVERY' },
  'Quintal do Espeto Santana':          { loja: 'SANTANA',       canal: 'CASA' },
  'Delivery Santana':                   { loja: 'SANTANA',       canal: 'DELIVERY' },
};

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtHora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function zigGet(endpoint) {
  const res = await fetch(ZIG_BASE + endpoint, {
    headers: { 'Authorization': ZIG_TOKEN }
  });
  if (!res.ok) return null;
  return res.json();
}

const LOJA_COLORS = {
  'CARINAS':      '#97A624', 'CHÁCARA':      '#D9B504',
  'LAPA':         '#2563eb', 'PAVÃO':        '#ea580c',
  'PERDIZES':     '#8C1414', 'SANTANA':      '#7c3aed',
  'SANTO ANDRÉ':  '#6b7280', 'TATUAPÉ':      '#0891b2',
  'VILA MADALENA':'#059669', 'VILA MARIANA': '#0D9488',
};

export default function Hoje() {
  const [dados, setDados]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [ultimaAtu, setUltimaAtu] = useState(null);
  const [erro, setErro]         = useState(null);
  const [mostraDia, setMostraDia] = useState('hoje'); // 'hoje' | 'ontem'

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const hoje   = new Date();
      const ontem  = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
      const dtHoje  = fmtDate(hoje);
      const dtOntem = fmtDate(ontem);

      // Busca lojas
      const lojas = await zigGet(`/erp/lojas?rede=${ZIG_REDE}`);
      if (!lojas) throw new Error('Erro ao buscar lojas');

      const lojasMapeadas = lojas.filter(l => MAPA_LOJAS[l.name]);

      // Busca faturamento + compradores em paralelo para hoje e ontem
      const promises = lojasMapeadas.flatMap(loja => [
        zigGet(`/erp/faturamento?dtinicio=${dtHoje}&dtfim=${dtHoje}&loja=${loja.id}`)
          .then(d => ({ tipo: 'fat', dia: 'hoje', loja, data: d })),
        zigGet(`/erp/faturamento?dtinicio=${dtOntem}&dtfim=${dtOntem}&loja=${loja.id}`)
          .then(d => ({ tipo: 'fat', dia: 'ontem', loja, data: d })),
        zigGet(`/erp/compradores?dtinicio=${dtHoje}&dtfim=${dtHoje}&loja=${loja.id}`)
          .then(d => ({ tipo: 'comp', dia: 'hoje', loja, data: d })),
      ]);

      const results = await Promise.allSettled(promises);

      // Processa resultados
      const fatHoje = {}, fatOntem = {}, compradores = {}, descontos = {};

      results.forEach(r => {
        if (r.status !== 'fulfilled') return;
        const { tipo, dia, loja, data } = r.value;
        if (!data?.length) return;
        const mapa = MAPA_LOJAS[loja.name];
        const key  = mapa.loja;

        if (tipo === 'fat') {
          const target = dia === 'hoje' ? fatHoje : fatOntem;
          if (!target[key]) target[key] = { total: 0, casa: 0, delivery: 0, desconto: 0 };
          data.forEach(item => {
            const v = (item.value || 0) / 100;
            if (v <= 0) return;
            target[key].total += v;
            if (mapa.canal === 'CASA') target[key].casa += v;
            else target[key].delivery += v;
          });
        }

        if (tipo === 'comp') {
          if (!compradores[key]) compradores[key] = { total: 0, pessoas: 0 };
          data.forEach(item => {
            compradores[key].total   += (item.productsValue || 0) / 100;
            compradores[key].pessoas += 1;
          });
        }
      });

      // Monta porLoja
      const todasLojas = [...new Set(lojasMapeadas.map(l => MAPA_LOJAS[l.name].loja))].sort();
      const porLoja = todasLojas.map(loja => {
        const h  = fatHoje[loja]   || { total: 0, casa: 0, delivery: 0 };
        const o  = fatOntem[loja]  || { total: 0, casa: 0, delivery: 0 };
        const c  = compradores[loja] || { total: 0, pessoas: 0 };
        const varOntem = o.total > 0 ? (h.total - o.total) / o.total * 100 : null;
        const ticket   = c.pessoas > 0 ? c.total / c.pessoas : 0;
        return { loja, hoje: h, ontem: o, varOntem, ticket, pessoas: c.pessoas };
      }).filter(l => l.hoje.total > 0 || l.ontem.total > 0)
        .sort((a,b) => b.hoje.total - a.hoje.total);

      const totalHoje  = porLoja.reduce((s,l) => s + l.hoje.total,  0);
      const totalOntem = porLoja.reduce((s,l) => s + l.ontem.total, 0);
      const totalPessoas = porLoja.reduce((s,l) => s + l.pessoas, 0);
      const ticketMedio  = totalPessoas > 0
        ? porLoja.reduce((s,l) => s + l.ticket * l.pessoas, 0) / totalPessoas : 0;
      const varTotal = totalOntem > 0 ? (totalHoje - totalOntem) / totalOntem * 100 : null;

      setDados({ porLoja, totalHoje, totalOntem, varTotal, ticketMedio, totalPessoas, dtHoje, dtOntem });
      setUltimaAtu(fmtHora());
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega ao montar e a cada 5 minutos
  useEffect(() => {
    carregar();
    const interval = setInterval(carregar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [carregar]);

  const dia = mostraDia === 'hoje' ? 'hoje' : 'ontem';

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto pb-20 lg:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"/>
            <h2 className="text-base font-semibold text-brand-black">Ao Vivo</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {dados?.dtHoje ? new Date(dados.dtHoje+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}) : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle hoje/ontem */}
          <div className="flex bg-surface-muted rounded-xl p-0.5 text-sm">
            <button onClick={() => setMostraDia('hoje')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${mostraDia==='hoje' ? 'bg-white shadow-sm text-brand-black' : 'text-zinc-500'}`}>
              Hoje
            </button>
            <button onClick={() => setMostraDia('ontem')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${mostraDia==='ontem' ? 'bg-white shadow-sm text-brand-black' : 'text-zinc-500'}`}>
              Ontem
            </button>
          </div>
          {ultimaAtu && (
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock size={11}/> {ultimaAtu}
            </span>
          )}
          <button onClick={carregar} disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-surface-border text-zinc-500 hover:border-zinc-400 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">
          Erro ao carregar dados da ZIG: {erro}
        </div>
      )}

      {loading && !dados && (
        <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">
          <RefreshCw size={18} className="animate-spin mr-2"/> Carregando dados em tempo real...
        </div>
      )}

      {dados && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-surface-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Faturamento {mostraDia === 'hoje' ? 'Hoje' : 'Ontem'}
              </p>
              <p className="text-2xl font-bold font-display text-brand-black">
                {formatBRL(mostraDia === 'hoje' ? dados.totalHoje : dados.totalOntem, true)}
              </p>
              {mostraDia === 'hoje' && dados.varTotal !== null && (
                <p className={`text-xs font-semibold mt-1 ${dados.varTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {dados.varTotal >= 0 ? '▲' : '▼'} {Math.abs(dados.varTotal).toFixed(1).replace('.',',')}% vs ontem
                </p>
              )}
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold font-display text-brand-black">
                {dados.ticketMedio > 0 ? formatBRL(dados.ticketMedio) : '—'}
              </p>
              {dados.totalPessoas > 0 && (
                <p className="text-xs text-zinc-400 mt-1">{dados.totalPessoas} pessoas</p>
              )}
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Salão</p>
              <p className="text-2xl font-bold font-display text-brand-black">
                {formatBRL(dados.porLoja.reduce((s,l) => s+(mostraDia==='hoje'?l.hoje.casa:l.ontem.casa), 0), true)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {dados.totalHoje > 0
                  ? (dados.porLoja.reduce((s,l)=>s+(mostraDia==='hoje'?l.hoje.casa:l.ontem.casa),0) /
                    (mostraDia==='hoje'?dados.totalHoje:dados.totalOntem)*100).toFixed(1)+'%'
                  : '—'} do total
              </p>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Delivery</p>
              <p className="text-2xl font-bold font-display text-brand-black">
                {formatBRL(dados.porLoja.reduce((s,l) => s+(mostraDia==='hoje'?l.hoje.delivery:l.ontem.delivery), 0), true)}
              </p>
            </div>
          </div>

          {/* Tabela por loja */}
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
              <h3 className="font-semibold text-brand-black">Por Loja — {mostraDia === 'hoje' ? 'Hoje' : 'Ontem'}</h3>
              {mostraDia === 'hoje' && (
                <span className="text-xs text-zinc-400">comparando com ontem</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/30">
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Loja</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Salão</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Delivery</th>
                    {mostraDia === 'hoje' && <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">vs Ontem</th>}
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Ticket Médio</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Pessoas</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.porLoja.map(l => {
                    const v = mostraDia === 'hoje' ? l.hoje : l.ontem;
                    const total = mostraDia === 'hoje' ? dados.totalHoje : dados.totalOntem;
                    const share = total > 0 ? v.total/total*100 : 0;
                    return (
                      <tr key={l.loja} className="border-b border-surface-border/50 hover:bg-surface-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{background: LOJA_COLORS[l.loja] || '#999'}}/>
                            <span className="font-medium text-brand-black">{l.loja}</span>
                            <span className="text-[10px] text-zinc-400">{share.toFixed(1)}%</span>
                          </div>
                          {/* Mini barra */}
                          <div className="mt-1 ml-4 h-1 bg-surface-muted rounded-full overflow-hidden" style={{width:'80px'}}>
                            <div className="h-full rounded-full"
                              style={{width:`${share}%`, background: LOJA_COLORS[l.loja] || '#999'}}/>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-brand-black">
                          {v.total > 0 ? formatBRL(v.total, true) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-600">
                          {v.casa > 0 ? formatBRL(v.casa, true) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-600">
                          {v.delivery > 0 ? formatBRL(v.delivery, true) : '—'}
                        </td>
                        {mostraDia === 'hoje' && (
                          <td className="py-3 px-4 text-right">
                            {l.varOntem !== null ? (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                                ${l.varOntem >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                                {l.varOntem >= 0 ? '▲' : '▼'} {Math.abs(l.varOntem).toFixed(1).replace('.',',')}%
                              </span>
                            ) : '—'}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right font-mono text-zinc-600">
                          {l.ticket > 0 ? formatBRL(l.ticket) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-500">
                          {l.pessoas > 0 ? l.pessoas : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-border bg-surface-muted/30 font-semibold">
                    <td className="py-3 px-4 text-xs text-zinc-500 uppercase">Total</td>
                    <td className="py-3 px-4 text-right font-mono text-brand-black">
                      {formatBRL(mostraDia==='hoje' ? dados.totalHoje : dados.totalOntem, true)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-600">
                      {formatBRL(dados.porLoja.reduce((s,l)=>s+(mostraDia==='hoje'?l.hoje.casa:l.ontem.casa),0), true)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-600">
                      {formatBRL(dados.porLoja.reduce((s,l)=>s+(mostraDia==='hoje'?l.hoje.delivery:l.ontem.delivery),0), true)}
                    </td>
                    {mostraDia === 'hoje' && (
                      <td className="py-3 px-4 text-right">
                        {dados.varTotal !== null && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                            ${dados.varTotal >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                            {dados.varTotal >= 0 ? '▲' : '▼'} {Math.abs(dados.varTotal).toFixed(1).replace('.',',')}%
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-mono text-zinc-600">
                      {dados.ticketMedio > 0 ? formatBRL(dados.ticketMedio) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-500">
                      {dados.totalPessoas > 0 ? dados.totalPessoas : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
