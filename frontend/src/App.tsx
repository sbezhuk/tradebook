import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthView } from './components/AuthView';
import { Navbar } from './components/Navbar';
import { StatCards } from './components/StatCards';
import { TradeList } from './components/TradeList';
import { AnalyticsView } from './components/AnalyticsView';
import { TradeModal } from './components/TradeModal';
import { TradeDetailModal } from './components/TradeDetailModal';
import type { Trade, TradeFormData, AnalyticsData } from './types';
import { api } from './api/client';

export const AppContent: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<'trades' | 'analytics'>('trades');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

  // Filters
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

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadTrades = useCallback(async () => {
    if (!user) return;
    setTradesLoading(true);
    try {
      const data = await api.getTrades(filters);
      setTrades(data.items);
    } catch (err) {
      console.error('Failed to load trades:', err);
    } finally {
      setTradesLoading(false);
    }
  }, [user, filters]);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;
    setAnalyticsLoading(true);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTrades();
      loadAnalytics();
    }
  }, [user, loadTrades, loadAnalytics]);

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
      <div className="min-h-screen flex items-center justify-center bg-[#090514] text-purple-300">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mb-3" />
          <p className="text-sm font-medium tracking-wide">Завантаження TradeBook...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#090514] text-purple-50 flex flex-col relative overflow-hidden">
      {/* Liquid Ambient Glowing Orbs */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-purple-700/12 rounded-full blur-[140px] pointer-events-none -translate-y-1/2" />
      <div className="fixed top-1/2 right-10 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-10 w-[600px] h-[600px] bg-indigo-700/10 rounded-full blur-[160px] pointer-events-none translate-y-1/3" />

      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewTrade={handleOpenNew}
      />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        {/* KPI Summary Cards */}
        {analytics && <StatCards stats={analytics.summary} />}

        {/* View Switcher: Trades vs Analytics */}
        {currentTab === 'trades' ? (
          <TradeList
            trades={trades}
            loading={tradesLoading}
            onSelectTrade={handleOpenDetail}
            onEditTrade={handleOpenEdit}
            onDeleteTrade={handleDeleteTrade}
            onNewTrade={handleOpenNew}
            onFilterChange={setFilters}
          />
        ) : (
          <AnalyticsView analytics={analytics} loading={analyticsLoading} />
        )}
      </main>

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
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
