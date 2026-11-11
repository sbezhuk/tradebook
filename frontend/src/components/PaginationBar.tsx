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
    <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-purple-200/60">
          Показано{' '}
          <span className="font-mono font-semibold text-white">
            {startItem}–{endItem}
          </span>{' '}
          з{' '}
          <span className="font-mono font-semibold text-white">{total}</span>
        </span>

        <div className="h-3.5 w-px bg-white/[0.1] hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-200/45 hidden sm:inline">На сторінці:</span>
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
        <nav aria-label={ariaLabel} className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSelect(safePage - 1)}
            disabled={safePage <= 1 || loading}
            aria-label="Попередня сторінка"
            title="Попередня сторінка"
            className="h-8 w-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pageNumbers.map((item, idx) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="h-8 min-w-[24px] px-1 flex items-center justify-center text-xs text-purple-200/45 select-none"
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
                className={`h-8 min-w-[32px] px-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                  item === safePage
                    ? 'accent-pill'
                    : 'bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/75 hover:text-white'
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
            className="h-8 w-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-purple-200/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
};
