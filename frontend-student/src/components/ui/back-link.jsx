import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @param {{
 *   to: string;
 *   label?: string;
 *   className?: string;
 * }} props
 */
export function BackLink({ to, label = 'Back', className }) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-mint-bg',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

export const softCardClassName =
  'rounded-2xl border border-divider bg-white shadow-[0_1px_2px_rgba(10,102,64,0.04)]';

export const softHeroClassName =
  'overflow-hidden rounded-2xl border border-divider bg-gradient-to-br from-input-bg via-white to-row-hover shadow-[0_1px_2px_rgba(10,102,64,0.04)]';

export const softFooterClassName =
  'rounded-2xl border border-divider bg-white shadow-[0_1px_2px_rgba(10,102,64,0.04)]';
