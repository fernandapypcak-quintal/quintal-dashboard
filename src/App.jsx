// src/App.jsx
import { useState } from 'react';
import { FilterProvider, useFilters } from './hooks/useFilters';
import { MetasProvider } from './hooks/useMetas';
import { LabelsProvider } from './hooks/useLabels';
import { AlmocoProvider } from './hooks/useAlmoco';
import { TicketProvider } from './hooks/useTicket';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import Header from './components/layout/Header';
import Overview from './components/pages/Overview';
import Hoje from './components/pages/Hoje';
import Trend from './components/pages/Trend';
import Weekly from './components/pages/Weekly';
import Stores from './components/pages/Stores';
import History from './components/pages/History';
import LoadingScreen, { ErrorScreen } from './components/ui/LoadingScreen';

const PAGES = {
  hoje: Hoje, overview: Overview, trend: Trend,
  weekly: Weekly, stores: Stores, history: History,
};

function Dashboard() {
  const [activePage, setActivePage] = useState('overview');
  const { loading, error } = useFilters();
  const PageComponent = PAGES[activePage] || Overview;

  if (loading) return <LoadingScreen message="Carregando faturamento..." />;
  if (error)   return <ErrorScreen error={error} />;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      {/* Sidebar — só aparece em telas grandes */}
      <div className="hidden lg:flex">
        <Sidebar activePage={activePage} onPageChange={setActivePage} />
      </div>

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header activePage={activePage} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <PageComponent key={activePage} />
        </main>
      </div>

      {/* Bottom nav — só aparece em mobile */}
      <div className="lg:hidden">
        <BottomNav activePage={activePage} onPageChange={setActivePage} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FilterProvider>
      <MetasProvider>
        <LabelsProvider>
          <AlmocoProvider>
            <TicketProvider>
              <Dashboard />
            </TicketProvider>
          </AlmocoProvider>
        </LabelsProvider>
      </MetasProvider>
    </FilterProvider>
  );
}
