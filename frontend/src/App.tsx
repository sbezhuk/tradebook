import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewView } from './components/OverviewView';
import { TradeList } from './components/TradeList';
import { InsightsBento } from './components/InsightsBento';
import { PsychologyView } from './components/PsychologyView';
import { TradeModal } from './components/TradeModal';
import { TradeDetailModal } from './components/TradeDetailModal';
import { ImportModal } from './components/ImportModal';
import type { Trade, TradeFormData, AnalyticsData } from './types';
import { api } from './api/client';

export const AppContent: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('insights');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const [tagsCount, setTagsCount] = useState<number>(0);

  // Reporting month & Filters & Global Search
  // undefined = initial auto-select latest available month; '' = All time; 'YYYY-MM' = specific month
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    symbol?: string;
    market?: string;
    direction?: string;
    status?: string;
    tag?: string;
    sort_by?: string;
  }>({
    sort_by: 'date_desc',
  });

  // Modals state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const monthParam = selectedMonth || undefined;

  const loadTrades = useCallback(async () => {
    if (!user) return;
    setTradesLoading(true);
    try {
      const mergedFilters = {
        ...filters,
        month: monthParam,
        symbol: searchQuery.trim() || filters.symbol,
      };
      const data = await api.getTrades(mergedFilters);
      setTrades(data.items);
    } catch (err) {
      console.error('Failed to load trades:', err);
    } finally {
      setTradesLoading(false);
    }
  }, [user, filters, searchQuery, monthParam]);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;
    setAnalyticsLoading(true);
    try {
      const [analyticsRes, tagsRes] = await Promise.all([
        api.getAnalytics(monthParam),
        api.getTags(),
      ]);
      setAnalytics(analyticsRes);
      setTagsCount(tagsRes.length);
      if (selectedMonth === undefined) {
        const latestMonth = analyticsRes.available_months[0]?.month ?? '';
        setSelectedMonth(latestMonth);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user, monthParam, selectedMonth]);

  useEffect(() => {
    if (user) {
      loadTrades();
      loadAnalytics();
    }
  }, [user, loadTrades, loadAnalytics]);

  const handleGlobalSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim() && currentTab !== 'trades') {
      setCurrentTab('trades');
    }
  };

  const handleSaveTrade = async (data: TradeFormData, id?: number) => {
    if (id) {
      await api.updateTrade(id, data);
    } else {
      await api.createTrade(data);
    }
    await Promise.all([loadTrades(), loadAnalytics()]);
  };

  const handleDeleteTrade = async (id: number) => {
    try {
      await api.deleteTrade(id);
      await Promise.all([loadTrades(), loadAnalytics()]);
    } catch (err) {
      console.error('Failed to delete trade:', err);
    }
  };

  const handleDeleteAllTrades = async () => {
    await api.deleteAllTrades();
    setSelectedMonth(undefined);
    await Promise.all([loadTrades(), loadAnalytics()]);
  };

  const handleOpenEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setIsTradeModalOpen(true);
  };

  const handleOpenDetail = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsDetailModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingTrade(null);
    setIsTradeModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090611] text-purple-200/70">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-9 w-9 border-b-2 border-[#c49bff] mb-3" />
          <p className="text-xs font-medium tracking-wide">Завантаження TradeBook...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#090611] text-[#f3effb] flex relative overflow-hidden">
      {/* Subtle Ambient Purple Glow matching Verdelo's soft studio illumination */}
      <div className="fixed -top-40 left-1/4 w-[700px] h-[550px] bg-purple-700/12 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[500px] bg-indigo-800/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Left Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        stats={analytics?.summary}
        overallTotalPnl={analytics?.overall_total_pnl}
        overallTotalTrades={analytics?.overall_total_trades}
        tagsCount={tagsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Right Main Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-screen overflow-y-auto">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={handleGlobalSearch}
          onOpenNewTrade={handleOpenNew}
          onOpenImport={() => setIsImportModalOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          trades={trades}
          totalTradesCount={analytics?.overall_total_trades}
          onDeleteAllTrades={handleDeleteAllTrades}
          onSelectTrade={handleOpenDetail}
          onSelectTab={setCurrentTab}
        />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
          {currentTab === 'overview' && (
            <OverviewView
              trades={trades}
              analytics={analytics}
              selectedMonth={selectedMonth ?? ''}
              onSelectMonth={(m) => setSelectedMonth(m)}
              onSelectTrade={handleOpenDetail}
              onGoToTrades={() => setCurrentTab('trades')}
              onGoToInsights={() => setCurrentTab('insights')}
            />
          )}

          {currentTab === 'trades' && (
            <TradeList
              trades={trades}
              loading={tradesLoading}
              selectedMonth={selectedMonth ?? ''}
              onSelectMonth={(m) => setSelectedMonth(m)}
              availableMonths={analytics?.available_months ?? []}
              onSelectTrade={handleOpenDetail}
              onEditTrade={handleOpenEdit}
              onDeleteTrade={handleDeleteTrade}
              onNewTrade={handleOpenNew}
              onOpenImport={() => setIsImportModalOpen(true)}
              onFilterChange={setFilters}
            />
          )}

          {currentTab === 'insights' && (
            <InsightsBento
              key="insights-bento"
              analytics={analytics}
              loading={analyticsLoading}
              selectedMonth={selectedMonth ?? ''}
              onSelectMonth={(m) => setSelectedMonth(m)}
              pageTitle="Аналітика"
              pageSubtitle="Скільки ви заробляєте, утримуєте та де ваша перевага на ринку."
              defaultSubTab="bento"
            />
          )}

          {currentTab === 'setups' && (
            <InsightsBento
              key="setups-bento"
              analytics={analytics}
              loading={analyticsLoading}
              selectedMonth={selectedMonth ?? ''}
              onSelectMonth={(m) => setSelectedMonth(m)}
              pageTitle="Сетапи та активність"
              pageSubtitle="Аналіз ефективності ваших торгових формацій та днів тижня."
              defaultSubTab="setups"
            />
          )}

          {currentTab === 'psychology' && (
            <PsychologyView
              trades={trades}
              stats={analytics?.summary ?? null}
              onSelectTrade={handleOpenDetail}
            />
          )}
        </main>
      </div>

      {/* Trade Edit / Create Modal */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        onSave={handleSaveTrade}
        editTrade={editingTrade}
      />

      {/* Trade Detail Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={(tr) => {
          setIsDetailModalOpen(false);
          handleOpenEdit(tr);
        }}
        onDelete={handleDeleteTrade}
      />

      {/* Hyperliquid Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={async () => {
          setSelectedMonth(undefined);
          await Promise.all([loadTrades(), loadAnalytics()]);
          setCurrentTab('insights');
        }}
      />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
