import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function DashboardPageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-bright">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-heading">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-label">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const METRIC_VARIANTS = {
  emerald: {
    card: 'border-mint-light/80',
    wash: 'from-primary-bright/28 via-mint-pale/45 to-white/95',
    glow: 'bg-primary-bright/16',
    label: 'text-success-text-deep',
    iconWrap: 'border-mint/60 bg-success-bg/90 text-primary',
    watermark: 'text-primary-bright/14',
  },
  blue: {
    card: 'border-info-border/80',
    wash: 'from-info-solid/24 via-info-bg-2/50 to-white/95',
    glow: 'bg-info-solid/14',
    label: 'text-info-text',
    iconWrap: 'border-info-light/60 bg-info-bg/90 text-info-text',
    watermark: 'text-info-solid/14',
  },
  amber: {
    card: 'border-warning-border/90',
    wash: 'from-amber-solid-2/26 via-warning-chip/55 to-white/95',
    glow: 'bg-amber-solid-2/14',
    label: 'text-amber-text-deep',
    iconWrap: 'border-amber-light/70 bg-warning-bg/90 text-amber-text-deep',
    watermark: 'text-amber-solid-2/14',
  },
  rose: {
    card: 'border-error-border/90',
    wash: 'from-error/22 via-error-chip/50 to-white/95',
    glow: 'bg-error/12',
    label: 'text-error-text',
    iconWrap: 'border-error-border-strong/70 bg-error-bg/90 text-error-text',
    watermark: 'text-error/14',
  },
  teal: {
    card: 'border-teal-light/80',
    wash: 'from-teal-solid/24 via-teal-chip/50 to-white/95',
    glow: 'bg-teal-solid/14',
    label: 'text-teal-text-deep',
    iconWrap: 'border-teal-mid/60 bg-teal-bg/90 text-teal-text-deep',
    watermark: 'text-teal-solid/14',
  },
  violet: {
    card: 'border-purple-light/80',
    wash: 'from-purple-solid/22 via-purple-bg/50 to-white/95',
    glow: 'bg-purple-solid/12',
    label: 'text-purple-text-deep',
    iconWrap: 'border-purple-mid/60 bg-purple-faint/90 text-purple-text-deep',
    watermark: 'text-purple-solid/14',
  },
  /** @deprecated use named variants */
  default: null,
  accent: null,
  warning: null,
  danger: null,
};

METRIC_VARIANTS.default = METRIC_VARIANTS.emerald;
METRIC_VARIANTS.accent = METRIC_VARIANTS.emerald;
METRIC_VARIANTS.warning = METRIC_VARIANTS.amber;
METRIC_VARIANTS.danger = METRIC_VARIANTS.rose;

export function DashboardMetricCard({
  index,
  label,
  value,
  hint,
  icon: Icon,
  variant = 'emerald',
  className,
  href,
  onClick,
}) {
  const tone = METRIC_VARIANTS[variant] ?? METRIC_VARIANTS.emerald;
  const interactive = Boolean(href || onClick);

  const content = (
    <>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br',
          tone.wash,
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -left-10 -top-10 h-36 w-44 rounded-full blur-2xl',
          tone.glow,
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute bottom-0 right-0 h-28 w-32 rounded-full blur-2xl opacity-80',
          tone.glow,
        )}
      />

      {index != null ? (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute right-4 top-3 text-5xl font-bold leading-none select-none',
            tone.watermark,
          )}
        >
          {String(index).padStart(2, '0')}
        </span>
      ) : null}

      <div className="relative flex min-h-[118px] flex-col">
        <div className="min-w-0 flex-1 pr-8">
          <p className={cn('text-[10px] font-bold uppercase tracking-[0.14em]', tone.label)}>
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-heading">{value}</p>
          {hint ? <p className="mt-1.5 text-xs leading-relaxed text-label">{hint}</p> : null}
        </div>

        {Icon ? (
          <div className="mt-4 flex justify-end">
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl border',
                tone.iconWrap,
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={cn(
          'relative block overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md',
          tone.card,
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5',
        tone.card,
        interactive ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md' : '',
        className,
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {content}
    </article>
  );
}

export function DashboardChartCard({ title, description, children, className, action, compact }) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-divider bg-gradient-to-br from-white via-bg-faint-2 to-surface-tint',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-divider/80 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-heading">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-label">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={cn(compact ? 'p-4 sm:p-5' : 'p-4 sm:p-5', compact ? '' : '')}>
        {children}
      </div>
    </section>
  );
}

export function DashboardInsightBanner({ title, description, action, tone = 'default' }) {
  const tones = {
    default: 'border-input-border from-input-bg to-success-bg',
    warning: 'border-warning-border from-warning-bg to-warning-chip',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border bg-gradient-to-r px-5 py-4 sm:px-6',
        tones[tone] ?? tones.default,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-heading">{title}</p>
          {description ? <p className="mt-1 text-sm text-label">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function DashboardListCard({ title, action, children, emptyMessage }) {
  const isEmpty = !children;

  return (
    <section className="overflow-hidden rounded-2xl border border-divider bg-gradient-to-br from-white via-bg-faint-2 to-surface-tint">
      <div className="flex items-center justify-between gap-3 border-b border-divider/80 px-5 py-4 sm:px-6">
        <h3 className="text-sm font-bold text-heading">{title}</h3>
        {action}
      </div>
      <div className="p-4 sm:p-5">
        {isEmpty ? (
          <p className="rounded-xl border border-dashed border-input-border bg-row-hover px-4 py-8 text-center text-sm text-label">
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function DashboardSnapshotCard({ title, items }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-divider bg-gradient-to-br from-surface-tint via-white to-bg-faint-2">
      <div className="border-b border-divider/80 px-5 py-4 sm:px-6">
        <h3 className="text-sm font-bold text-heading">{title}</h3>
      </div>
      <ul className="divide-y divide-divider/80 px-5 py-2 sm:px-6">
        {(items ?? []).map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="text-label">{item.label}</span>
            <span className="font-semibold tabular-nums text-heading">{item.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardEmptyChart({ message = 'No data yet for this chart.' }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-input-border bg-row-hover/80 px-4 text-center text-sm text-label">
      {message}
    </div>
  );
}
