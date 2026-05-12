// src/App.jsx
import { useState } from 'react';
import { FilterProvider, useFilters } from './hooks/useFilters';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Overview from './components/pages/Overview';
import Trend from './components/pages/Trend';
import YoY from './components/pages/YoY';
import Weekly from './components/pages/Weekly';
import Stores from './components/pages/Stores';
import History from './components/pages/History';
import LoadingScreen, { ErrorScreen } from './components/ui/LoadingScreen';

const PAGES = {
  overview: Overview,
  trend:    Trend,
  yoy:      YoY,
  weekly:   Weekly,
  stores:   Stores,
  history:  History,
};

function Dashboard() {
  const [activePage, setActivePage] = useState('overview');
  const { loading, error } = useFilters();
  const PageComponent = PAGES[activePage] || Overview;

  if (loading) return <LoadingScreen message="Carregando faturamento..." />;
  if (error)   return <ErrorScreen error={error} />;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header activePage={activePage} />
        <main className="flex-1 overflow-y-auto">
          <PageComponent key={activePage} />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FilterProvider>
      <Dashboard />
    </FilterProvider>
  );
}
