// src/components/ui/InfoTip.jsx
// Ícone ? com tooltip explicativo ao passar o mouse

import { Info } from 'lucide-react';

export default function InfoTip({ text }) {
  return (
    <div className="group relative inline-flex items-center ml-1">
      <Info size={12} className="text-zinc-300 hover:text-zinc-500 cursor-help transition-colors flex-shrink-0" />
      <div className="
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2
        hidden group-hover:block z-50
        bg-zinc-900 text-white text-xs rounded-xl
        px-3 py-2.5 w-64 shadow-xl pointer-events-none leading-relaxed
      ">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
      </div>
    </div>
  );
}
