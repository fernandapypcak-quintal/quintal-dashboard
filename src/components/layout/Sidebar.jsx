// src/components/layout/Sidebar.jsx
import { useState } from 'react';
import {
  LayoutDashboard, TrendingUp, CalendarRange, Calendar,
  Store, Table2, ChevronLeft, ChevronRight, Flame
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Visão Geral',  icon: LayoutDashboard },
  { id: 'trend',    label: 'Tendência',    icon: TrendingUp },
  { id: 'yoy',      label: 'Ano vs Ano',   icon: CalendarRange },
  { id: 'weekly',   label: 'Semanal',      icon: Calendar },
  { id: 'stores',   label: 'Por Loja',     icon: Store },
  { id: 'history',  label: 'Histórico',    icon: Table2 },
];

export default function Sidebar({ activePage, onPageChange }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex flex-col bg-surface-card border-r border-surface-border transition-all duration-300 ease-in-out shrink-0 ${collapsed ? 'w-16' : 'w-56'}`}
      style={{ minHeight: '100vh' }}
    >
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-surface-border ${collapsed ? 'justify-center px-3' : ''}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-olive to-brand-amber flex items-center justify-center shrink-0">
          <Flame size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-brand-black font-display leading-tight">Quintal do</p>
            <p className="text-xs font-bold text-brand-olive font-display leading-tight tracking-wide uppercase">Espeto</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-3 pb-2">Analytics</p>
        )}
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-brand-black text-white' : 'text-zinc-500 hover:text-brand-black hover:bg-surface-muted'}`}
            >
              <Icon size={16} className={isActive ? 'text-white' : ''} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-olive" />}
            </button>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-surface-border">
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-700 hover:bg-surface-muted transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Recolher</span></>}
        </button>
      </div>
    </aside>
  );
}
