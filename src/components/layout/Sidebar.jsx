// src/components/layout/Sidebar.jsx
import { useState } from 'react';
import {
  LayoutDashboard, TrendingUp, CalendarRange, Calendar,
  Store, Table2, ChevronLeft, ChevronRight
} from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Visão Geral',  icon: LayoutDashboard },
  { id: 'trend',    label: 'Tendência',    icon: TrendingUp },
  { id: 'weekly',   label: 'Semanal',      icon: Calendar },
  { id: 'stores',   label: 'Por Loja',     icon: Store },
  { id: 'history',  label: 'Histórico',    icon: Table2 },
];

export default function Sidebar({ activePage, onPageChange }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`relative flex flex-col bg-surface-card border-r border-surface-border transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-56'}`} style={{minHeight:'100vh'}}>
      {/* Logo */}
      <div className={`flex items-center border-b border-surface-border bg-brand-black ${collapsed ? 'justify-center px-3 py-4' : 'px-4 py-3'}`}>
        {collapsed ? (
          <img src="/logo.webp" alt="Quintal do Espeto" className="w-8 h-8 object-contain" />
        ) : (
          <img src="/logo.webp" alt="Quintal do Espeto" className="h-10 object-contain" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-3 pb-2">Analytics</p>
        )}
        {NAV.map(item => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button key={item.id} onClick={() => onPageChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${collapsed ? 'justify-center' : ''} ${active ? 'bg-brand-black text-white' : 'text-zinc-500 hover:text-brand-black hover:bg-surface-muted'}`}>
              <Icon size={16} className={active ? 'text-white' : ''} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-olive" />}
            </button>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="px-2 py-3 border-t border-surface-border">
        <button onClick={() => setCollapsed(c => !c)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-700 hover:bg-surface-muted transition-all ${collapsed ? 'justify-center' : ''}`}>
          {collapsed ? <ChevronRight size={14}/> : <><ChevronLeft size={14}/><span>Recolher</span></>}
        </button>
      </div>
    </aside>
  );
}
