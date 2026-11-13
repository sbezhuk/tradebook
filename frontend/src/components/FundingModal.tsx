import React, { useMemo, useRef, useState } from 'react';
import type {
  FundingPayment,
  FundingFormData,
  FundingUpdateData,
  Trade,
  TradingAccount,
} from '../types';
import { GlassDateTimePicker } from './GlassDateTimePicker';
import { GlassSelect } from './GlassSelect';
import { PaginationBar } from './PaginationBar';
import {
  Percent,
  Plus,
  Trash2,
  X,
  Calendar,
  Coins,
  UploadCloud,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Link2,
  Unlink2,
  Search,
  Check,
  DollarSign,
  ArrowLeftRight,
  Layers,
  FileText,
  Wallet,
} from 'lucide-react';

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundingPayments: FundingPayment[];
  totalFunding: number;
  trades?: Trade[];
  accounts?: TradingAccount[];
  activeAccountId?: number | null;
  onAddFunding: (data: FundingFormData) => Promise<void>;
  onUpdateFunding?: (id: number, data: FundingUpdateData) => Promise<void>;
  onLinkTrade?: (fundingId: number, tradeId: number | null) => Promise<void>;
  onDeleteFunding: (id: number) => Promise<void>;
  onDeleteAllFunding?: (accountId?: number | null) => Promise<void>;
  onSelectTrade?: (trade: Trade) => void;
  onOpenImport?: () => void;
}

const COMMON_COINS = ['BTC', 'ETH', 'SOL'];

const getLocalNowInput = () => {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

const formatIsoToInput = (iso: string) => {
  try {
    const d = new Date(iso);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  } catch {
    return getLocalNowInput();
  }
};

const formatDisplayDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const FundingModal: React.FC<FundingModalProps> = ({
  isOpen,
  onClose,
  fundingPayments,
  totalFunding,
  trades = [],
  accounts = [],
  activeAccountId = null,
  onAddFunding,
  onUpdateFunding,
  onLinkTrade,
  onDeleteFunding,
  onDeleteAllFunding,
  onSelectTrade,
  onOpenImport,
}) => {
  const defaultTargetId =
    activeAccountId ?? accounts.find((a) => a.is_default)?.id ?? accounts[0]?.id ?? null;

  // Form State
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [targetAccountId, setTargetAccountId] = useState<number | null>(defaultTargetId);
  const [coin, setCoin] = useState('BTC');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [paymentType, setPaymentType] = useState<'received' | 'paid'>('received');
  const [amount, setAmount] = useState('');
  const [fundingTime, setFundingTime] = useState(getLocalNowInput);
  const [size, setSize] = useState('');
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // History State
  const [saving, setSaving] = useState(false);
  const [linkingPaymentId, setLinkingPaymentId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'received' | 'paid' | 'linked' | 'unlinked'>('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const listRef = useRef<HTMLDivElement>(null);

  // Quick Link Trade Modal State
  const [linkerTargetFunding, setLinkerTargetFunding] = useState<FundingPayment | null>(null);
  const [linkerSearch, setLinkerSearch] = useState('');

  const accountMap = useMemo(() => {
    const map = new Map<number, TradingAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const tradesMap = useMemo(() => {
    const map = new Map<number, Trade>();
    trades.forEach((t) => map.set(t.id, t));
    return map;
  }, [trades]);

  const activeAccount = activeAccountId ? accountMap.get(activeAccountId) ?? null : null;

  const { receivedSum, paidSum, receivedCount, paidCount, linkedCount } = useMemo(() => {
    let rec = 0;
    let paid = 0;
    let recC = 0;
    let paidC = 0;
    let linkedC = 0;
    fundingPayments.forEach((fp) => {
      if (fp.payment >= 0) {
        rec += fp.payment;
        recC += 1;
      } else {
        paid += Math.abs(fp.payment);
        paidC += 1;
      }
      if (fp.trade_id || fp.trade) {
        linkedC += 1;
      }
    });
    return {
      receivedSum: rec,
      paidSum: paid,
      receivedCount: recC,
      paidCount: paidC,
      linkedCount: linkedC,
    };
  }, [fundingPayments]);

  const filteredPayments = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return fundingPayments.filter((fp) => {
      if (historyFilter === 'received' && fp.payment < 0) return false;
      if (historyFilter === 'paid' && fp.payment >= 0) return false;
      if (historyFilter === 'linked' && !fp.trade_id && !fp.trade) return false;
      if (historyFilter === 'unlinked' && (fp.trade_id || fp.trade)) return false;

      if (q) {
        const matchCoin = fp.coin.toLowerCase().includes(q);
        const matchNote = (fp.note || '').toLowerCase().includes(q);
        const tradeSymbol = fp.trade?.symbol.toLowerCase() || '';
        const matchTrade = tradeSymbol.includes(q) || String(fp.trade_id || '').includes(q);
        if (!matchCoin && !matchNote && !matchTrade) return false;
      }
      return true;
    });
  }, [fundingPayments, historyFilter, filterQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  // Candidates for linking
  const candidateTradesForLinker = useMemo(() => {
    if (!linkerTargetFunding) return [];
    const targetCoin = linkerTargetFunding.coin.toUpperCase();
    const q = linkerSearch.trim().toLowerCase();

    return trades
      .filter((t) => {
        if (targetAccountId && t.account_id && t.account_id !== targetAccountId) return false;
        if (!q) return true;
        const sym = t.symbol.toLowerCase();
        const tid = String(t.id);
        const notes = (t.setup_notes || '').toLowerCase();
        return sym.includes(q) || tid.includes(q) || notes.includes(q);
      })
      .sort((a, b) => {
        // Boost trades matching the target coin
        const aMatch = a.symbol.toUpperCase().includes(targetCoin) ? 1 : 0;
        const bMatch = b.symbol.toUpperCase().includes(targetCoin) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
      });
  }, [linkerTargetFunding, trades, targetAccountId, linkerSearch]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingPaymentId(null);
    setTargetAccountId(defaultTargetId);
    setCoin('BTC');
    setDirection('LONG');
    setPaymentType('received');
    setAmount('');
    setFundingTime(getLocalNowInput());
    setSize('');
    setRate('');
    setNote('');
    setSelectedTradeId(null);
    setShowAdvanced(false);
    setError(null);
  };

  const startEdit = (fp: FundingPayment) => {
    setEditingPaymentId(fp.id);
    setTargetAccountId(fp.account_id ?? defaultTargetId);
    setCoin(fp.coin);
    setDirection(fp.direction === 'SHORT' ? 'SHORT' : 'LONG');
    setPaymentType(fp.payment >= 0 ? 'received' : 'paid');
    setAmount(String(Math.abs(fp.payment)));
    setFundingTime(formatIsoToInput(fp.funding_time));
    setSize(fp.size > 0 ? String(fp.size) : '');
    setRate(fp.rate ? String(fp.rate) : '');
    setNote(fp.note || '');
    setSelectedTradeId(fp.trade_id ?? fp.trade?.id ?? null);
    setShowAdvanced(Boolean(fp.size > 0 || fp.rate || fp.note || fp.trade_id));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCoin = coin.trim().toUpperCase();
    if (!cleanCoin) {
      setError('Вкажіть монету / тікер (наприклад BTC, ETH)');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError('Введіть суму фандінгу більше 0');
      return;
    }

    const signedPayment = paymentType === 'received' ? numAmount : -numAmount;
    const numSize = parseFloat(size) || 0;
    const numRate = parseFloat(rate) || 0;

    setSaving(true);
    setError(null);
    try {
      if (editingPaymentId !== null && onUpdateFunding) {
        await onUpdateFunding(editingPaymentId, {
          account_id: targetAccountId,
          coin: cleanCoin,
          direction,
          payment: signedPayment,
          size: numSize > 0 ? numSize : 0,
          rate: numRate,
          funding_time: fundingTime ? new Date(fundingTime).toISOString() : new Date().toISOString(),
          note: note.trim() || null,
          trade_id: selectedTradeId,
        });
      } else {
        await onAddFunding({
          account_id: targetAccountId,
          coin: cleanCoin,
          direction,
          payment: signedPayment,
          size: numSize > 0 ? numSize : 0,
          rate: numRate,
          funding_time: fundingTime ? new Date(fundingTime).toISOString() : new Date().toISOString(),
          note: note.trim() || null,
          trade_id: selectedTradeId,
        });
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Не вдалося зберегти запис фандінгу');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await onDeleteFunding(id);
      setConfirmDeleteId(null);
      if (editingPaymentId === id) {
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || 'Не вдалося видалити запис фандінгу');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!onDeleteAllFunding) return;
    setClearingAll(true);
    setError(null);
    try {
      await onDeleteAllFunding(activeAccountId ?? undefined);
      setConfirmClearAll(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Не вдалося очистити фандінг');
    } finally {
      setClearingAll(false);
    }
  };

  const handleDirectLinkTrade = async (fundingId: number, tradeId: number | null) => {
    if (!onLinkTrade) return;
    setLinkingPaymentId(fundingId);
    setError(null);
    try {
      await onLinkTrade(fundingId, tradeId);
      setLinkerTargetFunding(null);
      if (editingPaymentId === fundingId) {
        setSelectedTradeId(tradeId);
      }
    } catch (err: any) {
      setError(err.message || 'Не вдалося оновити посилання на угоду');
    } finally {
      setLinkingPaymentId(null);
    }
  };

  const isOverallPositive = totalFunding >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#07040e]/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl glass-popover rounded-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/[0.07] bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#c49bff]/15 border border-[#c49bff]/30 flex items-center justify-center text-[#c49bff] shrink-0">
              <Percent className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate flex items-center gap-2">
                <span>Управління фандінгом</span>
                {activeAccount && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-purple-200 font-normal">
                    {activeAccount.name}
                  </span>
                )}
              </h2>
              <p className="text-xs text-purple-200/55 truncate">
                Список усіх записів, ручне додавання, редагування, видалення та привʼязка до угод
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenImport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-full bg-[#c49bff]/15 hover:bg-[#c49bff]/25 border border-[#c49bff]/35 text-[#e2ccff] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#c49bff]" />
                <span>Імпорт CSV</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="p-2 text-purple-200/50 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card-subtle rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-purple-200/55 font-medium">Чистий фандінг</div>
                <div
                  className={`text-lg sm:text-xl font-bold font-mono mt-0.5 tabular-nums ${
                    isOverallPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isOverallPositive ? '+' : '-'}${Math.abs(totalFunding).toFixed(2)}
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-purple-200/60">
                {fundingPayments.length} зап.
              </span>
            </div>

            <div className="glass-card-subtle rounded-2xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-purple-200/55 font-medium flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                <span>Отримано (+)</span>
              </div>
              <div className="flex items-baseline justify-between gap-1 mt-0.5">
                <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  +${receivedSum.toFixed(2)}
                </div>
                <div className="text-[10px] font-mono text-purple-200/60">{receivedCount} виплат</div>
              </div>
            </div>

            <div className="glass-card-subtle rounded-2xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-purple-200/55 font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-rose-400" />
                <span>Списано (-)</span>
              </div>
              <div className="flex items-baseline justify-between gap-1 mt-0.5">
                <div className="text-lg sm:text-xl font-bold font-mono text-rose-400 tabular-nums">
                  -${paidSum.toFixed(2)}
                </div>
                <div className="text-[10px] font-mono text-purple-200/60">{paidCount} списань</div>
              </div>
            </div>

            <div className="glass-card-subtle rounded-2xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-purple-200/55 font-medium flex items-center gap-1">
                <Link2 className="w-3 h-3 text-[#c49bff]" />
                <span>Прив'язано до угод</span>
              </div>
              <div className="flex items-baseline justify-between gap-1 mt-0.5">
                <div className="text-lg sm:text-xl font-bold font-mono text-[#c49bff] tabular-nums">
                  {linkedCount}
                </div>
                <div className="text-[10px] font-mono text-purple-200/60">
                  {fundingPayments.length > 0 ? `${Math.round((linkedCount / fundingPayments.length) * 100)}%` : '0%'}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Grid Layout: Form Left (5 cols) & List Right (7 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Form Column */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-5 glass-card rounded-2xl p-4 sm:p-5 space-y-4 border border-white/[0.07]"
            >
              <div className="flex items-center justify-between pb-1 border-b border-purple-500/10 dark:border-white/[0.05]">
                <div className="text-xs uppercase font-bold tracking-wider text-purple-900 dark:text-purple-200/80 flex items-center gap-1.5">
                  {editingPaymentId ? (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                      <span>Редагувати запис #{editingPaymentId}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                      <span>Внести фандінг вручну</span>
                    </>
                  )}
                </div>

                {editingPaymentId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-[11px] font-medium text-purple-600 hover:text-purple-800 dark:text-[#c49bff] dark:hover:text-white hover:underline cursor-pointer transition-colors"
                  >
                    Скасувати редагування
                  </button>
                )}
              </div>

              {/* Account Selector if multiple */}
              {accounts.length > 1 && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-200/80 mb-1.5">
                    <Wallet className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                    <span>Торговий акаунт</span>
                  </label>
                  <GlassSelect
                    variant="field"
                    value={targetAccountId ? String(targetAccountId) : ''}
                    onChange={(val) => setTargetAccountId(val ? Number(val) : null)}
                    options={accounts.map((acc) => ({
                      value: String(acc.id),
                      label: `${acc.name}${acc.is_default ? ' (Основний)' : ''}`,
                    }))}
                  />
                </div>
              )}

              {/* Coin Input & Quick selection */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-purple-900 dark:text-purple-200/80 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                    <span>Монета / Тікер</span>
                  </span>
                  <span className="text-[11px] font-normal text-purple-700/60 dark:text-purple-200/40">
                    наприклад BTC, ETH, SOL
                  </span>
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-purple-500 dark:text-purple-300 absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <input
                    type="text"
                    value={coin}
                    onChange={(e) => setCoin(e.target.value.toUpperCase())}
                    placeholder="BTC"
                    className="glass-input relative z-0 w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-mono font-bold text-purple-950 dark:text-white placeholder-purple-400/40 dark:placeholder-purple-200/25 uppercase"
                  />
                </div>

                {/* Quick coin pills: 3 key coins without scroll */}
                <div className="grid grid-cols-3 gap-2 mt-2.5">
                  {COMMON_COINS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCoin(c)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                        coin === c
                          ? 'bg-purple-600 text-white shadow-sm dark:bg-[#c49bff]/25 dark:text-[#e2ccff] dark:border dark:border-[#c49bff]/40'
                          : 'bg-purple-500/10 hover:bg-purple-500/15 text-purple-800 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-purple-200/70 border border-purple-500/10 dark:border-transparent'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction & Payment Type */}
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-200/80 mb-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                    <span>Напрямок</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-purple-500/5 dark:bg-white/[0.04] border border-purple-500/15 dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setDirection('LONG')}
                      className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                        direction === 'LONG'
                          ? 'bg-purple-600 text-white shadow-sm dark:bg-[#c49bff]/25 dark:text-white dark:border dark:border-[#c49bff]/40'
                          : 'text-purple-800/70 dark:text-purple-200/60 hover:text-purple-950 dark:hover:text-white'
                      }`}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('SHORT')}
                      className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                        direction === 'SHORT'
                          ? 'bg-rose-500 text-white shadow-sm dark:bg-rose-500/25 dark:text-rose-300 dark:border dark:border-rose-500/40'
                          : 'text-purple-800/70 dark:text-purple-200/60 hover:text-purple-950 dark:hover:text-white'
                      }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>

                <div className="col-span-7">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-200/80 mb-1.5">
                    <Percent className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                    <span>Тип операції</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-purple-500/5 dark:bg-white/[0.04] border border-purple-500/15 dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setPaymentType('received')}
                      className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                        paymentType === 'received'
                          ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500/25 dark:text-emerald-300 dark:border dark:border-emerald-500/40'
                          : 'text-purple-800/70 dark:text-purple-200/60 hover:text-purple-950 dark:hover:text-white'
                      }`}
                    >
                      <span>+</span>
                      <span>Отримано</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('paid')}
                      className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                        paymentType === 'paid'
                          ? 'bg-rose-500 text-white shadow-sm dark:bg-rose-500/25 dark:text-rose-300 dark:border dark:border-rose-500/40'
                          : 'text-purple-800/70 dark:text-purple-200/60 hover:text-purple-950 dark:hover:text-white'
                      }`}
                    >
                      <span>-</span>
                      <span>Списано</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-purple-900 dark:text-purple-200/80 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                    <span>Сума виплати ($)</span>
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      paymentType === 'received'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {paymentType === 'received' ? '+ на баланс' : '- з балансу'}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 font-mono font-bold text-sm text-purple-500 dark:text-purple-300 pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className={`glass-input relative z-0 w-full pl-9 pr-3.5 py-2.5 rounded-xl text-base font-mono font-bold text-purple-950 dark:text-white placeholder-purple-400/40 dark:placeholder-purple-200/25 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      paymentType === 'received'
                        ? 'focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20'
                        : 'focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* Date & Time Picker */}
              <div>
                <label
                  htmlFor="funding-date-picker"
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-200/80 mb-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                  <span>Дата та час виплати</span>
                </label>
                <GlassDateTimePicker
                  id="funding-date-picker"
                  value={fundingTime}
                  onChange={setFundingTime}
                  placeholder="Оберіть дату"
                />
              </div>

              {/* Optional Manual Link to Trade in Form */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-purple-900 dark:text-purple-200/80 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                    <span>Посилання на угоду (ручне)</span>
                  </span>
                  {selectedTradeId && (
                    <button
                      type="button"
                      onClick={() => setSelectedTradeId(null)}
                      className="text-[11px] font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400/80 dark:hover:text-rose-300 cursor-pointer"
                    >
                      Відвʼязати
                    </button>
                  )}
                </label>

                {selectedTradeId ? (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 dark:bg-[#c49bff]/10 border border-purple-500/25 dark:border-[#c49bff]/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-purple-950 dark:text-white">#{selectedTradeId}</span>
                      <span className="text-purple-800 dark:text-purple-200 font-medium truncate">
                        {tradesMap.get(selectedTradeId)?.symbol || 'Угода'}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 dark:bg-white/[0.05] text-purple-700 dark:text-purple-300">
                        {tradesMap.get(selectedTradeId)?.direction || ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTradeId(null)}
                      className="p-1 text-purple-700/60 dark:text-purple-200/50 hover:text-purple-950 dark:hover:text-white rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <GlassSelect
                    variant="field"
                    value=""
                    onChange={(val) => setSelectedTradeId(val ? Number(val) : null)}
                    options={[
                      { value: '', label: '— Без привʼязки до угоди —' },
                      ...trades.slice(0, 50).map((t) => ({
                        value: String(t.id),
                        label: `#${t.id} ${t.symbol} (${t.direction}) • PnL: ${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)} • ${new Date(t.entry_date).toLocaleDateString('uk-UA')}`,
                      })),
                    ]}
                  />
                )}
              </div>

              {/* Collapsible Advanced Settings (Size, Rate, Note) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between py-1.5 px-1 text-xs font-semibold text-purple-800 hover:text-purple-950 dark:text-purple-200/70 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                    <span>Додаткові параметри (розмір, ставка, примітка)</span>
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-purple-600 dark:text-[#c49bff]" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="space-y-3 pt-2.5 pb-1 border-t border-purple-500/15 dark:border-white/[0.05] mt-1.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-purple-900 dark:text-purple-200/70 mb-1">
                          <Layers className="w-3 h-3 text-purple-600 dark:text-[#c49bff]" />
                          <span>Розмір позиції</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          placeholder="0.0"
                          className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono text-purple-950 dark:text-white placeholder-purple-400/40 dark:placeholder-purple-200/25 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-purple-900 dark:text-purple-200/70 mb-1">
                          <Percent className="w-3 h-3 text-purple-600 dark:text-[#c49bff]" />
                          <span>Ставка фандінгу</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                          placeholder="0.0001"
                          className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono text-purple-950 dark:text-white placeholder-purple-400/40 dark:placeholder-purple-200/25 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-purple-900 dark:text-purple-200/70 mb-1">
                        <FileText className="w-3 h-3 text-purple-600 dark:text-[#c49bff]" />
                        <span>Примітка (опціонально)</span>
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Наприклад: виплата за лонг BTC"
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs text-purple-950 dark:text-white placeholder-purple-400/40 dark:placeholder-purple-200/25"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-xl accent-pill text-xs font-semibold shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {editingPaymentId ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{saving ? 'Збереження...' : 'Зберегти зміни'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>{saving ? 'Збереження...' : 'Додати запис фандінгу'}</span>
                    </>
                  )}
                </button>

                {editingPaymentId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/15 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-purple-900 dark:text-purple-200/80 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Скасувати
                  </button>
                )}
              </div>
            </form>

            {/* History Table Column */}
            <div className="lg:col-span-7 glass-card rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col min-h-[460px]">
              {/* History Header & Filters */}
              <div className="p-4 border-b border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase font-semibold tracking-wider text-purple-200/70 flex items-center gap-1.5">
                    <span>Список записів фандінгу</span>
                    <span className="font-mono text-purple-300">({filteredPayments.length})</span>
                  </div>

                  {fundingPayments.length > 0 && onDeleteAllFunding && (
                    <div className="flex items-center">
                      {confirmClearAll ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={clearingAll}
                            onClick={handleClearAll}
                            className="px-2 py-0.5 rounded-md bg-rose-500/80 hover:bg-rose-500 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            {clearingAll ? 'Очищення...' : 'Підтвердити очищення'}
                          </button>
                          <button
                            type="button"
                            disabled={clearingAll}
                            onClick={() => setConfirmClearAll(false)}
                            className="px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-purple-200/70 text-[10px] transition-colors cursor-pointer"
                          >
                            Скасувати
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClearAll(true)}
                          className="text-[10px] text-rose-400/70 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          Очистити все
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryFilter('all');
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        historyFilter === 'all'
                          ? 'bg-[#c49bff]/20 text-[#e2ccff]'
                          : 'text-purple-200/50 hover:text-white'
                      }`}
                    >
                      Всі ({fundingPayments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryFilter('received');
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        historyFilter === 'received'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-purple-200/50 hover:text-white'
                      }`}
                    >
                      Отримано (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryFilter('paid');
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        historyFilter === 'paid'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'text-purple-200/50 hover:text-white'
                      }`}
                    >
                      Списано (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryFilter('linked');
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        historyFilter === 'linked'
                          ? 'bg-[#c49bff]/25 text-[#e2ccff]'
                          : 'text-purple-200/50 hover:text-white'
                      }`}
                    >
                      <Link2 className="w-3 h-3" />
                      <span>Прив'язані ({linkedCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryFilter('unlinked');
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        historyFilter === 'unlinked'
                          ? 'bg-white/[0.08] text-white'
                          : 'text-purple-200/50 hover:text-white'
                      }`}
                    >
                      Без прив'язки
                    </button>
                  </div>

                  {/* Search query input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-purple-500 dark:text-purple-300 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => {
                        setFilterQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Пошук (монета, угода)..."
                      className="glass-input relative z-0 pl-8 pr-2.5 py-1.5 rounded-xl text-xs font-mono text-purple-950 dark:text-white placeholder-purple-400/40 dark:placeholder-purple-200/30 w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Rows List */}
              {filteredPayments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-purple-200/40 mb-2.5">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-medium text-purple-100/80">
                    {fundingPayments.length === 0
                      ? 'Ще немає записів фандінгу'
                      : 'За вибраним фільтром записів не знайдено'}
                  </div>
                  <p className="text-[11px] text-purple-200/45 mt-1 max-w-xs">
                    Внесіть новий запис ліворуч або скористайтесь CSV-імпортом.
                  </p>
                </div>
              ) : (
                <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-white/[0.05] max-h-[520px]">
                  {paginatedPayments.map((fp) => {
                    const isPositive = fp.payment >= 0;
                    const isConfirming = confirmDeleteId === fp.id;
                    const isBeingEdited = editingPaymentId === fp.id;
                    const linkedTrade = fp.trade || (fp.trade_id ? tradesMap.get(fp.trade_id) : null);

                    return (
                      <div
                        key={fp.id}
                        className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group ${
                          isBeingEdited
                            ? 'bg-[#c49bff]/10 border-l-2 border-[#c49bff]'
                            : 'hover:bg-white/[0.025]'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                              isPositive
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold font-mono text-white">
                                {fp.coin}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                  fp.direction === 'LONG'
                                    ? 'bg-[#c49bff]/15 text-[#e2ccff]'
                                    : 'bg-rose-500/15 text-rose-300'
                                }`}
                              >
                                {fp.direction}
                              </span>

                              {/* Linked Trade Badge or Link Button */}
                              {linkedTrade ? (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#c49bff]/15 border border-[#c49bff]/30 text-[#e2ccff] text-[10px] font-mono group/trade">
                                  <Link2 className="w-2.5 h-2.5 text-[#c49bff]" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fullTr = tradesMap.get(linkedTrade.id);
                                      if (fullTr && onSelectTrade) {
                                        onSelectTrade(fullTr);
                                      }
                                    }}
                                    title="Переглянути деталі угоди"
                                    className="hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>#{linkedTrade.id} {linkedTrade.symbol}</span>
                                    {linkedTrade.pnl !== undefined && (
                                      <span className={linkedTrade.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                                        ({linkedTrade.pnl >= 0 ? '+' : ''}${Math.abs(linkedTrade.pnl).toFixed(1)})
                                      </span>
                                    )}
                                  </button>

                                  {onLinkTrade && (
                                    <button
                                      type="button"
                                      disabled={linkingPaymentId === fp.id}
                                      onClick={() => handleDirectLinkTrade(fp.id, null)}
                                      title="Відвʼязати від угоди"
                                      className="p-0.5 text-purple-200/50 hover:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer ml-0.5 transition-colors"
                                    >
                                      <Unlink2 className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                onLinkTrade && (
                                  <button
                                    type="button"
                                    onClick={() => setLinkerTargetFunding(fp)}
                                    title="Привʼязати цей запис фандінгу до угоди вручну"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/60 hover:text-white text-[10px] transition-colors cursor-pointer"
                                  >
                                    <Link2 className="w-2.5 h-2.5" />
                                    <span>+ Прив'язати угоду</span>
                                  </button>
                                )
                              )}

                              {fp.note && (
                                <span className="text-[11px] text-purple-200/60 truncate max-w-[140px]" title={fp.note}>
                                  • {fp.note}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-purple-200/50 font-mono mt-0.5 flex-wrap">
                              <span>{formatDisplayDate(fp.funding_time)}</span>
                              {fp.size > 0 && <span>• Розмір: {fp.size}</span>}
                              {Math.abs(fp.rate) > 0 && (
                                <span>• Ставка: {(fp.rate * 100).toFixed(4)}%</span>
                              )}
                              {!activeAccountId &&
                                accounts.length > 1 &&
                                fp.account_id &&
                                accountMap.get(fp.account_id) && (
                                  <span className="inline-flex items-center gap-1 font-sans text-[9px] px-1.5 py-0.2 rounded-full bg-white/[0.05] text-purple-100/80">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{
                                        backgroundColor:
                                          accountMap.get(fp.account_id)?.color || '#c49bff',
                                      }}
                                    />
                                    <span>{accountMap.get(fp.account_id)?.name}</span>
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/[0.04]">
                          <span
                            className={`font-mono text-xs sm:text-sm font-bold tabular-nums ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? '+' : '-'}${Math.abs(fp.payment).toFixed(4)}
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => startEdit(fp)}
                              aria-label="Редагувати запис"
                              title="Редагувати запис"
                              className="p-1.5 text-purple-200/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            {isConfirming ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={deletingId === fp.id}
                                  onClick={() => handleDelete(fp.id)}
                                  className="px-2 py-1 rounded-lg bg-rose-500/85 hover:bg-rose-500 text-white text-[10px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {deletingId === fp.id ? '...' : 'Видалити'}
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === fp.id}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-purple-100/70 text-[10px] transition-colors cursor-pointer"
                                >
                                  Скасувати
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(fp.id)}
                                aria-label="Видалити запис"
                                title="Видалити запис"
                                className="p-1.5 text-purple-200/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Bar */}
              {filteredPayments.length > 0 && (
                <PaginationBar
                  total={filteredPayments.length}
                  page={currentPage}
                  pageSize={pageSize}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onPageSizeChange={(newPageSize) => {
                    setPageSize(newPageSize);
                    setPage(1);
                    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  pageSizeOptions={[10, 20, 50, 100]}
                  ariaLabel="Пагінація списку фандінгу"
                  compact
                  className="rounded-t-none rounded-b-2xl border-x-0 border-b-0 border-t border-purple-500/15 dark:border-white/[0.07] bg-purple-500/[0.02] dark:bg-white/[0.015]"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightweight Trade Linker Modal (Popover) */}
      {linkerTargetFunding && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setLinkerTargetFunding(null)}
        >
          <div
            className="relative w-full max-w-lg glass-popover rounded-2xl p-5 space-y-4 border border-[#c49bff]/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#c49bff]" />
                <h3 className="text-sm font-bold text-white">Прив'язати фандінг до угоди</h3>
              </div>
              <button
                type="button"
                onClick={() => setLinkerTargetFunding(null)}
                className="p-1 text-purple-200/50 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white">
                  {linkerTargetFunding.coin} ({linkerTargetFunding.direction})
                </span>
                <span
                  className={`font-mono font-semibold ${
                    linkerTargetFunding.payment >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {linkerTargetFunding.payment >= 0 ? '+' : '-'}$
                  {Math.abs(linkerTargetFunding.payment).toFixed(4)}
                </span>
              </div>
              <div className="text-[11px] text-purple-200/50 font-mono">
                {formatDisplayDate(linkerTargetFunding.funding_time)}
                {linkerTargetFunding.note ? ` • ${linkerTargetFunding.note}` : ''}
              </div>
            </div>

            {/* Search trade input */}
            <div className="relative">
              <Search className="w-4 h-4 text-purple-500 dark:text-purple-300 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <input
                type="text"
                value={linkerSearch}
                onChange={(e) => setLinkerSearch(e.target.value)}
                placeholder="Пошук угоди за символом, ID або нотатками..."
                className="glass-input relative z-0 w-full pl-9 pr-3 py-2.5 rounded-xl text-xs text-purple-950 dark:text-white placeholder-purple-400/40 dark:placeholder-purple-200/30"
                autoFocus
              />
            </div>

            {/* Candidate Trades List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.05] rounded-xl border border-white/[0.06] bg-white/[0.02]">
              {candidateTradesForLinker.length === 0 ? (
                <div className="p-6 text-center text-xs text-purple-200/50">
                  Угод за цим пошуком не знайдено.
                </div>
              ) : (
                candidateTradesForLinker.map((tr) => {
                  const isCurrent = linkerTargetFunding.trade_id === tr.id;
                  const isCoinMatch = tr.symbol.toUpperCase().includes(linkerTargetFunding.coin.toUpperCase());
                  return (
                    <div
                      key={tr.id}
                      onClick={() => handleDirectLinkTrade(linkerTargetFunding.id, tr.id)}
                      className={`p-3 flex items-center justify-between gap-3 hover:bg-[#c49bff]/10 cursor-pointer transition-colors ${
                        isCurrent ? 'bg-[#c49bff]/15' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-white text-xs">#{tr.id}</span>
                          <span className="font-bold text-xs text-purple-100">{tr.symbol}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              tr.direction === 'LONG'
                                ? 'bg-[#c49bff]/20 text-[#e2ccff]'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {tr.direction}
                          </span>
                          {isCoinMatch && (
                            <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                              Збіг
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-purple-200/50 font-mono mt-0.5">
                          {new Date(tr.entry_date).toLocaleDateString('uk-UA')} • {tr.status}
                          {tr.exit_price ? ` • Вхід: ${tr.entry_price} → Вихід: ${tr.exit_price}` : ''}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono text-xs font-bold ${
                            tr.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
                        </div>
                        {isCurrent && (
                          <div className="text-[10px] text-[#c49bff] font-semibold flex items-center gap-0.5 justify-end">
                            <Check className="w-3 h-3" />
                            <span>Прив'язано</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {linkerTargetFunding.trade_id && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleDirectLinkTrade(linkerTargetFunding.id, null)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Unlink2 className="w-3.5 h-3.5" />
                  <span>Відвʼязати поточну угоду</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
