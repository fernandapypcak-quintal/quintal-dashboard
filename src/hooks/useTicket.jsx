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

  // Ticket médio para um período (ano+mes) e loja/canal opcionais
  function getTicket(ano, mes, loja = null, canal = null) {
    let recs = compradores.filter(r => r.Ano === ano && r.Mes === mes);
    if (loja)  recs = recs.filter(r => r.Loja  === loja);
    if (canal) recs = recs.filter(r => r.Canal === canal);
    const totalPessoas = recs.reduce((s,r) => s + r.Pessoas, 0);
    const totalValor   = recs.reduce((s,r) => s + r.Valor,   0);
    return { ticket: totalPessoas > 0 ? totalValor/totalPessoas : 0, pessoas: totalPessoas, valor: totalValor };
  }

  // Desconto para um período
  function getDesconto(ano, mes, loja = null) {
    let recs = descontos.filter(r => r.Ano === ano && r.Mes === mes);
    if (loja) recs = recs.filter(r => r.Loja === loja);
    const totalDesconto = recs.reduce((s,r) => s + r.Desconto, 0);
    const totalBruto    = recs.reduce((s,r) => s + r.Bruto,    0);
    return { desconto: totalDesconto, bruto: totalBruto, pct: totalBruto > 0 ? totalDesconto/totalBruto*100 : 0 };
  }

  return (
    <Ctx.Provider value={{ loading, getTicket, getDesconto }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTicket() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTicket fora do TicketProvider');
  return ctx;
}
