import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassSelect } from './GlassSelect';

interface PaginationBarProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
  ariaLabel?: string;
  onAfterPageSelect?: () => void;
  className?: string;
  compact?: boolean;
}

const getPageNumbers = (currentPage: number, totalPages: number): (number | 'ellipsis')[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    start = 2;
    end = Math.min(totalPages - 1, 4);
  } else if (currentPage >= totalPages - 2) {
    start = Math.max(2, totalPages - 3);
    end = totalPages - 1;
  }

  const pages: (number | 'ellipsis')[] = [1];
  if (start > 2) {
    pages.push('ellipsis');
  }
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  if (end < totalPages - 1) {
    pages.push('ellipsis');
  }
  pages.push(totalPages);
  return pages;
};

/** Reusable glass pagination bar with range summary, page size selector, and page navigation. */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  loading = false,
  ariaLabel = 'Пагінація',
  onAfterPageSelect,
  className = '',
  compact = false,
}) => {
  if (total <= 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, total);
  const pageNumbers = getPageNumbers(safePage, totalPages);

  const handleSelect = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === safePage) return;
    onPageChange(nextPage);
    onAfterPageSelect?.();
  };

  return (
    <div
      className={
        compact
          ? `px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2.5 ${className}`
          : `glass-panel rounded-2xl px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`
      }
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xs text-purple-900/70 dark:text-purple-200/60 whitespace-nowrap">
          Показано{' '}
          <span className="font-mono font-bold text-purple-950 dark:text-white">
            {startItem}–{endItem}
          </span>{' '}
          з{' '}
          <span className="font-mono font-bold text-purple-950 dark:text-white">{total}</span>
        </span>

        <div className="h-3.5 w-px bg-purple-500/20 dark:bg-white/[0.1] shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          {!compact && (
            <span className="text-xs text-purple-900/50 dark:text-purple-200/45 hidden sm:inline">
              На сторінці:
            </span>
          )}
          <GlassSelect
            value={String(pageSize)}
            onChange={(val) => onPageSizeChange(Number(val))}
            menuDirection="up"
            options={pageSizeOptions.map((size) => ({
              value: String(size),
              label: `${size} / стор.`,
            }))}
          />
        </div>
      </div>

      {totalPages > 1 && (
        <nav aria-label={ariaLabel} className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect(safePage - 1)}
            disabled={safePage <= 1 || loading}
            aria-label="Попередня сторінка"
            title="Попередня сторінка"
            className={`${
              compact ? 'h-7.5 w-7.5 rounded-lg' : 'h-8 w-8 rounded-xl'
            } bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 border border-purple-500/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] dark:border-white/[0.08] dark:text-purple-200/75 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {pageNumbers.map((item, idx) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className={`${
                  compact ? 'h-7.5 min-w-[20px]' : 'h-8 min-w-[24px]'
                } px-1 flex items-center justify-center text-xs text-purple-400 dark:text-purple-200/45 select-none`}
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => handleSelect(item)}
                disabled={loading}
                aria-current={item === safePage ? 'page' : undefined}
                className={`${
                  compact ? 'h-7.5 min-w-[28px] px-2 rounded-lg' : 'h-8 min-w-[32px] px-2.5 rounded-xl'
                } text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-60 ${
                  item === safePage
                    ? 'accent-pill shadow-sm'
                    : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 border border-purple-500/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] dark:border-white/[0.08] dark:text-purple-200/75 dark:hover:text-white'
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => handleSelect(safePage + 1)}
            disabled={safePage >= totalPages || loading}
            aria-label="Наступна сторінка"
            title="Наступна сторінка"
            className={`${
              compact ? 'h-7.5 w-7.5 rounded-lg' : 'h-8 w-8 rounded-xl'
            } bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 border border-purple-500/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] dark:border-white/[0.08] dark:text-purple-200/75 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      )}
    </div>
  );
};
