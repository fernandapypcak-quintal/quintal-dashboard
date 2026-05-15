// src/components/ui/InfoTip.jsx
// Usa position:fixed para não ser cortado por overflow:hidden dos pais
import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export default function InfoTip({ text }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  function handleEnter() {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      // Posiciona acima do ícone, centralizado
      top:  r.top - 8,
      left: r.left + r.width / 2,
      above: r.top > 140,        // se tem espaço acima
      right: r.left > window.innerWidth / 2, // se está na metade direita
    });
  }

  return (
    <span className="relative inline-flex items-center ml-1 flex-shrink-0"
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setPos(null)}>
      <Info size={12} className="text-zinc-300 hover:text-zinc-500 cursor-help transition-colors" />
      {pos && (
        <div style={{
          position: 'fixed',
          zIndex: 99999,
          top:  pos.above ? pos.top : pos.top + 20,
          left: pos.right ? 'auto' : pos.left,
          right: pos.right ? (window.innerWidth - pos.left - 12) : 'auto',
          transform: pos.right ? 'none' : 'translateX(-50%)',
          pointerEvents: 'none',
        }}
          className={`bg-zinc-900 text-white text-xs rounded-xl px-3 py-2.5 w-64 shadow-xl leading-relaxed ${pos.above ? '-translate-y-full' : 'translate-y-2'}`}>
          {text}
        </div>
      )}
    </span>
  );
}
