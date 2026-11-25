import React, { useState, useRef, useMemo } from 'react';
import { api } from '../api/client';
import type {
  HyperliquidImportResponse,
  HyperliquidDepositImportResponse,
  TradingAccount,
  TradePreviewItem,
  DepositPreviewItem,
} from '../types';
import { GlassSelect } from './GlassSelect';
import { ImportEditModal } from './ImportEditModal';
import { formatDisplayDateTime } from '../utils/date';
import { changeSymbolQuote } from '../utils/symbol';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowLeftRight,
  Wallet,
  ChevronRight,
  RotateCcw,
  Download,
  Search,
  Check,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Eye,
} from 'lucide-react';

export type ImportPlatform = 'hyperliquid' | 'okx';
export type ImportMode = 'trades' | 'deposits';
export type ImportStage = 'upload' | 'preview' | 'result';

interface ImportViewProps {
  mode: ImportMode;
  onModeChange: (mode: ImportMode) => void;
  accounts?: TradingAccount[];
  activeAccountId?: number | null;
  onImportSuccess: (mode: ImportMode) => Promise<void>;
  onGoToTrades: () => void;
  onGoToInsights: () => void;
  onOpenDeposits: () => void;
  onExportCsv?: () => void;
}

const HYPERLIQUID_MODE_CONFIG: Record<
  ImportMode,
  {
    tabLabel: string;
    title: string;
    subtitle: string;
    csvExample: string;
    menuPath: string;
    instructionsBody: string;
    readingText: string;
    committingText: string;
    successSubtitle: string;
    addedLabel: string;
    summaryLabel: string;
  }
> = {
  trades: {
    tabLabel: 'Угоди',
    title: 'Імпорт угод з Hyperliquid',
    subtitle: 'Попередній перегляд, коригування та вибіркове збереження угод',
    csvExample: 'trade_history.csv',
    menuPath: 'Portfolio → Trade History → Export to CSV',
    instructionsBody:
      'Система прочитає CSV, зведе часткові ордери у завершені угоди та надасть вам можливість переглянути, відредагувати та обрати записи перед збереженням.',
    readingText: 'Зчитування та аналіз ордерів з CSV...',
    committingText: 'Збереження обраних угод у базу...',
    successSubtitle: 'Ваші угоди та аналітика автоматично оновлені.',
    addedLabel: 'Додано угод',
    summaryLabel: 'Сума PnL',
  },
  deposits: {
    tabLabel: 'Депозити та виведення',
    title: 'Імпорт депозитів з Hyperliquid',
    subtitle: 'Попередній перегляд та вибіркове завантаження поповнень і переказів',
    csvExample: 'deposits_and_withdrawals.csv',
    menuPath: 'Portfolio → Deposits and Withdrawals → Export to CSV',
    instructionsBody:
      'Система розпізнає поповнення, перекази та зняття з точними датами й сумами, щоб ви могли переглянути та внести корективи перед імпортом.',
    readingText: 'Зчитування історії транзакцій з CSV...',
    committingText: 'Збереження транзакцій у базу...',
    successSubtitle: 'Ваш баланс та аналітика приросту депозиту автоматично оновлені.',
    addedLabel: 'Додано записів',
    summaryLabel: 'Сума депозиту',
  },
};

export const ImportView: React.FC<ImportViewProps> = ({
  mode,
  onModeChange,
  accounts = [],
  activeAccountId = null,
  onImportSuccess,
  onGoToTrades,
  onGoToInsights,
  onOpenDeposits,
  onExportCsv,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<ImportPlatform>('hyperliquid');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    () =>
      activeAccountId ??
      accounts.find((a) => a.platform === 'HYPERLIQUID')?.id ??
      accounts.find((a) => a.is_default)?.id ??
      accounts[0]?.id ??
      null
  );

  const [stage, setStage] = useState<ImportStage>('upload');
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importQuote, setImportQuote] = useState<'USDT' | 'USDC'>('USDT');

  const handleSwitchAllQuotes = (newQuote: 'USDT' | 'USDC') => {
    setImportQuote(newQuote);
    setPreviewTrades((prev) =>
      prev.map((t) => ({
        ...t,
        symbol: changeSymbolQuote(t.symbol, newQuote),
      }))
    );
  };

  // Preview data
  const [previewTrades, setPreviewTrades] = useState<TradePreviewItem[]>([]);
  const [previewDeposits, setPreviewDeposits] = useState<DepositPreviewItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & Search in Preview
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'new_only' | 'duplicates_only'>('all');

  // Edit Modal
  const [editingItem, setEditingItem] = useState<
    | { type: 'trade'; item: TradePreviewItem }
    | { type: 'deposit'; item: DepositPreviewItem }
    | null
  >(null);

  // Results
  const [tradeResult, setTradeResult] = useState<HyperliquidImportResponse | null>(null);
  const [depositResult, setDepositResult] = useState<HyperliquidDepositImportResponse | null>(null);

  const cfg = HYPERLIQUID_MODE_CONFIG[mode];
  const finalResult = mode === 'trades' ? tradeResult : depositResult;
  const summaryValue =
    mode === 'trades'
      ? tradeResult?.total_pnl ?? 0
      : depositResult?.total_amount ?? 0;

  const resolvedTargetId =
    selectedAccountId ??
    activeAccountId ??
    accounts.find((a) => a.is_default)?.id ??
    accounts[0]?.id ??
    null;

  const resetAll = () => {
    setStage('upload');
    setSourceFileName('');
    setError(null);
    setPreviewTrades([]);
    setPreviewDeposits([]);
    setSelectedIds(new Set());
    setSearchQuery('');
    setFilterType('all');
    setEditingItem(null);
    setTradeResult(null);
    setDepositResult(null);
  };

  const handleSelectPlatform = (platform: ImportPlatform) => {
    setSelectedPlatform(platform);
    resetAll();
  };

  const handleSwitchMode = (nextMode: ImportMode) => {
    if (nextMode !== mode) {
      resetAll();
      onModeChange(nextMode);
    }
  };

  // Step 1: Read file and generate preview
  const handleReadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError(`Будь ласка, оберіть CSV файл (наприклад, ${cfg.csvExample} з Hyperliquid)`);
      return;
    }

    setIsReading(true);
    setError(null);
    setSourceFileName(file.name);

    try {
      if (mode === 'trades') {
        const previewRes = await api.previewHyperliquidCsv(file, resolvedTargetId, importQuote);
        if (previewRes.items.length === 0) {
          throw new Error('У файлі не знайдено записів угод Hyperliquid');
        }
        setPreviewTrades(previewRes.items);
        // By default, select all non-duplicates; if all are duplicates, leave unselected
        const defaultSelected = new Set(
          previewRes.items.filter((it) => !it.is_duplicate).map((it) => it.temp_id)
        );
        setSelectedIds(defaultSelected);
      } else {
        const previewRes = await api.previewHyperliquidDepositsCsv(file, resolvedTargetId);
        if (previewRes.items.length === 0) {
          throw new Error('У файлі не знайдено записів депозитів Hyperliquid');
        }
        setPreviewDeposits(previewRes.items);
        const defaultSelected = new Set(
          previewRes.items.filter((it) => !it.is_duplicate).map((it) => it.temp_id)
        );
        setSelectedIds(defaultSelected);
      }
      setStage('preview');
    } catch (err: any) {
      setError(err.message || 'Помилка під час зчитування файлу');
      setStage('upload');
    } finally {
      setIsReading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (isReading || isCommitting) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleReadFile(file);
    }
  };

  // Selection handlers
  const handleSelectAll = (filteredItemIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredItemIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleDeselectAll = (filteredItemIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredItemIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleSelectOnlyNew = () => {
    if (mode === 'trades') {
      const newIds = previewTrades.filter((t) => !t.is_duplicate).map((t) => t.temp_id);
      setSelectedIds(new Set(newIds));
    } else {
      const newIds = previewDeposits.filter((d) => !d.is_duplicate).map((d) => d.temp_id);
      setSelectedIds(new Set(newIds));
    }
  };

  const handleToggleRow = (tempId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
      return next;
    });
  };

  const handleDeletePreviewItem = (tempId: string) => {
    if (mode === 'trades') {
      setPreviewTrades((prev) => prev.filter((t) => t.temp_id !== tempId));
    } else {
      setPreviewDeposits((prev) => prev.filter((d) => d.temp_id !== tempId));
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  };

  // Edit row
  const handleSaveEditedTrade = (updated: TradePreviewItem) => {
    setPreviewTrades((prev) =>
      prev.map((item) => (item.temp_id === updated.temp_id ? updated : item))
    );
  };

  const handleSaveEditedDeposit = (updated: DepositPreviewItem) => {
    setPreviewDeposits((prev) =>
      prev.map((item) => (item.temp_id === updated.temp_id ? updated : item))
    );
  };

  // Step 2: Final Commit
  const handleCommit = async () => {
    if (selectedIds.size === 0) {
      setError('Оберіть хоча б один запис для збереження');
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      if (mode === 'trades') {
        const toCommit = previewTrades.filter((t) => selectedIds.has(t.temp_id));
        const res = await api.commitTradesImport(toCommit, resolvedTargetId);
        setTradeResult(res);
      } else {
        const toCommit = previewDeposits
          .filter((d) => selectedIds.has(d.temp_id))
          .map((d) => ({
            amount: d.amount,
            deposit_date: d.deposit_date,
            note: d.note,
            type: d.type,
          }));
        const res = await api.commitDepositsImport(toCommit, resolvedTargetId);
        setDepositResult(res);
      }
      await onImportSuccess(mode);
      setStage('result');
    } catch (err: any) {
      setError(err.message || 'Помилка під час збереження обраних записів');
    } finally {
      setIsCommitting(false);
    }
  };

  // Filtered preview items
  const filteredTrades = useMemo(() => {
    let list = previewTrades;
    if (filterType === 'new_only') {
      list = list.filter((t) => !t.is_duplicate);
    } else if (filterType === 'duplicates_only') {
      list = list.filter((t) => t.is_duplicate);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          (t.tags && t.tags.toLowerCase().includes(q)) ||
          (t.setup_notes && t.setup_notes.toLowerCase().includes(q))
      );
    }
    return list;
  }, [previewTrades, filterType, searchQuery]);

  const filteredDeposits = useMemo(() => {
    let list = previewDeposits;
    if (filterType === 'new_only') {
      list = list.filter((d) => !d.is_duplicate);
    } else if (filterType === 'duplicates_only') {
      list = list.filter((d) => d.is_duplicate);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) => d.note && d.note.toLowerCase().includes(q));
    }
    return list;
  }, [previewDeposits, filterType, searchQuery]);

  // Selected summaries
  const selectedTradesSummary = useMemo(() => {
    const selected = previewTrades.filter((t) => selectedIds.has(t.temp_id));
    const totalPnl = selected.reduce((acc, t) => acc + (t.status === 'CLOSED' ? t.pnl : 0), 0);
    const totalFees = selected.reduce((acc, t) => acc + (t.fees || 0), 0);
    const openCount = selected.filter((t) => t.status === 'OPEN').length;
    const closedCount = selected.filter((t) => t.status === 'CLOSED').length;
    return { count: selected.length, totalPnl, totalFees, openCount, closedCount };
  }, [previewTrades, selectedIds]);

  const selectedDepositsSummary = useMemo(() => {
    const selected = previewDeposits.filter((d) => selectedIds.has(d.temp_id));
    const netAmount = selected.reduce((acc, d) => acc + d.amount, 0);
    const depositsCount = selected.filter((d) => d.amount > 0).length;
    const withdrawsCount = selected.filter((d) => d.amount < 0).length;
    return { count: selected.length, netAmount, depositsCount, withdrawsCount };
  }, [previewDeposits, selectedIds]);

  const totalDuplicatesCount =
    mode === 'trades'
      ? previewTrades.filter((t) => t.is_duplicate).length
      : previewDeposits.filter((d) => d.is_duplicate).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Імпорт та експорт даних</h1>
          <p className="text-sm text-purple-200/50 mt-1">
            Оберіть платформу, перегляньте дані перед додаванням, внесіть необхідні корективи та збережіть.
          </p>
        </div>

        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="h-9 self-start sm:self-auto inline-flex items-center space-x-2 px-4 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-100/85 hover:text-white text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#c49bff]" />
            <span>Експортувати угоди (CSV)</span>
          </button>
        )}
      </div>

      {/* Platform Selector (hidden during preview for cleaner view) */}
      {stage === 'upload' && (
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">1. Оберіть платформу</h2>
              <p className="text-xs text-purple-200/50 mt-0.5">
                Кожна платформа має власний формат експорту та правила зведення угод.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Hyperliquid (Active) */}
            <button
              type="button"
              onClick={() => handleSelectPlatform('hyperliquid')}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedPlatform === 'hyperliquid'
                  ? 'bg-[#c49bff]/12 border-[#c49bff]/55 shadow-[0_0_24px_-8px_rgba(196,155,255,0.45)]'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#c49bff]/15 border border-[#c49bff]/30 text-[#c49bff] font-bold text-xs flex items-center justify-center shrink-0">
                    HL
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Hyperliquid</div>
                    <div className="text-[11px] text-purple-200/55">DEX • Perps &amp; Ledger</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                  Доступно
                </span>
              </div>
              <p className="text-[11px] text-purple-200/60 leading-relaxed">
                Імпорт історії угод (<span className="font-mono text-purple-100/90">trade_history.csv</span>) та депозитів (<span className="font-mono text-purple-100/90">deposits_and_withdrawals.csv</span>) з попереднім переглядом.
              </p>
            </button>

            {/* OKX (Locked / Disabled) */}
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Імпорт з OKX наразі в розробці"
              className="text-left p-4 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] opacity-55 cursor-not-allowed select-none"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-400/10 border border-sky-400/20 text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                    OKX
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>OKX</span>
                      <Lock className="w-3.5 h-3.5 text-purple-200/50" />
                    </div>
                    <div className="text-[11px] text-purple-200/50">CEX • Spot &amp; Futures</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-purple-200/60 border border-white/[0.08] shrink-0">
                  Скоро
                </span>
              </div>
              <p className="text-[11px] text-purple-200/50 leading-relaxed">
                Імпорт угод та транзакцій з OKX ще готується і буде доступний у наступному оновленні.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Selected Platform Workspace */}
      {selectedPlatform === 'hyperliquid' && (
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Header + Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#c49bff]/15 text-[#c49bff] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{cfg.title}</h2>
                <p className="text-xs text-purple-200/50">{cfg.subtitle}</p>
              </div>
            </div>

            {stage !== 'preview' && (
              <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('trades')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'trades'
                      ? 'accent-pill'
                      : 'text-purple-200/65 hover:text-white'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>{HYPERLIQUID_MODE_CONFIG.trades.tabLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('deposits')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'deposits'
                      ? 'accent-pill'
                      : 'text-purple-200/65 hover:text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{HYPERLIQUID_MODE_CONFIG.deposits.tabLabel}</span>
                </button>
              </div>
            )}
          </div>

          {/* Account Selector in upload mode */}
          {stage === 'upload' && accounts.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.025] border border-white/[0.07]">
              <div>
                <div className="text-xs font-semibold text-white">Акаунт призначення</div>
                <div className="text-[11px] text-purple-200/55 mt-0.5">
                  Усі імпортовані записи будуть привʼязані до вибраного портфелю.
                </div>
              </div>
              <div className="w-full sm:w-64 shrink-0">
                <GlassSelect
                  variant="field"
                  value={
                    selectedAccountId
                      ? String(selectedAccountId)
                      : activeAccountId
                      ? String(activeAccountId)
                      : accounts[0]
                      ? String(accounts[0].id)
                      : ''
                  }
                  onChange={(val) => setSelectedAccountId(val ? Number(val) : null)}
                  options={accounts.map((acc) => ({
                    value: String(acc.id),
                    label: `${acc.name} (${acc.platform})`,
                  }))}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 1: UPLOAD                                         */}
          {/* ======================================================== */}
          {stage === 'upload' && (
            <>
              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-xs text-purple-200/70 space-y-1">
                <div className="font-semibold text-white">Як отримати файл у Hyperliquid:</div>
                <p className="text-xs text-purple-200/60 leading-relaxed">
                  Перейдіть у <span className="text-[#c49bff] font-medium">{cfg.menuPath}</span>.{' '}
                  {cfg.instructionsBody}
                </p>
              </div>

              {/* Quote Currency Selection for Trades */}
              {mode === 'trades' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.07]">
                  <div>
                    <div className="text-xs font-semibold text-white">Формат котирування пар (Quote Currency)</div>
                    <div className="text-[11px] text-purple-200/60 mt-0.5">
                      Символи ордерів будуть автоматично імпортовані як пари{' '}
                      <span className="font-mono text-purple-200/80 font-bold">n/{importQuote}</span> (наприклад,{' '}
                      <span className="font-mono text-white">BTC/{importQuote}</span> або{' '}
                      <span className="font-mono text-white">NVDA/{importQuote} (IO)</span>).
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setImportQuote('USDT')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        importQuote === 'USDT'
                          ? 'bg-[#c49bff]/25 text-[#c49bff] border border-[#c49bff]/40 shadow-sm'
                          : 'text-purple-200/60 hover:text-white'
                      }`}
                    >
                      /USDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportQuote('USDC')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        importQuote === 'USDC'
                          ? 'bg-[#c49bff]/25 text-[#c49bff] border border-[#c49bff]/40 shadow-sm'
                          : 'text-purple-200/60 hover:text-white'
                      }`}
                    >
                      /USDC
                    </button>
                  </div>
                </div>
              )}

              {mode === 'deposits' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.07]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-purple-200/70 shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Бажаєте внести депозит вручну?</div>
                      <div className="text-[11px] text-purple-200/60">
                        Ви можете додати одне поповнення або виведення вручну.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenDeposits}
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.09] text-white text-xs font-semibold transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto shrink-0"
                  >
                    Внести депозит вручну
                  </button>
                </div>
              )}

              {/* Upload Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isReading) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isReading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                  dragging
                    ? 'border-[#c49bff] bg-[#c49bff]/10'
                    : 'border-white/[0.12] hover:border-[#c49bff]/50 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReadFile(file);
                    e.target.value = '';
                  }}
                />

                {isReading ? (
                  <div className="space-y-3">
                    <div className="inline-block animate-spin rounded-full h-9 w-9 border-b-2 border-[#c49bff]" />
                    <p className="text-xs text-purple-100 font-medium">{cfg.readingText}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#c49bff]/15 text-[#c49bff] flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-white">
                      Натисніть або перетягніть <span className="font-mono text-[#c49bff]">{cfg.csvExample}</span> сюди
                    </div>
                    <div className="text-xs text-purple-200/45">
                      Файл буде зчитано і відкрито у режимі попереднього перегляду для вашої перевірки
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* STAGE 2: PREVIEW & CUSTOMIZE                            */}
          {/* ======================================================== */}
          {stage === 'preview' && (
            <div className="space-y-5 animate-fade-in">
              {/* Preview Banner & Quick Actions */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#c49bff]/15 text-[#c49bff] flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">Попередній перегляд даних</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-purple-200/80 border border-white/[0.08]">
                        {sourceFileName}
                      </span>
                    </div>
                    <p className="text-xs text-purple-200/60 mt-0.5">
                      Перегляньте записи, відредагуйте за потреби, позначте галочками потрібні та натисніть «Завершити імпорт».
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-purple-200/80 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Інший файл</span>
                  </button>

                  <button
                    type="button"
                    disabled={selectedIds.size === 0 || isCommitting}
                    onClick={handleCommit}
                    className={`accent-pill px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-lg transition-all ${
                      selectedIds.size === 0 || isCommitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isCommitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Збереження...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Завершити імпорт ({selectedIds.size})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Statistics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                  <div className="text-[11px] text-purple-200/50">Зчитано з файлу</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {mode === 'trades' ? previewTrades.length : previewDeposits.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                  <div className="text-[11px] text-purple-200/50">Обрано для додавання</div>
                  <div className="text-lg font-bold font-mono text-[#c49bff] mt-0.5">
                    {selectedIds.size}{' '}
                    <span className="text-xs text-purple-200/40 font-normal">
                      з {mode === 'trades' ? previewTrades.length : previewDeposits.length}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                  <div className="text-[11px] text-purple-200/50">
                    {mode === 'trades' ? 'Загальний PnL обраних' : 'Сума обраних операцій'}
                  </div>
                  <div
                    className={`text-lg font-bold font-mono mt-0.5 ${
                      mode === 'trades'
                        ? selectedTradesSummary.totalPnl >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                        : selectedDepositsSummary.netAmount >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {mode === 'trades'
                      ? `${selectedTradesSummary.totalPnl >= 0 ? '+' : '-'}$${Math.abs(
                          selectedTradesSummary.totalPnl
                        ).toFixed(2)}`
                      : `${selectedDepositsSummary.netAmount >= 0 ? '+' : '-'}$${Math.abs(
                          selectedDepositsSummary.netAmount
                        ).toFixed(2)}`}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                  <div className="text-[11px] text-purple-200/50">Дублікатів у базі</div>
                  <div
                    className={`text-lg font-bold font-mono mt-0.5 ${
                      totalDuplicatesCount > 0 ? 'text-amber-400' : 'text-purple-200/60'
                    }`}
                  >
                    {totalDuplicatesCount}
                  </div>
                </div>
              </div>

              {/* Table Toolbar: Search + Quick selection buttons + Filter tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-200/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={mode === 'trades' ? 'Пошук монети або тегу...' : 'Пошук за описом...'}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-purple-200/40 outline-none focus:border-[#c49bff]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-200/40 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter and Selection buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        filterType === 'all'
                          ? 'bg-[#c49bff]/20 text-[#c49bff]'
                          : 'text-purple-200/60 hover:text-white'
                      }`}
                    >
                      Всі ({mode === 'trades' ? previewTrades.length : previewDeposits.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('new_only')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        filterType === 'new_only'
                          ? 'bg-[#c49bff]/20 text-[#c49bff]'
                          : 'text-purple-200/60 hover:text-white'
                      }`}
                    >
                      Нові ({mode === 'trades' ? previewTrades.length - totalDuplicatesCount : previewDeposits.length - totalDuplicatesCount})
                    </button>
                    {totalDuplicatesCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterType('duplicates_only')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          filterType === 'duplicates_only'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'text-purple-200/60 hover:text-white'
                        }`}
                      >
                        Дублікати ({totalDuplicatesCount})
                      </button>
                    )}
                  </div>

                  <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />

                  {/* Bulk Select helpers */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectAll(
                          mode === 'trades'
                            ? filteredTrades.map((t) => t.temp_id)
                            : filteredDeposits.map((d) => d.temp_id)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] text-purple-200/80 hover:text-white transition-colors cursor-pointer"
                    >
                      Обрати всі
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectOnlyNew}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] text-purple-200/80 hover:text-white transition-colors cursor-pointer"
                    >
                      Лише нові
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeselectAll(
                          mode === 'trades'
                            ? filteredTrades.map((t) => t.temp_id)
                            : filteredDeposits.map((d) => d.temp_id)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] text-purple-200/80 hover:text-white transition-colors cursor-pointer"
                    >
                      Зняти всі
                    </button>
                  </div>

                  {mode === 'trades' && (
                    <>
                      <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />
                      <div className="inline-flex items-center p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                        <span className="text-[11px] text-purple-200/50 px-1.5 font-mono">Пара:</span>
                        <button
                          type="button"
                          onClick={() => handleSwitchAllQuotes('USDT')}
                          title="Перемкнути всі прев'ю-угоди на /USDT"
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                            importQuote === 'USDT'
                              ? 'bg-[#c49bff]/25 text-[#c49bff]'
                              : 'text-purple-200/60 hover:text-white'
                          }`}
                        >
                          /USDT
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchAllQuotes('USDC')}
                          title="Перемкнути всі прев'ю-угоди на /USDC"
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                            importQuote === 'USDC'
                              ? 'bg-[#c49bff]/25 text-[#c49bff]'
                              : 'text-purple-200/60 hover:text-white'
                          }`}
                        >
                          /USDC
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.015]">
                {mode === 'trades' ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.02] text-purple-200/60 font-semibold">
                        <th className="py-3 px-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredTrades.length > 0 &&
                              filteredTrades.every((t) => selectedIds.has(t.temp_id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleSelectAll(filteredTrades.map((t) => t.temp_id));
                              } else {
                                handleDeselectAll(filteredTrades.map((t) => t.temp_id));
                              }
                            }}
                            className="rounded border-white/20 text-[#c49bff] focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-3">Монета / Символ</th>
                        <th className="py-3 px-3">Напрямок</th>
                        <th className="py-3 px-3">Статус</th>
                        <th className="py-3 px-3">Дата входу</th>
                        <th className="py-3 px-3 text-right">Вхід ($)</th>
                        <th className="py-3 px-3 text-right">Вихід ($)</th>
                        <th className="py-3 px-3 text-right">Розмір</th>
                        <th className="py-3 px-3 text-right">Комісії ($)</th>
                        <th className="py-3 px-3 text-right">PnL ($)</th>
                        <th className="py-3 px-3">Теги</th>
                        <th className="py-3 px-3 text-center w-20">Дії</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredTrades.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-8 text-center text-purple-200/50">
                            Записів не знайдено за заданими фільтрами
                          </td>
                        </tr>
                      ) : (
                        filteredTrades.map((tr) => {
                          const isSelected = selectedIds.has(tr.temp_id);
                          return (
                            <tr
                              key={tr.temp_id}
                              className={`transition-colors ${
                                isSelected ? 'bg-white/[0.025]' : 'opacity-60 hover:opacity-100'
                              } hover:bg-white/[0.04]`}
                            >
                              <td className="py-3 px-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleRow(tr.temp_id)}
                                  className="rounded border-white/20 text-[#c49bff] focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-3 font-bold font-mono text-white">
                                <div className="flex items-center space-x-1.5">
                                  <span>{tr.symbol}</span>
                                  {tr.is_duplicate && (
                                    <span
                                      title={tr.duplicate_reason || 'Вже в базі'}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 font-sans font-normal shrink-0"
                                    >
                                      Дублікат
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                    tr.direction === 'LONG'
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                                  }`}
                                >
                                  {tr.direction === 'LONG' ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                  ) : (
                                    <ArrowDownLeft className="w-3 h-3" />
                                  )}
                                  <span>{tr.direction}</span>
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    tr.status === 'CLOSED'
                                      ? 'bg-white/[0.06] text-purple-200/80'
                                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                                  }`}
                                >
                                  {tr.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-purple-200/70 whitespace-nowrap">
                                {formatDisplayDateTime(tr.entry_date)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-white">
                                {tr.entry_price}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-white">
                                {tr.exit_price != null ? tr.exit_price : '—'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-purple-200/80">
                                {tr.quantity}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-purple-200/60">
                                {tr.fees > 0 ? `$${tr.fees.toFixed(2)}` : '$0.00'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                                {tr.status === 'CLOSED' ? (
                                  <span
                                    className={
                                      tr.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }
                                  >
                                    {tr.pnl >= 0 ? '+' : '-'}${Math.abs(tr.pnl).toFixed(2)}{' '}
                                    <span className="text-[10px] opacity-75">
                                      ({tr.pnl_percentage >= 0 ? '+' : ''}
                                      {tr.pnl_percentage.toFixed(1)}%)
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-purple-200/40">OPEN</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-purple-200/60 max-w-[120px] truncate">
                                {tr.tags || '—'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="inline-flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingItem({ type: 'trade', item: tr })}
                                    title="Редагувати параметри"
                                    className="p-1 rounded-lg hover:bg-white/[0.08] text-purple-200/70 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-[#c49bff]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePreviewItem(tr.temp_id)}
                                    title="Вилучити з перегляду"
                                    className="p-1 rounded-lg hover:bg-rose-500/15 text-purple-200/60 hover:text-rose-300 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.02] text-purple-200/60 font-semibold">
                        <th className="py-3 px-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredDeposits.length > 0 &&
                              filteredDeposits.every((d) => selectedIds.has(d.temp_id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleSelectAll(filteredDeposits.map((d) => d.temp_id));
                              } else {
                                handleDeselectAll(filteredDeposits.map((d) => d.temp_id));
                              }
                            }}
                            className="rounded border-white/20 text-[#c49bff] focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-3">Тип операції</th>
                        <th className="py-3 px-3">Дата та час</th>
                        <th className="py-3 px-3 text-right">Сума ($)</th>
                        <th className="py-3 px-3">Нотатка / Опис</th>
                        <th className="py-3 px-3">Статус</th>
                        <th className="py-3 px-3 text-center w-20">Дії</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredDeposits.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-purple-200/50">
                            Транзакцій не знайдено за заданими фільтрами
                          </td>
                        </tr>
                      ) : (
                        filteredDeposits.map((dep) => {
                          const isSelected = selectedIds.has(dep.temp_id);
                          const isWithdraw = dep.amount < 0 || dep.type === 'withdraw';
                          return (
                            <tr
                              key={dep.temp_id}
                              className={`transition-colors ${
                                isSelected ? 'bg-white/[0.025]' : 'opacity-60 hover:opacity-100'
                              } hover:bg-white/[0.04]`}
                            >
                              <td className="py-3 px-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleRow(dep.temp_id)}
                                  className="rounded border-white/20 text-[#c49bff] focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                    !isWithdraw
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                                  }`}
                                >
                                  {!isWithdraw ? (
                                    <ArrowDownLeft className="w-3 h-3" />
                                  ) : (
                                    <ArrowUpRight className="w-3 h-3" />
                                  )}
                                  <span>{!isWithdraw ? 'Поповнення' : 'Виведення'}</span>
                                </span>
                              </td>
                              <td className="py-3 px-3 text-purple-200/70 whitespace-nowrap">
                                {formatDisplayDateTime(dep.deposit_date)}
                              </td>
                              <td
                                className={`py-3 px-3 text-right font-mono font-bold text-sm ${
                                  !isWithdraw ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {!isWithdraw ? '+' : '-'}${Math.abs(dep.amount).toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-purple-200/80 max-w-xs truncate">
                                {dep.note || '—'}
                              </td>
                              <td className="py-3 px-3">
                                {dep.is_duplicate ? (
                                  <span
                                    title={dep.duplicate_reason || 'Вже є в базі'}
                                    className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25"
                                  >
                                    Дублікат
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                    Новий
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="inline-flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingItem({ type: 'deposit', item: dep })}
                                    title="Редагувати параметри"
                                    className="p-1 rounded-lg hover:bg-white/[0.08] text-purple-200/70 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-[#c49bff]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePreviewItem(dep.temp_id)}
                                    title="Вилучити з перегляду"
                                    className="p-1 rounded-lg hover:bg-rose-500/15 text-purple-200/60 hover:text-rose-300 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Bottom Commit Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-xs text-purple-200/70">
                  <span className="font-semibold text-white">
                    Обрано {selectedIds.size} з {mode === 'trades' ? previewTrades.length : previewDeposits.length} записів
                  </span>
                  {' • '}
                  <span>
                    {mode === 'trades' ? (
                      <>
                        PnL обраних:{' '}
                        <span
                          className={`font-mono font-bold ${
                            selectedTradesSummary.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {selectedTradesSummary.totalPnl >= 0 ? '+' : '-'}$
                          {Math.abs(selectedTradesSummary.totalPnl).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <>
                        Сума обраних:{' '}
                        <span
                          className={`font-mono font-bold ${
                            selectedDepositsSummary.netAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {selectedDepositsSummary.netAmount >= 0 ? '+' : '-'}$
                          {Math.abs(selectedDepositsSummary.netAmount).toFixed(2)}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-purple-200/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Скасувати
                  </button>
                  <button
                    type="button"
                    disabled={selectedIds.size === 0 || isCommitting}
                    onClick={handleCommit}
                    className={`accent-pill px-6 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-lg transition-all ${
                      selectedIds.size === 0 || isCommitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isCommitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Збереження...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Зберегти та завершити імпорт ({selectedIds.size})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 3: RESULT                                         */}
          {/* ======================================================== */}
          {stage === 'result' && finalResult && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#c49bff]/10 border border-[#c49bff]/30 flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-[#c49bff] shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white">Імпорт успішно завершено!</div>
                  <div className="text-xs text-purple-200/70">{cfg.successSubtitle}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                  <div className="text-xs text-purple-200/50">{cfg.addedLabel}</div>
                  <div className="text-2xl font-bold font-mono text-[#c49bff] mt-1">
                    {finalResult.imported_count}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                  <div className="text-xs text-purple-200/50">Пропущено дублікатів</div>
                  <div className="text-2xl font-bold font-mono text-purple-200/80 mt-1">
                    {finalResult.skipped_duplicates}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                  <div className="text-xs text-purple-200/50">{cfg.summaryLabel}</div>
                  <div
                    className={`text-2xl font-bold font-mono mt-1 ${
                      summaryValue >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {summaryValue >= 0 ? '+' : '-'}${Math.abs(summaryValue).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-purple-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Завантажити ще файл</span>
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  {mode === 'trades' ? (
                    <>
                      <button
                        type="button"
                        onClick={onGoToTrades}
                        className="px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Журнал угод</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={onGoToInsights}
                        className="accent-pill px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Відкрити аналітику</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenDeposits}
                      className="accent-pill px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Керувати депозитами</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <ImportEditModal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          itemType={editingItem.type}
          item={editingItem.item}
          onSaveTrade={handleSaveEditedTrade}
          onSaveDeposit={handleSaveEditedDeposit}
        />
      )}
    </div>
  );
};
