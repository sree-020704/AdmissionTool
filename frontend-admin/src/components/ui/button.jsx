import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-primary to-primary-hover text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] hover:opacity-95',
        outline:
          'border border-input-border bg-white text-primary hover:bg-input-bg',
        ghost: 'text-label hover:bg-input-bg hover:text-primary',
        destructive:
          'border border-error-border bg-error-bg text-error-text hover:bg-error-chip',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * @param {import('react').ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string, size?: string }} props
 */
export function Button({ className, variant, size, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
