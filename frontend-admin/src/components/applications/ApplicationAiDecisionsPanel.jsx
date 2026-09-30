import { Sparkles, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const VERDICT_META = {
  pass: { label: 'Pass', variant: 'active', Icon: CheckCircle2 },
  fail: { label: 'Fail', variant: 'disabled', Icon: AlertCircle },
  uncertain: { label: 'Uncertain', variant: 'incomplete', Icon: HelpCircle },
};

const ACTION_LABELS = {
  approved: 'Auto-approved',
  returned_for_correction: 'Returned for correction',
  escalated: 'Escalated to staff',
  recommendation: 'Recommendation',
  failed: 'AI could not complete',
};

const HANDLER_LABELS = {
  document_verification: 'Document verification',
  eligibility_screening: 'Eligibility screening',
  intake_authorization: 'Intake authorization',
};

function formatConfidence(confidence) {
  if (confidence == null) return null;
  return `${Math.round(confidence * 100)}% confidence`;
}

function formatValue(value) {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function ApplicationAiDecisionsPanel({ decisions = [] }) {
  if (!decisions.length) return null;

  return (
    <section className="mt-8 rounded-2xl border border-mist-green bg-surface-tint p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary-bright" />
        <h2 className="text-lg font-bold text-heading">AI verification</h2>
      </div>
      <p className="mt-1 text-sm text-label">
        Automated checks the AI performed on this request. Staff decisions always override these.
      </p>

      <div className="mt-5 space-y-4">
        {decisions.map((decision) => {
          const verdict = VERDICT_META[decision.verdict] ?? VERDICT_META.uncertain;
          const VerdictIcon = verdict.Icon;
          return (
            <div
              key={decision.id}
              className="rounded-xl border border-mist-green bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-heading">
                    {decision.stepName || HANDLER_LABELS[decision.handler] || 'AI check'}
                  </p>
                  <p className="mt-0.5 text-xs text-label">
                    {HANDLER_LABELS[decision.handler] ?? decision.handler}
                    {decision.createdAt
                      ? ` · ${new Date(decision.createdAt).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={verdict.variant}>
                    <VerdictIcon className="mr-1 h-3.5 w-3.5" />
                    {verdict.label}
                  </Badge>
                  <span className="rounded-full bg-input-bg px-3 py-1 text-xs font-semibold text-primary">
                    {ACTION_LABELS[decision.action] ?? decision.action}
                  </span>
                  {formatConfidence(decision.confidence) ? (
                    <span className="text-xs font-medium text-label">
                      {formatConfidence(decision.confidence)}
                    </span>
                  ) : null}
                </div>
              </div>

              {decision.summary ? (
                <p className="mt-3 text-sm text-slate-text">{decision.summary}</p>
              ) : null}

              {(decision.issues ?? []).length > 0 ? (
                <div className="mt-3 rounded-lg border border-warning-border bg-warning-bg p-3">
                  <p className="text-xs font-bold text-warning-text">Issues flagged</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-warning-text">
                    {decision.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(decision.perDocument ?? []).length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-bold text-heading">Per-document findings</p>
                  <ul className="mt-2 space-y-1.5">
                    {decision.perDocument.map((doc, index) => {
                      const docVerdict = VERDICT_META[doc.verdict] ?? VERDICT_META.uncertain;
                      return (
                        <li
                          key={index}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-row-hover px-3 py-2 text-xs text-label"
                        >
                          <span className="font-medium text-heading">
                            {doc.requirementName ?? `Document ${index + 1}`}
                          </span>
                          <span className="flex items-center gap-2">
                            {doc.issue ? <span className="text-warning-text">{doc.issue}</span> : null}
                            <Badge variant={docVerdict.variant}>{docVerdict.label}</Badge>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {(decision.extractedFields ?? []).length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-bold text-heading">Extracted values</p>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                    {decision.extractedFields.map((field, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-divider bg-white px-3 py-2 text-xs"
                      >
                        <dt className="font-semibold uppercase tracking-wide text-text-muted">
                          {field.field}
                        </dt>
                        <dd className="mt-0.5 font-medium text-heading">
                          {formatValue(field.value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
