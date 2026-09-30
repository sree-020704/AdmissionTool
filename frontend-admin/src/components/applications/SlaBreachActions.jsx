import { AlertTriangle } from 'lucide-react';

const primaryBtn =
  'inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-3 py-1.5 text-xs font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] disabled:opacity-60';
const outlineBtn =
  'inline-flex items-center gap-1.5 rounded-xl border border-input-border bg-white px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-input-bg disabled:opacity-60';

export function SlaBreachActions({ application, loading, onExtend, onEscalate, showEscalate = true }) {
  if (!application?.slaBreached && !application?.slaOverdue) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-error-border bg-error-bg p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error-text" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-error-text-strong">SLA breach</p>
          <p className="mt-1 text-xs text-error-text-deep">
            This request is past its review deadline. Extend the SLA window or escalate it to another
            staff member.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={loading} onClick={onExtend} className={primaryBtn}>
              Extend deadline
            </button>
            {showEscalate ? (
              <button type="button" disabled={loading} onClick={onEscalate} className={outlineBtn}>
                Escalate to staff
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
