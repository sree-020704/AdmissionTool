import { Clock3, UserRoundCheck } from 'lucide-react';
import { formatStepTiming } from '@/utils/offering';
import { getHandlerLabel } from '@/utils/workflow';

export function EnrollmentProcessTimeline({ steps }) {
  if (!steps?.length) {
    return <p className="text-sm text-label">Enrollment process details will be shared soon.</p>;
  }

  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <ol className="space-y-0">
      {sorted.map((step, index) => (
        <li key={step.stepId} className="relative flex gap-4 pb-6 last:pb-0">
          {index < sorted.length - 1 && (
            <span
              className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-divider"
              aria-hidden
            />
          )}
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-pale text-sm font-semibold text-primary">
            {index + 1}
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-heading">{step.name}</h3>
            {step.description && (
              <p className="mt-1 text-sm leading-relaxed text-label">{step.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-label">
              <span className="inline-flex items-center gap-1 rounded-full bg-input-bg px-2.5 py-1 font-medium">
                <UserRoundCheck className="h-3 w-3 text-primary" />
                {getHandlerLabel(step.handledBy)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-row-hover px-2.5 py-1 font-medium">
                <Clock3 className="h-3 w-3 text-primary" />
                {formatStepTiming(step)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
