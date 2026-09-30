import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide capitalize',
  {
    variants: {
      variant: {
        default: 'border-info-border bg-info-bg text-info-text',
        draft: 'border-warning-border bg-warning-bg text-warning-text',
        active: 'border-input-border bg-input-bg text-primary',
        complete: 'border-success-border bg-success-bg text-primary',
        incomplete: 'border-warning-border bg-warning-bg text-warning-text',
        disabled: 'border-error-border bg-error-bg text-error-text',
        archived: 'border-divider bg-row-hover text-text-muted',
        outline: 'border-input-border bg-white text-label',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
