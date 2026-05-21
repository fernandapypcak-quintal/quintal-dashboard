// src/components/pages/Hoje.jsx
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { formatBRL } from '../../utils/formatters';

const ZIG_TOKEN = '2ecab4ee4268947c2b964fbbd999bf87960cf3c9dd77dabc25db479af38223d6';
const ZIG_BASE  = 'https://api.zigcore.com.br/integration';
const ZIG_REDE  = '46ec43b2-f955-453e-840d-02e68e40a9c2';

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
  return new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
async function zigGet(ep) {
  const r = await fetch(ZIG_BASE + ep, { headers: { Authorization: ZIG_TOKEN } });
  return r.ok ? r.json() : null;
}

const LOJA_COLORS = {
  'CARINAS':'#97A624','CHÁCARA':'#D9B504','LAPA':'#2563eb','PAVÃO':'#ea580c',
  'PERDIZES':'#8C1414','SANTANA':'#7c3aed','SANTO ANDRÉ':'#6b7280',
  'TATUAPÉ':'#0891b2','VILA MADALENA':'#059669','VILA MARIANA':'#0D9488',
};

function emptyLoja() {
  return { salao: 0, delivery: 0, pessoas: 0, valorComp: 0 };
}

export default function Hoje() {
  const [dados,     setDados]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [ultimaAtu, setUltimaAtu] = useState(null);
  const [erro,      setErro]      = useState(null);
  const [mostraDia, setMostraDia] = useState('hoje');

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const hoje  = new Date();
      const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
      const dtHoje  = fmtDate(hoje);
      const dtOntem = fmtDate(ontem);

      const lojas = await zigGet(`/erp/lojas?rede=${ZIG_REDE}`);
      if (!lojas) throw new Error('Erro ao buscar lojas');
      const lojasMapeadas = lojas.filter(l => MAPA_LOJAS[l.name]);

      const promises = lojasMapeadas.flatMap(loja => {
        const mapa = MAPA_LOJAS[loja.name];
        return [
          zigGet(`/erp/faturamento?dtinicio=${dtHoje}&dtfim=${dtHoje}&loja=${loja.id}`)
            .then(d => ({ tipo:'fat', dia:'hoje', loja, mapa, data:d })),
          zigGet(`/erp/faturamento?dtinicio=${dtOntem}&dtfim=${dtOntem}&loja=${loja.id}`)
            .then(d => ({ tipo:'fat', dia:'ontem', loja, mapa, data:d })),
          zigGet(`/erp/compradores?dtinicio=${dtHoje}&dtfim=${dtHoje}&loja=${loja.id}`)
            .then(d => ({ tipo:'comp', dia:'hoje', loja, mapa, data:d })),
          zigGet(`/erp/compradores?dtinicio=${dtOntem}&dtfim=${dtOntem}&loja=${loja.id}`)
            .then(d => ({ tipo:'comp', dia:'ontem', loja, mapa, data:d })),

        ];
      });

      const results = await Promise.allSettled(promises);

      const hoje_data  = {};
      const ontem_data = {};

      results.forEach(r => {
        if (r.status !== 'fulfilled') return;
        const { tipo, dia, mapa, data } = r.value;
        if (!data?.length) return;
        const target = dia === 'hoje' ? hoje_data : ontem_data;
        const lj = mapa.loja;
        if (!target[lj]) target[lj] = emptyLoja();

        if (tipo === 'fat') {
          // Agrupa por eventId — cada evento pode ter múltiplos registros
          // (um por método de pagamento). O valor correto é a soma dos métodos.
          // Mas eventos de SALÃO frequentemente são pagos em múltiplos métodos
          // então precisamos somar POR EVENTO (não por registro).
          // Verificamos: se eventId existe e já foi somado, pulamos.
          // IMPORTANTE: cada registro já representa o valor parcial do método,
          // então SOMAMOS todos os registros do mesmo evento = valor total do evento.
          if (mapa.canal === 'CASA') {
            // Agrupa por eventId para evitar dupla contagem
            const porEvento = {};
            data.forEach(item => {
              const eid = String(item.eventId || item.id || Math.random());
              if (!porEvento[eid]) porEvento[eid] = 0;
              porEvento[eid] += (item.value || 0) / 100;
            });
            // Soma o valor total de cada evento (já consolidado)
            Object.values(porEvento).forEach(v => {
              if (v > 0) target[lj].salao += v;
            });
          } else {
            // Delivery: cada registro é independente, soma direta
            data.forEach(item => {
              const v = (item.value || 0) / 100;
              if (v > 0) target[lj].delivery += v;
            });
          }
        }

        if (tipo === 'comp') {
          // 1 registro = 1 comprador (melhor aproximação disponível na API)
          data.forEach(item => {
            const v = (item.productsValue || 0) / 100;
            if (v <= 0) return;
            target[lj].pessoas   += 1;
            target[lj].valorComp += v;
          });
        }
      });

      const todasLojas = [...new Set([...Object.keys(hoje_data), ...Object.keys(ontem_data)])].sort();

      const porLoja = todasLojas.map(lj => {
        const h = hoje_data[lj]  || emptyLoja();
        const o = ontem_data[lj] || emptyLoja();
        const totalH = h.salao + h.delivery;
        const totalO = o.salao + o.delivery;
        return {
          loja: lj,
          hoje:  { total: totalH, salao: h.salao, delivery: h.delivery,
                   ticket: h.pessoas > 0 ? h.valorComp/h.pessoas : 0, pessoas: h.pessoas },
          ontem: { total: totalO, salao: o.salao, delivery: o.delivery,
                   ticket: o.pessoas > 0 ? o.valorComp/o.pessoas : 0, pessoas: o.pessoas },
          varOntem: totalO > 0 ? (totalH - totalO) / totalO * 100 : null,
          color: LOJA_COLORS[lj] || '#999',
        };
      });

      const totalH   = porLoja.reduce((s,l) => s + l.hoje.total,    0);
      const totalO   = porLoja.reduce((s,l) => s + l.ontem.total,   0);
      const salaoH   = porLoja.reduce((s,l) => s + l.hoje.salao,    0);
      const delH     = porLoja.reduce((s,l) => s + l.hoje.delivery, 0);
      const salaoO   = porLoja.reduce((s,l) => s + l.ontem.salao,   0);
      const delO     = porLoja.reduce((s,l) => s + l.ontem.delivery,0);
      const pessoasH = porLoja.reduce((s,l) => s + l.hoje.pessoas,  0);
      const valorCH  = porLoja.reduce((s,l) => s + l.hoje.pessoas * l.hoje.ticket, 0);
      const ticketH  = pessoasH > 0 ? valorCH / pessoasH : 0;
      const pessoasO = porLoja.reduce((s,l) => s + l.ontem.pessoas, 0);
      const valorCO  = porLoja.reduce((s,l) => s + l.ontem.pessoas * l.ontem.ticket, 0);
      const ticketO  = pessoasO > 0 ? valorCO / pessoasO : 0;

      setDados({ porLoja, dtHoje, dtOntem,
        hoje:  { total: totalH, salao: salaoH, delivery: delH, ticket: ticketH, pessoas: pessoasH },
        ontem: { total: totalO, salao: salaoO, delivery: delO, ticket: ticketO, pessoas: pessoasO },
        varTotal: totalO > 0 ? (totalH - totalO) / totalO * 100 : null,
      });
      setUltimaAtu(fmtHora());
    } catch(e) { setErro(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    carregar();
    const iv = setInterval(carregar, 5*60*1000);
    return () => clearInterval(iv);
  }, [carregar]);

  const d  = mostraDia === 'hoje';
  const kd = d ? dados?.hoje : dados?.ontem;

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
          <div className="flex bg-surface-muted rounded-xl p-0.5 text-sm">
            {['hoje','ontem'].map(op => (
              <button key={op} onClick={() => setMostraDia(op)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors capitalize
                  ${mostraDia===op ? 'bg-white shadow-sm text-brand-black' : 'text-zinc-500'}`}>
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </button>
            ))}
          </div>
          {ultimaAtu && <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={11}/> {ultimaAtu}</span>}
          <button onClick={carregar} disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-surface-border text-zinc-500 hover:border-zinc-400 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
            Atualizar
          </button>
        </div>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">Erro: {erro}</div>}
      {loading && !dados && (
        <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">
          <RefreshCw size={18} className="animate-spin mr-2"/> Carregando dados em tempo real...
        </div>
      )}

      {dados && kd && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-surface-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Faturamento {d ? 'Hoje' : 'Ontem'}
              </p>
              <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(kd.total, true)}</p>
              {d && dados.varTotal !== null && (
                <p className={`text-xs font-semibold mt-1 ${dados.varTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {dados.varTotal >= 0 ? '▲' : '▼'} {Math.abs(dados.varTotal).toFixed(1).replace('.',',')}% vs ontem
                </p>
              )}
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Salão</p>
              <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(kd.salao, true)}</p>
              <p className="text-xs text-zinc-400 mt-1">{kd.total > 0 ? (kd.salao/kd.total*100).toFixed(1).replace('.',',') : '0'}% do total</p>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Delivery</p>
              <p className="text-2xl font-bold font-display text-brand-black">{formatBRL(kd.delivery, true)}</p>
              <p className="text-xs text-zinc-400 mt-1">{kd.total > 0 ? (kd.delivery/kd.total*100).toFixed(1).replace('.',',') : '0'}% do total</p>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold font-display text-brand-black">{kd.ticket > 0 ? formatBRL(kd.ticket) : '—'}</p>
              {kd.pessoas > 0 && <p className="text-xs text-zinc-400 mt-1">{kd.pessoas.toLocaleString('pt-BR')} pessoas</p>}
            </div>
          </div>

          {/* Tabela por loja */}
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
              <h3 className="font-semibold text-brand-black">Por Loja — {d ? 'Hoje' : 'Ontem'}</h3>
              {d && <span className="text-xs text-zinc-400">comparando com ontem</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/30">
                    <th className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Loja</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Salão</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Delivery</th>
                    {d && <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Vs Ontem</th>}
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Ticket Médio</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Pessoas</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.porLoja
                    .filter(l => d ? l.hoje.total > 0 : l.ontem.total > 0)
                    .sort((a,b) => d ? b.hoje.total - a.hoje.total : b.ontem.total - a.ontem.total)
                    .map(l => {
                      const v   = d ? l.hoje : l.ontem;
                      const tot = d ? dados.hoje.total : dados.ontem.total;
                      const pct = tot > 0 ? v.total/tot*100 : 0;
                      return (
                        <tr key={l.loja} className="border-b border-surface-border/50 hover:bg-surface-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:l.color}}/>
                              <span className="font-medium text-brand-black">{l.loja}</span>
                              <span className="text-[10px] text-zinc-400">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1 ml-4 h-1 bg-surface-muted rounded-full overflow-hidden w-20">
                              <div className="h-full rounded-full" style={{width:`${pct}%`,background:l.color}}/>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-brand-black">
                            {v.total > 0 ? formatBRL(v.total, true) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600">
                            {v.salao > 0 ? formatBRL(v.salao, true) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600">
                            {v.delivery > 0 ? formatBRL(v.delivery, true) : '—'}
                          </td>
                          {d && (
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
                            {v.ticket > 0 ? formatBRL(v.ticket) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-500">
                            {v.pessoas > 0 ? v.pessoas : '—'}
                          </td>
                        </tr>
                      );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-border bg-surface-muted/30 font-semibold">
                    <td className="py-3 px-4 text-xs text-zinc-500 uppercase">Total</td>
                    <td className="py-3 px-4 text-right font-mono text-brand-black">{formatBRL(kd.total, true)}</td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-600">{formatBRL(kd.salao, true)}</td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-600">{formatBRL(kd.delivery, true)}</td>
                    {d && (
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
                      {kd.ticket > 0 ? formatBRL(kd.ticket) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-500">
                      {kd.pessoas > 0 ? kd.pessoas : '—'}
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
