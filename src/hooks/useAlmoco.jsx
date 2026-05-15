// src/hooks/useAlmoco.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const Ctx = createContext(null);

export function AlmocoProvider({ children }) {
  const [almoco, setAlmoco] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${URL}?tipo=almoco`)
      .then(r => r.json())
      .then(json => {
        if (json.almoco) setAlmoco(json.almoco);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Busca registros de almoço para um período
  function getAlmoco(ano, mes) {
    return almoco.filter(r => r.Ano === ano && r.Mes === mes);
  }

  function getAlmocoLoja(ano, mes, loja) {
    return almoco.filter(r => r.Ano === ano && r.Mes === mes && r.Loja === loja);
  }

  return (
    <Ctx.Provider value={{ almoco, loading, getAlmoco, getAlmocoLoja }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAlmoco() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAlmoco fora do AlmocoProvider');
  return ctx;
}
