import { Clock, UserRound } from 'lucide-react';
import { formatStepTiming } from '@/utils/offering';
import { getHandlerLabel } from '@/utils/workflow';

export function WorkflowTimeline({ steps }) {
  if (!steps?.length) {
    return <p className="text-sm text-label">The institute has not shared the steps yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <WorkflowStepPreview key={step.stepId ?? index} step={step} index={index} />
      ))}
    </ol>
  );
}

function WorkflowStepPreview({ step, index }) {
  return (
    <li className="relative overflow-hidden rounded-2xl border border-divider bg-white p-5 shadow-sm">
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-3 text-4xl font-bold leading-none text-mint-bg-2"
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="relative flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint-pale text-sm font-bold text-primary">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 pr-10">
          <h3 className="text-base font-bold text-heading">{step.name}</h3>
          {step.description && (
            <p className="mt-2 text-sm leading-relaxed text-label">{step.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-label">
            <span className="inline-flex items-center gap-1 rounded-full bg-input-bg px-2.5 py-1 font-medium text-primary">
              <UserRound className="h-3.5 w-3.5" />
              {getHandlerLabel(step.handledBy)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-row-hover px-2.5 py-1 font-medium">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {formatStepTiming(step)}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
