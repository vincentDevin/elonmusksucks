import React from 'react';

interface CompactPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems?: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

const CompactPagination: React.FC<CompactPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface px-4 py-3 rounded-lg border border-muted ${className}`}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="text-tertiary">Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 border border-muted rounded text-xs bg-background text-content focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="text-tertiary">per page</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="px-3 py-1 bg-muted text-content rounded hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
        >
          ← Prev
        </button>

        <div className="flex items-center gap-1 text-xs">
          <span className="font-medium text-content">{currentPage + 1}</span>
          <span className="text-tertiary">of</span>
          <span className="font-medium text-content">{totalPages}</span>
          <span className="text-tertiary ml-1">({(totalItems || 0).toLocaleString()} total)</span>
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
          disabled={!hasNextPage}
          className="px-3 py-1 bg-muted text-content rounded hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default CompactPagination;
