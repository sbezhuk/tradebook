import React, { useMemo, useState } from 'react';
import type { Deposit, DepositFormData, TradingAccount } from '../types';
import { GlassDateTimePicker } from './GlassDateTimePicker';
import { GlassSelect } from './GlassSelect';
import { toLocalInputValue, fromLocalInputToUtcIso, formatDisplayDateTime } from '../utils/date';
import {
  Wallet,
  Plus,
  Trash2,
  X,
  TrendingUp,
  Calendar,
  FileText,
  UploadCloud,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
} from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposits: Deposit[];
  totalDeposits: number;
  overallPnl: number;
  currentBalance: number;
  overallGrowthPct: number | null;
  accounts?: TradingAccount[];
  activeAccountId?: number | null;
  initialMode?: 'deposit' | 'withdraw';
  onAddDeposit: (data: DepositFormData) => Promise<void>;
  onDeleteDeposit: (id: number) => Promise<void>;
  onOpenImport?: () => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

const getLocalNowInput = () => toLocalInputValue(new Date());

const formatDisplayDate = (iso: string) => {
  return formatDisplayDateTime(iso);
};

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  deposits,
  totalDeposits,
  overallPnl,
  currentBalance,
  overallGrowthPct,
  accounts = [],
  activeAccountId = null,
  initialMode = 'deposit',
  onAddDeposit,
  onDeleteDeposit,
  onOpenImport,
}) => {
  const defaultTargetId =
    activeAccountId ?? accounts.find((a) => a.is_default)?.id ?? accounts[0]?.id ?? null;

  const [mode, setMode] = useState<'deposit' | 'withdraw'>(initialMode);
  const [targetAccountId, setTargetAccountId] = useState<number | null>(defaultTargetId);
  const [amount, setAmount] = useState('');
  const [depositDate, setDepositDate] = useState(getLocalNowInput);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'in' | 'out'>('all');
  const [error, setError] = useState<string | null>(null);

  const accountMap = useMemo(() => {
    const map = new Map<number, TradingAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const activeAccount = activeAccountId ? accountMap.get(activeAccountId) ?? null : null;
  const targetAccount = targetAccountId ? accountMap.get(targetAccountId) ?? null : null;
  const targetBalance = targetAccount ? targetAccount.current_balance : currentBalance;

  const totalDeposited = useMemo(
    () => deposits.filter((d) => d.amount > 0).reduce((sum, d) => sum + d.amount, 0),
    [deposits]
  );
  const totalWithdrawn = useMemo(
    () => Math.abs(deposits.filter((d) => d.amount < 0).reduce((sum, d) => sum + d.amount, 0)),
    [deposits]
  );

  const filteredDeposits = useMemo(() => {
    if (historyFilter === 'in') return deposits.filter((d) => d.amount >= 0);
    if (historyFilter === 'out') return deposits.filter((d) => d.amount < 0);
    return deposits;
  }, [deposits, historyFilter]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError(
        mode === 'withdraw'
          ? 'Введіть суму виведення більше 0'
          : 'Введіть суму депозиту більше 0'
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onAddDeposit({
        account_id: targetAccountId,
        amount: mode === 'withdraw' ? -numAmount : numAmount,
        deposit_date: fromLocalInputToUtcIso(depositDate),
        note: note.trim() || (mode === 'withdraw' ? 'Виведення коштів' : null),
        type: mode,
      });
      setAmount('');
      setNote('');
      setDepositDate(getLocalNowInput());
    } catch (err: any) {
      setError(
        err.message ||
          (mode === 'withdraw' ? 'Не вдалося вивести кошти' : 'Не вдалося додати депозит')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await onDeleteDeposit(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'Не вдалося видалити операцію');
    } finally {
      setDeletingId(null);
    }
  };

  const isGrowthPositive = (overallGrowthPct ?? 0) >= 0;
  const numAmountVal = parseFloat(amount);
  const isWithdrawExceeding =
    mode === 'withdraw' &&
    Number.isFinite(numAmountVal) &&
    numAmountVal > 0 &&
    targetBalance > 0 &&
    numAmountVal > targetBalance;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#07040e]/80 backdrop-blur-md overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl glass-popover rounded-3xl overflow-hidden my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.07] bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#c49bff]/15 border border-[#c49bff]/30 flex items-center justify-center text-[#c49bff] shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                Управління депозитом{activeAccount ? ` • ${activeAccount.name}` : ''}
              </h2>
              <p className="text-xs text-purple-200/55 truncate">
                Поповнення, вивід коштів із портфеля та контроль капіталу
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

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto overscroll-contain flex-1">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-card-subtle rounded-2xl px-4 py-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-purple-200/55">Чистий депозит</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5 tabular-nums">
                  ${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {totalWithdrawn > 0 && (
                  <div className="text-[10px] font-mono text-purple-200/50 mt-1 flex items-center gap-1.5">
                    <span className="text-[#c49bff]">+{totalDeposited.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    <span>•</span>
                    <span className="text-rose-400">-{totalWithdrawn.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-purple-200/60">
                {deposits.length} зап.
              </span>
            </div>

            <div className="glass-card-subtle rounded-2xl px-4 py-3.5">
              <div className="text-[11px] text-purple-200/55">Поточний баланс</div>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <div className="text-xl font-bold font-mono text-white tabular-nums">
                  ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className={`text-[11px] font-mono font-semibold tabular-nums ${
                    overallPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  PnL {overallPnl >= 0 ? '+' : '-'}${Math.abs(overallPnl).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="glass-card-subtle rounded-2xl px-4 py-3.5">
              <div className="text-[11px] text-purple-200/55 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#c49bff]" />
                <span>Загальний приріст</span>
              </div>
              <div
                className={`text-xl font-bold font-mono mt-0.5 tabular-nums ${
                  overallGrowthPct === null
                    ? 'text-purple-200/45'
                    : isGrowthPositive
                    ? 'text-[#c49bff]'
                    : 'text-rose-400'
                }`}
              >
                {overallGrowthPct === null
                  ? '—'
                  : `${isGrowthPositive ? '+' : ''}${overallGrowthPct.toFixed(2)}%`}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Split Body: Form Left + History Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Deposit / Withdraw Form */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-5 glass-card-subtle rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3.5">
                {/* Mode Selector Tabs */}
                <div className="p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('deposit');
                      setError(null);
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mode === 'deposit'
                        ? 'bg-[#c49bff]/20 text-[#f5edff] border border-[#c49bff]/40 shadow-sm'
                        : 'text-purple-200/60 hover:text-white'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-[#c49bff]" />
                    <span>Поповнення</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('withdraw');
                      setError(null);
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mode === 'withdraw'
                        ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 shadow-sm'
                        : 'text-purple-200/60 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>Виведення</span>
                  </button>
                </div>

                <div className="text-xs font-semibold text-white">
                  {mode === 'deposit' ? 'Внесення коштів' : 'Виведення депозиту із портфеля'}
                </div>

                {accounts.length > 1 && (
                  <div>
                    <label className="block text-[11px] font-medium text-purple-200/65 mb-1.5">
                      {mode === 'deposit' ? 'Торговий акаунт для поповнення' : 'Портфель / акаунт для виведення'}
                    </label>
                    <GlassSelect
                      variant="field"
                      value={targetAccountId ? String(targetAccountId) : ''}
                      onChange={(val) => setTargetAccountId(val ? Number(val) : null)}
                      options={accounts.map((acc) => ({
                        value: String(acc.id),
                        label: `${acc.name} (${acc.platform}) — баланс $${acc.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      }))}
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <label className="font-medium text-purple-200/65">
                      {mode === 'deposit' ? 'Сума поповнення ($) *' : 'Сума виведення ($) *'}
                    </label>
                    <span className="text-purple-200/50 font-mono text-[11px]">
                      Баланс: <span className="text-white font-semibold">${targetBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </span>
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={mode === 'deposit' ? 'Напр., 1000' : 'Напр., 500'}
                    className={`glass-input w-full rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-purple-200/35 ${
                      isWithdrawExceeding ? 'border-amber-400/50 focus:border-amber-400' : ''
                    }`}
                  />

                  {isWithdrawExceeding && (
                    <p className="text-[11px] text-amber-300 mt-1">
                      ⚠️ Сума виведення перевищує баланс вибраного портфелю (${targetBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </p>
                  )}

                  {/* Presets */}
                  <div className="mt-2">
                    {mode === 'deposit' ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {PRESET_AMOUNTS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmount(String(preset))}
                            className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-white/[0.04] hover:bg-[#c49bff]/15 border border-white/[0.08] hover:border-[#c49bff]/35 text-purple-200 hover:text-white transition-colors cursor-pointer"
                          >
                            +${preset}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Fixed amounts row: $100, $500, $1000 */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[100, 500, 1000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setAmount(String(preset))}
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-purple-200 hover:text-white transition-colors cursor-pointer"
                            >
                              ${preset}
                            </button>
                          ))}
                        </div>

                        {/* Balance percentage row: 25%, 50%, 75%, Весь баланс */}
                        {targetBalance > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAmount(String(Math.max(1, Math.floor(targetBalance * 0.25))))}
                              className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/40 text-purple-200 hover:text-white transition-colors cursor-pointer"
                            >
                              25%
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmount(String(Math.max(1, Math.floor(targetBalance * 0.5))))}
                              className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/40 text-purple-200 hover:text-white transition-colors cursor-pointer"
                            >
                              50%
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmount(String(Math.max(1, Math.floor(targetBalance * 0.75))))}
                              className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/40 text-purple-200 hover:text-white transition-colors cursor-pointer"
                            >
                              75%
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmount(String(targetBalance))}
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 hover:text-white transition-colors cursor-pointer"
                            >
                              Весь баланс
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="deposit-date-picker"
                    className="block text-[11px] font-medium text-purple-200/65 mb-1.5 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3 h-3 text-[#c49bff]" />
                    <span>{mode === 'deposit' ? 'Дата поповнення' : 'Дата виведення'}</span>
                  </label>
                  <GlassDateTimePicker
                    id="deposit-date-picker"
                    value={depositDate}
                    onChange={setDepositDate}
                    placeholder="Оберіть дату"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-purple-200/65 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-[#c49bff]" />
                    <span>Нотатка (необов&apos;язково)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={255}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      mode === 'deposit'
                        ? 'Напр., Поповнення з карти або OKX'
                        : 'Напр., Вивід на карту, біржу, витрати'
                    }
                    className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-purple-200/35"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`w-full py-2.5 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all ${
                  mode === 'withdraw'
                    ? 'bg-rose-500/25 hover:bg-rose-500/35 border border-rose-500/40 text-rose-100 shadow-lg shadow-rose-950/30'
                    : 'accent-pill'
                }`}
              >
                {mode === 'withdraw' ? (
                  <>
                    <ArrowUpRight className="w-4 h-4 text-rose-300" />
                    <span>{saving ? 'Збереження...' : 'Вивести кошти з портфеля'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{saving ? 'Збереження...' : 'Внести депозит'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Right: Clean Deposit & Withdrawal History Panel */}
            <div className="lg:col-span-7 glass-card-subtle rounded-2xl flex flex-col overflow-hidden min-h-[300px] lg:h-[380px]">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-white">Історія операцій</h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-purple-200/70">
                    {filteredDeposits.length}
                  </span>
                </div>

                {deposits.length > 0 && (
                  <div className="inline-flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[11px]">
                    {(
                      [
                        { id: 'all', label: 'Усі' },
                        { id: 'in', label: 'Внесення' },
                        { id: 'out', label: 'Виведення' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setHistoryFilter(f.id)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                          historyFilter === f.id
                            ? 'accent-pill'
                            : 'text-purple-200/60 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {filteredDeposits.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-purple-200/40 mb-2.5">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-medium text-purple-100/80">
                    {historyFilter === 'out'
                      ? 'Ще немає операцій виведення'
                      : historyFilter === 'in'
                      ? 'Ще немає операцій поповнення'
                      : 'Ще немає операцій депозиту'}
                  </div>
                  <p className="text-[11px] text-purple-200/45 mt-1 max-w-xs">
                    {mode === 'withdraw'
                      ? 'Оформіть перше виведення коштів ліворуч або імпортуйте історію.'
                      : 'Додайте перше поповнення ліворуч або імпортуйте CSV-історію.'}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-white/[0.05]">
                  {filteredDeposits.map((dep) => {
                    const isPositive = dep.amount >= 0;
                    const isConfirming = confirmDeleteId === dep.id;
                    return (
                      <div
                        key={dep.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.025] transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isPositive
                                ? 'bg-[#c49bff]/15 text-[#c49bff]'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-medium text-white truncate">
                              {dep.note || (isPositive ? 'Поповнення депозиту' : 'Виведення коштів')}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-purple-200/50 font-mono mt-0.5 flex-wrap">
                              <span>{formatDisplayDate(dep.deposit_date)}</span>
                              {!activeAccountId &&
                                accounts.length > 1 &&
                                dep.account_id &&
                                accountMap.get(dep.account_id) && (
                                  <span className="inline-flex items-center gap-1 font-sans text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-purple-100/80">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{
                                        backgroundColor:
                                          accountMap.get(dep.account_id)?.color || '#c49bff',
                                      }}
                                    />
                                    <span>{accountMap.get(dep.account_id)?.name}</span>
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={`font-mono text-xs sm:text-sm font-bold tabular-nums ${
                              isPositive ? 'text-[#c49bff]' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? '+' : '-'}$
                            {Math.abs(dep.amount).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>

                          {isConfirming ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={deletingId === dep.id}
                                onClick={() => handleDelete(dep.id)}
                                title="Підтвердити видалення"
                                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/35 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === dep.id}
                                onClick={() => setConfirmDeleteId(null)}
                                title="Скасувати"
                                className="p-1.5 rounded-lg bg-white/[0.06] text-purple-200/70 hover:text-white transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={deletingId === dep.id}
                              onClick={() => setConfirmDeleteId(dep.id)}
                              title="Видалити запис"
                              className="p-1.5 rounded-lg text-purple-200/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
