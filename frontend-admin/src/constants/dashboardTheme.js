export const DASHBOARD_CHART = {
  primary: 'var(--color-primary)',
  primaryLight: 'var(--color-primary-bright)',
  primarySoft: 'var(--color-mint)',
  grid: 'var(--color-divider)',
  text: 'var(--color-label)',
  textDark: 'var(--color-heading)',
  danger: 'var(--color-error-text)',
  warning: 'var(--color-amber-solid)',
  info: 'var(--color-info-solid-2)',
  palette: ['var(--color-primary)', 'var(--color-primary-bright)', 'var(--color-mint)', 'var(--color-info-solid-2)', 'var(--color-amber-solid)', 'var(--color-error-text)'],
};

export const CHART_ANIMATION = false;

export const CHART_MARGIN = { top: 8, right: 8, left: -16, bottom: 0 };

export function dashboardTooltipStyle() {
  return {
    borderRadius: 12,
    border: '1px solid var(--color-divider)',
    backgroundColor: 'var(--color-white-solid)',
    color: 'var(--color-heading)',
    fontSize: 12,
    boxShadow: 'none',
  };
}
