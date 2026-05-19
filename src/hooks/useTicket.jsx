// src/hooks/useTicket.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const Ctx = createContext(null);

export function TicketProvider({ children }) {
  const [compradores, setCompradores] = useState([]);
  const [descontos,   setDescontos]   = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch(`${URL}?tipo=compradores`).then(r => r.json()),
      fetch(`${URL}?tipo=descontos`).then(r => r.json()),
    ]).then(([rc, rd]) => {
      if (rc.status === 'fulfilled' && rc.value?.compradores) setCompradores(rc.value.compradores);
      if (rd.status === 'fulfilled' && rd.value?.descontos)   setDescontos(rd.value.descontos);
      setLoading(false);
    });
  }, []);

  // Ticket médio — respeita filtro de lojas (Set), canal e período
  function getTicket(ano, mes, canal = null, lojasFilter = null) {
    let recs = compradores.filter(r => r.Ano === ano && r.Mes === mes);
    if (canal) recs = recs.filter(r => r.Canal === canal);
    if (lojasFilter && lojasFilter.size > 0) {
      // Debug: log available lojas vs filter
      const lojasDisponiveis = [...new Set(recs.map(r => r.Loja))];
      console.log('[ticket] lojas disponíveis:', lojasDisponiveis, '| filtro:', [...lojasFilter]);
      recs = recs.filter(r => lojasFilter.has(r.Loja));
    }
    const totalPessoas = recs.reduce((s,r) => s + r.Pessoas, 0);
    const totalValor   = recs.reduce((s,r) => s + r.Valor,   0);
    return { ticket: totalPessoas > 0 ? totalValor/totalPessoas : 0, pessoas: totalPessoas, valor: totalValor };
  }

  // Ticket por loja específica
  function getTicketLoja(ano, mes, loja, canal = null) {
    let recs = compradores.filter(r => r.Ano === ano && r.Mes === mes && r.Loja === loja);
    if (canal) recs = recs.filter(r => r.Canal === canal);
    const totalPessoas = recs.reduce((s,r) => s + r.Pessoas, 0);
    const totalValor   = recs.reduce((s,r) => s + r.Valor,   0);
    return { ticket: totalPessoas > 0 ? totalValor/totalPessoas : 0, pessoas: totalPessoas };
  }

  // Desconto — respeita filtro de lojas
  function getDesconto(ano, mes, lojasFilter = null) {
    let recs = descontos.filter(r => r.Ano === ano && r.Mes === mes);
    if (lojasFilter && lojasFilter.size > 0) recs = recs.filter(r => lojasFilter.has(r.Loja));
    const totalDesconto = recs.reduce((s,r) => s + r.Desconto, 0);
    const totalBruto    = recs.reduce((s,r) => s + r.Bruto,    0);
    return { desconto: totalDesconto, bruto: totalBruto, pct: totalBruto > 0 ? totalDesconto/totalBruto*100 : 0 };
  }

  return (
    <Ctx.Provider value={{ loading, getTicket, getTicketLoja, getDesconto }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTicket() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTicket fora do TicketProvider');
  return ctx;
}
