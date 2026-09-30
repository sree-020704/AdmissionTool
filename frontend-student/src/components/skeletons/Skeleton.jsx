import { cn } from '@/lib/utils';

/**
 * @param {{ className?: string }} props
 */
export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-mist-alt-2/80', className)} />;
}
