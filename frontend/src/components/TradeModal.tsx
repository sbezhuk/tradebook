import React, { useState, useEffect } from 'react';
import type { Trade, TradeFormData, MarketType, DirectionType, StatusType } from '../types';
import { api } from '../api/client';
import { 
  X, 
  Upload, 
  Star, 
  ShieldCheck, 
  ShieldAlert, 
  Calculator, 
  Clock, 
  Tag as TagIcon,
  Image as ImageIcon
} from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TradeFormData, id?: number) => Promise<void>;
  editTrade?: Trade | null;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTrade,
}) => {
  const isEditing = !!editTrade;

  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<MarketType>('CRYPTO');
  const [direction, setDirection] = useState<DirectionType>('LONG');
  const [status, setStatus] = useState<StatusType>('CLOSED');

  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState('');

  const [entryPrice, setEntryPrice] = useState<string>('');
  const [exitPrice, setExitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [fees, setFees] = useState<string>('0');

  const [tags, setTags] = useState('');
  const [setupNotes, setSetupNotes] = useState('');
  const [postTradeNotes, setPostTradeNotes] = useState('');
  const [disciplineRating, setDisciplineRating] = useState(5);
  const [followedRules, setFollowedRules] = useState(true);
  const [chartUrl, setChartUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editTrade) {
      setSymbol(editTrade.symbol);
      setMarket(editTrade.market);
      setDirection(editTrade.direction);
      setStatus(editTrade.status);
      setEntryDate(formatForInput(editTrade.entry_date));
      setExitDate(editTrade.exit_date ? formatForInput(editTrade.exit_date) : '');
      setEntryPrice(String(editTrade.entry_price));
      setExitPrice(editTrade.exit_price !== null && editTrade.exit_price !== undefined ? String(editTrade.exit_price) : '');
      setQuantity(String(editTrade.quantity));
      setStopLoss(editTrade.stop_loss ? String(editTrade.stop_loss) : '');
      setTakeProfit(editTrade.take_profit ? String(editTrade.take_profit) : '');
      setFees(String(editTrade.fees || 0));
      setTags(editTrade.tags || '');
      setSetupNotes(editTrade.setup_notes || '');
      setPostTradeNotes(editTrade.post_trade_notes || '');
      setDisciplineRating(editTrade.discipline_rating || 5);
      setFollowedRules(editTrade.followed_rules ?? true);
      setChartUrl(editTrade.chart_url || '');
    } else {
      // Default new trade values
      setSymbol('');
      setMarket('CRYPTO');
      setDirection('LONG');
      setStatus('CLOSED');
      const nowStr = formatForInput(new Date().toISOString());
      setEntryDate(nowStr);
      setExitDate(nowStr);
      setEntryPrice('');
      setExitPrice('');
      setQuantity('1');
      setStopLoss('');
      setTakeProfit('');
      setFees('0');
      setTags('');
      setSetupNotes('');
      setPostTradeNotes('');
      setDisciplineRating(5);
      setFollowedRules(true);
      setChartUrl('');
    }
    setError(null);
  }, [editTrade, isOpen]);

  const formatForInput = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  // Live PnL preview
  const numEntry = parseFloat(entryPrice) || 0;
  const numExit = parseFloat(exitPrice) || 0;
  const numQty = parseFloat(quantity) || 0;
  const numFees = parseFloat(fees) || 0;
  const numSL = parseFloat(stopLoss) || 0;

  let livePnl = 0;
  let liveRoi = 0;
  let liveRR: number | null = null;

  if (numEntry > 0 && numExit > 0 && numQty > 0 && status === 'CLOSED') {
    if (direction === 'LONG') {
      livePnl = (numExit - numEntry) * numQty - numFees;
      liveRoi = ((numExit - numEntry) / numEntry) * 100;
      if (numSL > 0 && numSL < numEntry) {
        const risk = (numEntry - numSL) * numQty;
        if (risk > 0) liveRR = Number((livePnl / risk).toFixed(2));
      }
    } else {
      livePnl = (numEntry - numExit) * numQty - numFees;
      liveRoi = ((numEntry - numExit) / numEntry) * 100;
      if (numSL > 0 && numSL > numEntry) {
        const risk = (numSL - numEntry) * numQty;
        if (risk > 0) liveRR = Number((livePnl / risk).toFixed(2));
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadImage(file);
      setChartUrl(res.url);
    } catch (err: any) {
      setError(err.message || 'Не вдалося завантажити зображення');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) {
      setError('Будь ласка, вкажіть символ');
      return;
    }
    if (!numEntry || numEntry <= 0) {
      setError('Вкажіть коректну ціну входу');
      return;
    }
    if (!numQty || numQty <= 0) {
      setError('Вкажіть коректний об’єм / кількість');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: TradeFormData = {
        symbol: symbol.trim().toUpperCase(),
        market,
        direction,
        status,
        entry_date: new Date(entryDate).toISOString(),
        exit_date: status === 'CLOSED' && exitDate ? new Date(exitDate).toISOString() : null,
        entry_price: numEntry,
        exit_price: status === 'CLOSED' && numExit > 0 ? numExit : null,
        quantity: numQty,
        stop_loss: numSL > 0 ? numSL : null,
        take_profit: parseFloat(takeProfit) > 0 ? parseFloat(takeProfit) : null,
        fees: numFees,
        tags: tags.trim(),
        setup_notes: setupNotes.trim() || null,
        post_trade_notes: postTradeNotes.trim() || null,
        discipline_rating: disciplineRating,
        followed_rules: followedRules,
        chart_url: chartUrl.trim() || null,
      };

      await onSave(payload, editTrade?.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Не вдалося зберегти угоду');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h2 className="text-lg font-bold text-white">
              {isEditing ? `Редагувати угоду #${editTrade.id} (${editTrade.symbol})` : 'Додати нову угоду'}
            </h2>
            <p className="text-xs text-slate-400">
              Введіть параметри входу, виходу, ризик-менеджменту та психологічні нотатки
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Live Calculation Preview Banner */}
        {numEntry > 0 && numExit > 0 && status === 'CLOSED' && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-400">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <span>Розрахунок:</span>
            </div>
            <div className="flex items-center space-x-4 font-mono font-semibold">
              <span className={livePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                PnL: {livePnl >= 0 ? '+' : ''}${livePnl.toFixed(2)}
              </span>
              <span className={liveRoi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                ROI: {liveRoi >= 0 ? '+' : ''}{liveRoi.toFixed(2)}%
              </span>
              {liveRR !== null && (
                <span className="text-indigo-300">
                  R:R: {liveRR > 0 ? `+${liveRR}R` : `${liveRR}R`}
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Market & Direction & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Market */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Ринок</label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as MarketType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="CRYPTO">Crypto (BTC, ETH...)</option>
                <option value="FOREX">Forex (EUR/USD...)</option>
                <option value="STOCKS">Stocks (NVDA, AAPL...)</option>
                <option value="FUTURES">Futures (NQ, ES...)</option>
                <option value="COMMODITIES">Commodities (Gold, Oil)</option>
                <option value="OTHER">Інше</option>
              </select>
            </div>

            {/* Direction */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Сторона</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDirection('LONG')}
                  className={`py-1.5 text-xs font-bold rounded transition-all ${
                    direction === 'LONG'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  LONG 🟢
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SHORT')}
                  className={`py-1.5 text-xs font-bold rounded transition-all ${
                    direction === 'SHORT'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SHORT 🔴
                </button>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Статус угоди</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="CLOSED">Закрита (Фіксований PnL)</option>
                <option value="OPEN">Відкрита (В процесі)</option>
                <option value="CANCELLED">Скасована</option>
              </select>
            </div>
          </div>

          {/* Symbol, Quantity, Fees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Символ / Пара *</label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="BTC/USDT або AAPL"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Об'єм / Розмір позиції *</label>
              <input
                type="number"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1.0"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Комісії ($)</label>
              <input
                type="number"
                step="any"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0.0"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Prices: Entry, Exit, SL, TP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Ціна входу *</label>
              <input
                type="number"
                step="any"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="65000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Ціна виходу {status === 'CLOSED' ? '*' : '(опціонально)'}
              </label>
              <input
                type="number"
                step="any"
                disabled={status === 'OPEN'}
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder={status === 'OPEN' ? 'Позиція відкрита' : '68000'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-rose-400 mb-1.5">Stop Loss</label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="64000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-rose-300 font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1.5">Take Profit</label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="70000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Час відкриття</span>
              </label>
              <input
                type="datetime-local"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Час закриття</span>
              </label>
              <input
                type="datetime-local"
                disabled={status === 'OPEN'}
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center space-x-1">
              <TagIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Теги / Сетапи (через кому)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Breakout, SupportBounce, LondonSession, FVG"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Notes: Setup & Retrospective */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Причини входу (Сетап)</label>
              <textarea
                rows={3}
                value={setupNotes}
                onChange={(e) => setSetupNotes(e.target.value)}
                placeholder="Рівень підтримки на 4H, перекупленість RSI, зняття ліквідності..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Ретроспектива та висновки</label>
              <textarea
                rows={3}
                value={postTradeNotes}
                onChange={(e) => setPostTradeNotes(e.target.value)}
                placeholder="Що пішло добре, які помилки було допущено, чи не було FOMO..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Discipline & Psychology Rating */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-white block">Оцінка дисципліни плану</span>
                <span className="text-[11px] text-slate-500">Наскільки ви слідували своїй торговій системі?</span>
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setDisciplineRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= disciplineRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={followedRules}
                  onChange={(e) => setFollowedRules(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                />
                <span className="text-xs text-slate-200">Я повністю дотримався правил ризик-менеджменту</span>
              </label>

              {followedRules ? (
                <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Правил дотримано</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-rose-400 text-[11px] font-medium">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Порушення правил</span>
                </span>
              )}
            </div>
          </div>

          {/* Screenshot / Chart URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center space-x-1">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Скріншот графіку або посилання (TradingView)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={chartUrl}
                onChange={(e) => setChartUrl(e.target.value)}
                placeholder="https://www.tradingview.com/x/... або завантажте файл"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <label className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Завантаження...' : 'Файл'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {chartUrl && (
              <div className="mt-2 text-[11px] text-cyan-400 truncate flex items-center space-x-1">
                <span>Графік прикріплено:</span>
                <span className="underline">{chartUrl}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              {saving ? 'Збереження...' : (isEditing ? 'Оновити угоду' : 'Зберегти угоду')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
