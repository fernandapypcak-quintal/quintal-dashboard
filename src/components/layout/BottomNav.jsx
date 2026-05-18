// src/components/layout/BottomNav.jsx
// Navegação inferior para mobile
import { LayoutDashboard, TrendingUp, Calendar, Store, Table2 } from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Geral',      icon: LayoutDashboard },
  { id: 'trend',    label: 'Tendência',  icon: TrendingUp },
  { id: 'weekly',   label: 'Semanal',    icon: Calendar },
  { id: 'stores',   label: 'Por Loja',   icon: Store },
  { id: 'history',  label: 'Histórico',  icon: Table2 },
];

export default function BottomNav({ activePage, onPageChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-surface-border
      flex items-stretch h-16 shadow-lg">
      {NAV.map(item => {
        const Icon = item.icon;
        const active = activePage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
              ${active
                ? 'text-brand-black'
                : 'text-zinc-400 active:text-zinc-600'
              }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`text-[10px] font-${active ? 'semibold' : 'normal'}`}>
              {item.label}
            </span>
            {active && (
              <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-brand-olive" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
