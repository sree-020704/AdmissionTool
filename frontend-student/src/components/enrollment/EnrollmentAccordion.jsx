import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EnrollmentAccordion({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-divider bg-white/90 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-input-bg"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-heading">{title}</h2>
          {count != null && (
            <p className="mt-0.5 text-xs text-label">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count != null && (
            <span className="rounded-full bg-mint-pale px-2.5 py-0.5 text-xs font-semibold text-primary">
              {count}
            </span>
          )}
          <ChevronDown
            className={cn('h-4 w-4 text-label transition-transform', open && 'rotate-180')}
          />
        </div>
      </button>
      {open && <div className="border-t border-divider px-5 py-4">{children}</div>}
    </div>
  );
}
