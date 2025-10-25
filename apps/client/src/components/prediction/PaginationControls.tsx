import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  loading: boolean;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  hasMore,
  loading,
  onPageChange,
  onNext,
  onPrev,
}: PaginationControlsProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7; // Show max 7 page buttons

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {/* Previous Button */}
      <button
        onClick={onPrev}
        disabled={currentPage === 1 || loading}
        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-surface text-content hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-tertiary select-none"
                aria-hidden="true"
              >
                ...
              </span>
            );
          }

          const page = pageNum as number;
          const isActive = page === currentPage;

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={loading}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary font-medium'
                  : 'border-border bg-surface text-content hover:bg-muted'
              } disabled:opacity-50 disabled:cursor-not-allowed min-w-[40px]`}
              aria-label={`Go to page ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={!hasMore || currentPage === totalPages || loading}
        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-surface text-content hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRightIcon className="w-4 h-4" />
      </button>

      {/* Page Info */}
      <div className="hidden md:flex items-center gap-2 ml-4 text-sm text-tertiary">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
}
