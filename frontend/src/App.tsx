import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { ImportView } from './components/ImportView';
import type { ImportMode } from './components/ImportView';
import { DepositModal } from './components/DepositModal';
import type { Trade, TradeFormData, AnalyticsData, Deposit, DepositFormData } from './types';
import { api } from './api/client';
import { exportTradesToCsv } from './utils/exportCsv';

const PAGE_SIZE_STORAGE_KEY = 'tradebook_journal_page_size';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'tradebook_sidebar_collapsed';
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

const getInitialPageSize = (): number => {
  try {
    const saved = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    if (ALLOWED_PAGE_SIZES.includes(saved)) return saved;
  } catch {
    // ignore storage errors
  }
  return 20;
};

const getInitialSidebarCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const AppContent: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('insights');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(getInitialSidebarCollapsed);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [journalTrades, setJournalTrades] = useState<Trade[]>([]);
  const [journalTotal, setJournalTotal] = useState<number>(0);
  const [journalLoading, setJournalLoading] = useState<boolean>(false);
  const [journalPage, setJournalPage] = useState<number>(1);
  const [journalPageSize, setJournalPageSize] = useState<number>(getInitialPageSize);
  const journalRequestIdRef = useRef<number>(0);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

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

  // Modals & Import Page state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [closeTradeMode, setCloseTradeMode] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('trades');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const monthParam = selectedMonth || undefined;

  const loadTrades = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getTrades({
        month: monthParam,
        limit: 500,
      });
      setTrades(data.items);
    } catch (err) {
      console.error('Failed to load trades:', err);
    }
  }, [user, monthParam]);

  const loadJournalTrades = useCallback(async () => {
    if (!user) return;
    const reqId = ++journalRequestIdRef.current;
    setJournalLoading(true);
    try {
      const mergedFilters = {
        ...filters,
        month: monthParam,
        symbol: searchQuery.trim() || filters.symbol,
        skip: (journalPage - 1) * journalPageSize,
        limit: journalPageSize,
      };
      const data = await api.getTrades(mergedFilters);
      if (reqId !== journalRequestIdRef.current) return;

      const maxPage = Math.max(1, Math.ceil(data.total / journalPageSize));
      if (journalPage > maxPage) {
        setJournalPage(maxPage);
        return;
      }

      setJournalTrades(data.items);
      setJournalTotal(data.total);
    } catch (err) {
      if (reqId === journalRequestIdRef.current) {
        console.error('Failed to load journal trades:', err);
      }
    } finally {
      if (reqId === journalRequestIdRef.current) {
        setJournalLoading(false);
      }
    }
  }, [user, filters, searchQuery, monthParam, journalPage, journalPageSize]);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;
    setAnalyticsLoading(true);
    try {
      const analyticsRes = await api.getAnalytics(monthParam);
      setAnalytics(analyticsRes);
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

  const loadDeposits = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getDeposits();
      setDeposits(res.items);
    } catch (err) {
      console.error('Failed to load deposits:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTrades();
      loadAnalytics();
      loadDeposits();
    }
  }, [user, loadTrades, loadAnalytics, loadDeposits]);

  useEffect(() => {
    if (user) {
      loadJournalTrades();
    }
  }, [user, loadJournalTrades]);

  const handleAddDeposit = async (data: DepositFormData) => {
    await api.createDeposit(data);
    await Promise.all([loadDeposits(), loadAnalytics()]);
  };

  const handleDeleteDeposit = async (id: number) => {
    await api.deleteDeposit(id);
    await Promise.all([loadDeposits(), loadAnalytics()]);
  };

  const handleSelectMonth = (month: string) => {
    setSelectedMonth(month);
    setJournalPage(1);
  };

  const handleFilterChange = (nextFilters: {
    symbol?: string;
    market?: string;
    direction?: string;
    status?: string;
    tag?: string;
    sort_by?: string;
  }) => {
    setFilters(nextFilters);
    setJournalPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setJournalPageSize(size);
    setJournalPage(1);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      // ignore storage errors
    }
  };

  const handleGlobalSearch = (q: string) => {
    setSearchQuery(q);
    setJournalPage(1);
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
    await Promise.all([loadTrades(), loadJournalTrades(), loadAnalytics()]);
  };

  const handleDeleteTrade = async (id: number) => {
    try {
      await api.deleteTrade(id);
      await Promise.all([loadTrades(), loadJournalTrades(), loadAnalytics()]);
    } catch (err) {
      console.error('Failed to delete trade:', err);
    }
  };

  const handleDeleteAllTrades = async () => {
    await api.deleteAllTrades();
    setSelectedMonth(undefined);
    setJournalPage(1);
    await Promise.all([loadTrades(), loadJournalTrades(), loadAnalytics()]);
  };

  const handleOpenEdit = (trade: Trade, closeMode = false) => {
    setEditingTrade(trade);
    setCloseTradeMode(closeMode);
    setIsTradeModalOpen(true);
  };

  const handleOpenDetail = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsDetailModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingTrade(null);
    setCloseTradeMode(false);
    setIsTradeModalOpen(true);
  };

  const handleOpenImportPage = (mode: ImportMode = 'trades') => {
    setImportMode(mode);
    setCurrentTab('import');
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
        totalDeposits={analytics?.total_deposits}
        overallDepositGrowthPct={analytics?.overall_deposit_growth_pct}
        onOpenDeposits={() => setIsDepositModalOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Right Main Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-screen overflow-y-auto">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={handleGlobalSearch}
          onOpenNewTrade={handleOpenNew}
          onOpenDeposits={() => setIsDepositModalOpen(true)}
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
              onSelectMonth={handleSelectMonth}
              onOpenDeposits={() => setIsDepositModalOpen(true)}
              onSelectTrade={handleOpenDetail}
              onGoToTrades={() => setCurrentTab('trades')}
              onGoToInsights={() => setCurrentTab('insights')}
            />
          )}

          {currentTab === 'trades' && (
            <TradeList
              trades={journalTrades}
              total={journalTotal}
              page={journalPage}
              pageSize={journalPageSize}
              onPageChange={setJournalPage}
              onPageSizeChange={handlePageSizeChange}
              loading={journalLoading}
              filters={filters}
              selectedMonth={selectedMonth ?? ''}
              onSelectMonth={handleSelectMonth}
              availableMonths={analytics?.available_months ?? []}
              onSelectTrade={handleOpenDetail}
              onEditTrade={handleOpenEdit}
              onDeleteTrade={handleDeleteTrade}
              onNewTrade={handleOpenNew}
              onOpenImport={() => handleOpenImportPage('trades')}
              onExportCsv={() => exportTradesToCsv(trades)}
              onFilterChange={handleFilterChange}
            />
          )}

          {currentTab === 'insights' && (
            <InsightsBento
              key="insights-bento"
              analytics={analytics}
              loading={analyticsLoading}
              selectedMonth={selectedMonth ?? ''}
              onSelectMonth={handleSelectMonth}
              onOpenDeposits={() => setIsDepositModalOpen(true)}
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
              onSelectMonth={handleSelectMonth}
              onOpenDeposits={() => setIsDepositModalOpen(true)}
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

          {currentTab === 'import' && (
            <ImportView
              mode={importMode}
              onModeChange={setImportMode}
              onImportSuccess={async (importedMode) => {
                if (importedMode === 'trades') {
                  setSelectedMonth(undefined);
                  setJournalPage(1);
                  await Promise.all([loadTrades(), loadJournalTrades(), loadAnalytics()]);
                } else {
                  await Promise.all([loadDeposits(), loadAnalytics()]);
                }
              }}
              onGoToTrades={() => setCurrentTab('trades')}
              onGoToInsights={() => setCurrentTab('insights')}
              onOpenDeposits={() => setIsDepositModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Trade Edit / Create Modal */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => {
          setIsTradeModalOpen(false);
          setCloseTradeMode(false);
        }}
        onSave={handleSaveTrade}
        editTrade={editingTrade}
        initialCloseMode={closeTradeMode}
      />

      {/* Trade Detail Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={(tr, closeMode) => {
          setIsDetailModalOpen(false);
          handleOpenEdit(tr, closeMode);
        }}
        onDelete={handleDeleteTrade}
      />

      {/* Deposit Management Modal */}
      {isDepositModalOpen && (
        <DepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          deposits={deposits}
          totalDeposits={analytics?.total_deposits ?? 0}
          overallPnl={analytics?.overall_total_pnl ?? 0}
          currentBalance={analytics?.current_balance ?? 0}
          overallGrowthPct={analytics?.overall_deposit_growth_pct ?? null}
          onAddDeposit={handleAddDeposit}
          onDeleteDeposit={handleDeleteDeposit}
          onOpenImport={() => handleOpenImportPage('deposits')}
        />
      )}
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
