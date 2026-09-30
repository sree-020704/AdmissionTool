import { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminListTableSkeleton } from '@/components/skeletons';
import { Select } from '@/components/ui/select';

export function AdminListBuilder({
  title,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  actions = null,
  columns,
  rows,
  getRowKey,
  loading,
  emptyTitle,
  emptyDescription,
  pagination,
  sort,
  onSortChange,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50],
}) {
  const [openFilterKey, setOpenFilterKey] = useState(null);

  return (
    <section className="overflow-hidden rounded-2xl border border-input-border bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
      <div className="border-b border-divider px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-heading">{title}</h2>
            {description && <p className="mt-1 text-sm text-label">{description}</p>}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {actions}
            <label className="relative block min-w-0 lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-disabled" />
              <input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-input-border bg-input-bg pl-9 pr-3 text-sm text-heading outline-none transition hover:border-mint hover:bg-input-hover-bg focus:border-mint focus:bg-white focus:ring-2 focus:ring-mint/20"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <label key={filter.key} className="relative">
                  {filter.type === 'text' ? (
                    <>
                      <input
                        value={filter.value}
                        onChange={(event) => filter.onChange(event.target.value)}
                        placeholder={filter.placeholder}
                        list={filter.datalistId}
                        className="h-10 w-52 rounded-xl border border-input-border bg-white px-3 text-sm font-medium text-label outline-none transition placeholder:text-placeholder hover:bg-input-bg focus:border-mint focus:ring-2 focus:ring-mint/20"
                      />
                      {filter.datalistId && (
                        <datalist id={filter.datalistId}>
                          {filter.options.map((option) => (
                            <option key={option.value || option.label} value={option.label} />
                          ))}
                        </datalist>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFilterKey((current) =>
                            current === filter.key ? null : filter.key,
                          )
                        }
                        className="flex h-10 min-w-40 items-center justify-between gap-3 rounded-xl border border-input-border bg-white py-0 pl-3 pr-3 text-sm font-medium text-label outline-none transition hover:bg-input-bg focus:border-mint focus:ring-2 focus:ring-mint/20"
                      >
                        <span>
                          {filter.options.find((option) => option.value === filter.value)?.label ??
                            filter.options[0]?.label}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-icon-disabled" />
                      </button>
                      {openFilterKey === filter.key && (
                        <div className="absolute right-0 z-50 mt-2 min-w-full overflow-hidden rounded-xl border border-mint-border bg-white py-1 shadow-[0_14px_45px_rgba(5,46,28,0.16)]">
                          {filter.options.map((option) => {
                            const selected = option.value === filter.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  filter.onChange(option.value);
                                  setOpenFilterKey(null);
                                }}
                                className={cn(
                                  'flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm transition',
                                  selected
                                    ? 'bg-mint-pale font-semibold text-heading'
                                    : 'text-label hover:bg-input-bg hover:text-heading',
                                )}
                              >
                                {option.label}
                                {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-divider">
          <thead className="bg-input-bg/80">
            <tr>
              {columns.map((column) => {
                const active = sort?.sortBy === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-label sm:px-6',
                      column.className,
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.key)}
                        className="inline-flex items-center gap-1.5 rounded-lg text-left transition hover:text-primary"
                      >
                        {column.label}
                        <ChevronsUpDown
                          className={cn(
                            'h-3.5 w-3.5',
                            active ? 'text-primary' : 'text-icon-disabled',
                          )}
                        />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-white/70">
            {loading ? (
              <AdminListTableSkeleton columnCount={columns.length} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center">
                  <p className="text-sm font-semibold text-heading">{emptyTitle}</p>
                  {emptyDescription && (
                    <p className="mt-1 text-sm text-label">{emptyDescription}</p>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={getRowKey(row)} className="transition hover:bg-row-hover">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'whitespace-nowrap px-5 py-4 text-sm text-label sm:px-6',
                        column.cellClassName,
                      )}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-divider px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm text-label">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <span className="text-placeholder">/</span>
          <span>{pagination.total} total</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(pagination.limit)}
            onChange={onLimitChange}
            size="sm"
            options={pageSizeOptions.map((limit) => ({
              value: String(limit),
              label: `${limit} / page`,
            }))}
            className="w-auto"
          />
          <button
            type="button"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input-border bg-white px-3 text-sm font-semibold text-primary transition hover:bg-input-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input-border bg-white px-3 text-sm font-semibold text-primary transition hover:bg-input-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
