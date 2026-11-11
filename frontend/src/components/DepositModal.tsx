import React, { useEffect, useState } from 'react';
import type { Deposit, DepositFormData } from '../types';
import { GlassDateTimePicker } from './GlassDateTimePicker';
import { Wallet, Plus, Trash2, X, TrendingUp, Calendar, FileText } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposits: Deposit[];
  totalDeposits: number;
  overallPnl: number;
  currentBalance: number;
  overallGrowthPct: number | null;
  onAddDeposit: (data: DepositFormData) => Promise<void>;
  onDeleteDeposit: (id: number) => Promise<void>;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

const getLocalNowInput = () => {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
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

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  deposits,
  totalDeposits,
  overallPnl,
  currentBalance,
  overallGrowthPct,
  onAddDeposit,
  onDeleteDeposit,
}) => {
  const [amount, setAmount] = useState('');
  const [depositDate, setDepositDate] = useState(getLocalNowInput);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAmount('');
      setNote('');
      setDepositDate(getLocalNowInput());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError('Введіть суму депозиту більше 0');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onAddDeposit({
        amount: numAmount,
        deposit_date: depositDate ? new Date(depositDate).toISOString() : new Date().toISOString(),
        note: note.trim() || null,
      });
      setAmount('');
      setNote('');
      setDepositDate(getLocalNowInput());
    } catch (err: any) {
      setError(err.message || 'Не вдалося додати депозит');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await onDeleteDeposit(id);
    } catch (err: any) {
      setError(err.message || 'Не вдалося видалити депозит');
    } finally {
      setDeletingId(null);
    }
  };

  const isGrowthPositive = (overallGrowthPct ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07040e]/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl glass-popover rounded-3xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c49bff]/15 border border-[#c49bff]/30 flex items-center justify-center text-[#c49bff]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Управління депозитом</h2>
              <p className="text-[11px] text-purple-200/55 mt-0.5">
                Вносьте поповнення та відстежуйте % приросту капіталу за періодами
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-purple-200/50 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-card-subtle rounded-2xl p-3.5">
              <div className="text-[11px] text-purple-200/55">Загальний депозит</div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                ${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="glass-card-subtle rounded-2xl p-3.5">
              <div className="text-[11px] text-purple-200/55">Поточний баланс</div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-purple-200/45 mt-0.5">
                PnL: {overallPnl >= 0 ? '+' : '-'}${Math.abs(overallPnl).toFixed(2)}
              </div>
            </div>

            <div className="glass-card-subtle rounded-2xl p-3.5">
              <div className="text-[11px] text-purple-200/55 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#c49bff]" />
                <span>Загальний приріст</span>
              </div>
              <div
                className={`text-lg font-bold font-mono mt-1 ${
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

          {/* Add Deposit Form */}
          <form onSubmit={handleSubmit} className="glass-card-subtle rounded-2xl p-4 space-y-3.5">
            <div className="text-xs font-semibold text-white">Нове поповнення депозиту</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-purple-200/65 mb-1.5">
                  Сума депозиту ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Напр., 1000"
                  className="glass-input w-full rounded-xl px-3 py-2.5 text-xs font-mono text-white placeholder-purple-200/35"
                />
              </div>

              <div>
                <label
                  htmlFor="deposit-date-picker"
                  className="block text-[11px] font-medium text-purple-200/65 mb-1.5 flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3 h-3 text-[#c49bff]" />
                  <span>Дата поповнення (період)</span>
                </label>
                <GlassDateTimePicker
                  id="deposit-date-picker"
                  value={depositDate}
                  onChange={setDepositDate}
                  placeholder="Оберіть дату"
                />
              </div>
            </div>

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
                placeholder="Напр., Початковий баланс Hyperliquid"
                className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white placeholder-purple-200/35"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="accent-pill px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{saving ? 'Збереження...' : 'Внести депозит'}</span>
              </button>
            </div>
          </form>

          {/* Deposit History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-purple-200/75 uppercase tracking-wider">
                Історія депозитів ({deposits.length})
              </h3>
            </div>

            {deposits.length === 0 ? (
              <div className="glass-card-subtle rounded-2xl p-6 text-center text-xs text-purple-200/50">
                Поки що немає внесених депозитів. Додайте перший депозит вище, щоб бачити % росту капіталу.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {deposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="glass-card-subtle rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#c49bff]">
                          +${dep.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-purple-200/50">
                          {formatDisplayDate(dep.deposit_date)}
                        </span>
                      </div>
                      {dep.note && (
                        <div className="text-[11px] text-purple-200/70 truncate mt-0.5">
                          {dep.note}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === dep.id}
                      onClick={() => handleDelete(dep.id)}
                      title="Видалити депозит"
                      className="p-1.5 rounded-lg text-purple-200/45 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
