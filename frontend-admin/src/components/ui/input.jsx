import { cn } from '@/lib/utils';

/**
 * @param {import('react').InputHTMLAttributes<HTMLInputElement>} props
 */
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl border border-input-border bg-input-bg px-4 py-2 text-sm text-heading placeholder:text-placeholder',
        'transition-all duration-200 hover:border-mint hover:bg-input-hover-bg',
        'focus-visible:outline-none focus-visible:border-mint focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-mint/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
