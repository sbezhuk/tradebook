import React, { useState } from 'react';
import type { TradePreviewItem, DepositPreviewItem, DirectionType, StatusType, MarketType } from '../types';
import { GlassDateTimePicker } from './GlassDateTimePicker';
import { toLocalInputValue, fromLocalInputToUtcIso } from '../utils/date';
import { X, Check, Calculator, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';

interface ImportEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'trade' | 'deposit';
  item: TradePreviewItem | DepositPreviewItem | null;
  onSaveTrade?: (updated: TradePreviewItem) => void;
  onSaveDeposit?: (updated: DepositPreviewItem) => void;
}

export const ImportEditModal: React.FC<ImportEditModalProps> = ({
  isOpen,
  onClose,
  itemType,
  item,
  onSaveTrade,
  onSaveDeposit,
}) => {
  if (!isOpen || !item) return null;

  return itemType === 'trade' ? (
    <TradeEditContent
      item={item as TradePreviewItem}
      onClose={onClose}
      onSave={(updated) => {
        onSaveTrade?.(updated);
        onClose();
      }}
    />
  ) : (
    <DepositEditContent
      item={item as DepositPreviewItem}
      onClose={onClose}
      onSave={(updated) => {
        onSaveDeposit?.(updated);
        onClose();
      }}
    />
  );
};

const TradeEditContent: React.FC<{
  item: TradePreviewItem;
  onClose: () => void;
  onSave: (updated: TradePreviewItem) => void;
}> = ({ item, onClose, onSave }) => {
  const [symbol, setSymbol] = useState(item.symbol);
  const [direction, setDirection] = useState<DirectionType>(item.direction);
  const [status, setStatus] = useState<StatusType>(item.status);
  const [market, setMarket] = useState<MarketType>(item.market || 'CRYPTO');
  const [entryDate, setEntryDate] = useState(() => toLocalInputValue(item.entry_date));
  const [exitDate, setExitDate] = useState(() => toLocalInputValue(item.exit_date));
  const [entryPrice, setEntryPrice] = useState(String(item.entry_price));
  const [exitPrice, setExitPrice] = useState(item.exit_price != null ? String(item.exit_price) : '');
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [fees, setFees] = useState(String(item.fees));
  const [pnl, setPnl] = useState(String(item.pnl));
  const [tags, setTags] = useState(item.tags || '');
  const [setupNotes, setSetupNotes] = useState(item.setup_notes || '');
  const [error, setError] = useState<string | null>(null);

  const calculateAutoPnl = () => {
    const ep = parseFloat(entryPrice);
    const xp = parseFloat(exitPrice);
    const qty = parseFloat(quantity);
    const f = parseFloat(fees) || 0;

    if (isNaN(ep) || isNaN(xp) || isNaN(qty) || ep <= 0 || qty <= 0) {
      setError('Для розрахунку PnL вкажіть коректні ціну входу, ціну виходу та кількість');
      return;
    }

    let calculatedPnl = 0;
    if (direction === 'LONG') {
      calculatedPnl = (xp - ep) * qty - f;
    } else {
      calculatedPnl = (ep - xp) * qty - f;
    }
    setPnl(calculatedPnl.toFixed(4).replace(/\.?0+$/, ''));
    setError(null);
  };

  const handleSave = () => {
    const ep = parseFloat(entryPrice);
    const xp = exitPrice ? parseFloat(exitPrice) : null;
    const qty = parseFloat(quantity);
    const f = parseFloat(fees) || 0;
    const p = parseFloat(pnl) || 0;

    if (!symbol.trim()) {
      setError('Вкажіть символ монети/інструменту');
      return;
    }
    if (isNaN(ep) || ep <= 0) {
      setError('Ціна входу повинна бути більше 0');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError('Кількість повинна бути більше 0');
      return;
    }
    if (status === 'CLOSED' && (xp == null || isNaN(xp))) {
      setError('Для закритої угоди вкажіть ціну виходу');
      return;
    }

    let pnlPct = 0;
    if (ep > 0 && xp != null && status === 'CLOSED') {
      pnlPct = direction === 'LONG' ? ((xp - ep) / ep) * 100 : ((ep - xp) / ep) * 100;
    }

    const updated: TradePreviewItem = {
      ...item,
      symbol: symbol.trim().toUpperCase(),
      market,
      direction,
      status,
      entry_date: fromLocalInputToUtcIso(entryDate),
      exit_date: status === 'CLOSED' && exitDate ? fromLocalInputToUtcIso(exitDate) : null,
      entry_price: ep,
      exit_price: status === 'CLOSED' ? xp : null,
      quantity: qty,
      fees: f,
      pnl: status === 'CLOSED' ? p : 0,
      pnl_percentage: status === 'CLOSED' ? parseFloat(pnlPct.toFixed(2)) : 0,
      tags: tags.trim(),
      setup_notes: setupNotes.trim() || null,
    };

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-white/[0.12] p-5 sm:p-6 space-y-4 my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c49bff]/15 text-[#c49bff] font-bold text-xs flex items-center justify-center">
              ред
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Редагування угоди</h3>
              <p className="text-[11px] text-purple-200/50">Внесіть корективи перед збереженням в базу</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-purple-200/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4 text-xs">
          {/* Symbol & Market */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Символ / Монета</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="напр. BTC, ETH"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono focus:border-[#c49bff] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Ринок</label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as MarketType)}
                className="w-full px-3 py-2 rounded-xl bg-[#1c1926] border border-white/[0.1] text-white outline-none focus:border-[#c49bff]"
              >
                <option value="CRYPTO">CRYPTO</option>
                <option value="FOREX">FOREX</option>
                <option value="FUTURES">FUTURES</option>
                <option value="STOCKS">STOCKS</option>
                <option value="COMMODITIES">COMMODITIES</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          {/* Direction & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Напрямок</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('LONG')}
                  className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    direction === 'LONG'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-white/[0.03] border-white/[0.08] text-purple-200/60 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>LONG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SHORT')}
                  className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    direction === 'SHORT'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-white/[0.03] border-white/[0.08] text-purple-200/60 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>SHORT</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Статус</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('CLOSED')}
                  className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                    status === 'CLOSED'
                      ? 'bg-[#c49bff]/20 border-[#c49bff] text-[#c49bff]'
                      : 'bg-white/[0.03] border-white/[0.08] text-purple-200/60 hover:text-white'
                  }`}
                >
                  CLOSED
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('OPEN')}
                  className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                    status === 'OPEN'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-white/[0.03] border-white/[0.08] text-purple-200/60 hover:text-white'
                  }`}
                >
                  OPEN
                </button>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Час входу</label>
              <GlassDateTimePicker value={entryDate} onChange={setEntryDate} />
            </div>
            {status === 'CLOSED' && (
              <div>
                <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Час виходу</label>
                <GlassDateTimePicker value={exitDate} onChange={setExitDate} allowClear />
              </div>
            )}
          </div>

          {/* Prices & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Ціна входу ($)</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono focus:border-[#c49bff] outline-none"
              />
            </div>
            {status === 'CLOSED' ? (
              <div>
                <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Ціна виходу ($)</label>
                <input
                  type="number"
                  step="any"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono focus:border-[#c49bff] outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Ціна виходу ($)</label>
                <input
                  type="text"
                  disabled
                  value="Позиція відкрита"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-purple-200/40 font-mono text-[11px]"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Кількість (розмір)</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono focus:border-[#c49bff] outline-none"
              />
            </div>
          </div>

          {/* Fees & PnL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Комісії ($)</label>
              <input
                type="number"
                step="any"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono focus:border-[#c49bff] outline-none"
              />
            </div>
            {status === 'CLOSED' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-purple-200/70">Чистий PnL ($)</label>
                  <button
                    type="button"
                    onClick={calculateAutoPnl}
                    className="text-[10px] text-[#c49bff] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3" />
                    <span>Порахувати за цінами</span>
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={pnl}
                  onChange={(e) => setPnl(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] font-mono focus:border-[#c49bff] outline-none ${
                    parseFloat(pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Tags & Setup Notes */}
          <div>
            <label className="block text-[11px] font-medium text-purple-200/70 mb-1">
              Теги <span className="text-purple-200/40">(через кому)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Breakout, Support, Scalp"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white focus:border-[#c49bff] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Нотатки до угоди</label>
            <textarea
              rows={2}
              value={setupNotes}
              onChange={(e) => setSetupNotes(e.target.value)}
              placeholder="Коментар, контекст входу..."
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white focus:border-[#c49bff] outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-purple-200/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="accent-pill px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-lg"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Застосувати зміни</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DepositEditContent: React.FC<{
  item: DepositPreviewItem;
  onClose: () => void;
  onSave: (updated: DepositPreviewItem) => void;
}> = ({ item, onClose, onSave }) => {
  const [type, setType] = useState<'deposit' | 'withdraw'>(item.type);
  const [amount, setAmount] = useState(String(Math.abs(item.amount)));
  const [date, setDate] = useState(() => toLocalInputValue(item.deposit_date));
  const [note, setNote] = useState(item.note || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const rawAmt = parseFloat(amount);
    if (isNaN(rawAmt) || rawAmt <= 0) {
      setError('Сума повинна бути додатнім числом');
      return;
    }

    const finalAmount = type === 'withdraw' ? -Math.abs(rawAmt) : Math.abs(rawAmt);
    const updated: DepositPreviewItem = {
      ...item,
      type,
      amount: finalAmount,
      deposit_date: fromLocalInputToUtcIso(date),
      note: note.trim() || null,
    };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-white/[0.12] p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c49bff]/15 text-[#c49bff] font-bold text-xs flex items-center justify-center">
              ред
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Редагування транзакції</h3>
              <p className="text-[11px] text-purple-200/50">Внесіть корективи перед збереженням</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-purple-200/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Тип операції</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('deposit')}
                className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  type === 'deposit'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-white/[0.03] border-white/[0.08] text-purple-200/60 hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Поповнення</span>
              </button>
              <button
                type="button"
                onClick={() => setType('withdraw')}
                className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  type === 'withdraw'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-white/[0.03] border-white/[0.08] text-purple-200/60 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Виведення</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Сума ($)</label>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono focus:border-[#c49bff] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Дата та час</label>
            <GlassDateTimePicker value={date} onChange={setDate} />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-purple-200/70 mb-1">Нотатка / Опис</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hyperliquid: deposit..."
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white focus:border-[#c49bff] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-purple-200/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="accent-pill px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-lg"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Застосувати зміни</span>
          </button>
        </div>
      </div>
    </div>
  );
};
