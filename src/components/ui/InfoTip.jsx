// src/components/ui/InfoTip.jsx
import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export default function InfoTip({ text }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: true, right: false });
  const ref = useRef(null);

  function handleEnter() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      // Se estiver muito perto do topo, abre para baixo
      const top = r.top > 120;
      // Se estiver na metade direita da tela, abre para a esquerda
      const right = r.left > window.innerWidth / 2;
      setPos({ top, right });
    }
    setShow(true);
  }

  return (
    <div className="relative inline-flex items-center ml-1 flex-shrink-0"
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}>
      <Info size={12} className="text-zinc-300 hover:text-zinc-500 cursor-help transition-colors" />
      {show && (
        <div className={`
          absolute z-[9999] pointer-events-none
          bg-zinc-900 text-white text-xs rounded-xl
          px-3 py-2.5 w-64 shadow-xl leading-relaxed
          ${pos.top ? 'bottom-full mb-2' : 'top-full mt-2'}
          ${pos.right ? 'right-0' : 'left-1/2 -translate-x-1/2'}
        `}>
          {text}
          <div className={`absolute ${pos.right ? 'right-3' : 'left-1/2 -translate-x-1/2'} ${pos.top ? 'top-full border-t-zinc-900 border-t-4 border-x-4 border-x-transparent border-b-0' : 'bottom-full border-b-zinc-900 border-b-4 border-x-4 border-x-transparent border-t-0'}`} />
        </div>
      )}
    </div>
  );
}
