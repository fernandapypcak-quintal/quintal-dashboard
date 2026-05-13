// src/components/ui/MultiSelect.jsx
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export default function MultiSelect({
  options,       // [{ value, label }]
  selected,      // Set of selected values
  onChange,      // (newSet) => void
  placeholder,   // "Todas as lojas"
  allLabel,      // "Todas"
}) {
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allSelected = selected.size === 0;
  const count       = selected.size;

  function toggle(value) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  function toggleAll() {
    onChange(new Set()); // empty = "all"
  }

  // Label shown on the button
  const buttonLabel = allSelected
    ? placeholder
    : count === 1
      ? options.find(o => selected.has(o.value))?.label ?? placeholder
      : `${count} selecionados`;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          h-8 pl-3 pr-2 text-xs font-medium border rounded-lg
          flex items-center gap-1.5 whitespace-nowrap transition-all
          ${open || !allSelected
            ? 'bg-brand-black text-white border-brand-black'
            : 'bg-white text-zinc-600 border-surface-border hover:border-zinc-400'
          }
        `}
      >
        <span>{buttonLabel}</span>
        {!allSelected && (
          <span
            onClick={e => { e.stopPropagation(); onChange(new Set()); }}
            className="ml-0.5 hover:opacity-70"
          >
            <X size={11} />
          </span>
        )}
        {allSelected && <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-surface-border rounded-xl shadow-card-hover min-w-[180px] py-1.5 animate-slide-up">
          {/* All option */}
          <button
            onClick={toggleAll}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-muted ${
              allSelected ? 'text-brand-black' : 'text-zinc-500'
            }`}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
              allSelected ? 'bg-brand-black border-brand-black' : 'border-zinc-300'
            }`}>
              {allSelected && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            {allLabel || 'Todos'}
          </button>

          <div className="my-1 border-t border-surface-border" />

          {/* Individual options */}
          {options.map(opt => {
            const isSelected = selected.has(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-muted text-zinc-700"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? 'bg-brand-olive border-brand-olive' : 'border-zinc-300'
                }`}>
                  {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
