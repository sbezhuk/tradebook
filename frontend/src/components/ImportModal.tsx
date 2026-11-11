import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import type { HyperliquidImportResponse } from '../types';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => Promise<void>;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HyperliquidImportResponse | null>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Будь ласка, оберіть CSV файл (наприклад, trade_history.csv з Hyperliquid)');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.importHyperliquidCsv(file);
      setResult(res);
      await onImportSuccess();
    } catch (err: any) {
      setError(err.message || 'Помилка під час імпорту файлу');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07040e]/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-popover rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c49bff]/15 text-[#c49bff] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Імпорт з Hyperliquid</h2>
              <p className="text-[11px] text-purple-200/50">
                Автоматичне групування ордерів у завершені угоди
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-purple-200/50 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Instructions */}
          {!result && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-xs text-purple-200/70 space-y-1">
              <div className="font-semibold text-white">Як отримати файл у Hyperliquid:</div>
              <p className="text-[11px] text-purple-200/55 leading-relaxed">
                Перейдіть у <span className="text-[#c49bff] font-medium">Portfolio → Trade History → Export to CSV</span>.
                Система автоматично зведе часткові входи/виходи (Open/Close) у готові угоди з точним PnL та комісіями, а дублікати будуть пропущені.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Zone or Result */}
          {!result ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
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
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />

              {uploading ? (
                <div className="space-y-3">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c49bff]" />
                  <p className="text-xs text-purple-100 font-medium">
                    Аналіз ордерів та розрахунок PnL...
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#c49bff]/15 text-[#c49bff] flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Натисніть або перетягніть `trade_history.csv` сюди
                  </div>
                  <div className="text-[11px] text-purple-200/45">
                    Підтримується стандартний експорт CSV з Hyperliquid
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#c49bff]/10 border border-[#c49bff]/30 flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-[#c49bff] shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white">Імпорт успішно завершено!</div>
                  <div className="text-xs text-purple-200/70">
                    Ваші угоди та аналітика автоматично оновлені.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                  <div className="text-[11px] text-purple-200/50">Додано угод</div>
                  <div className="text-xl font-bold font-mono text-[#c49bff] mt-1">
                    {result.imported_count}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                  <div className="text-[11px] text-purple-200/50">Дублікати</div>
                  <div className="text-xl font-bold font-mono text-purple-200/80 mt-1">
                    {result.skipped_duplicates}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
                  <div className="text-[11px] text-purple-200/50">Сума PnL</div>
                  <div
                    className={`text-xl font-bold font-mono mt-1 ${
                      result.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {result.total_pnl >= 0 ? '+' : ''}${result.total_pnl.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleClose}
                  className="accent-pill px-6 py-2 rounded-full text-xs font-bold"
                >
                  Готово
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
