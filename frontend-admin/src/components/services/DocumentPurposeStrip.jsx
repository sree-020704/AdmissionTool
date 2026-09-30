import { FileText, Sparkles, ClipboardCheck, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: FileText,
    label: "Upload",
    detail: "PDF or DOCX source files",
    color: "text-forest-mid-2",
    bg: "bg-surface-tint",
    border: "border-mist-green",
  },
  {
    icon: Sparkles,
    label: "Extract",
    detail: "AI-powered review pack",
    color: "text-forest-mid-2",
    bg: "bg-surface-tint",
    border: "border-mist-green",
  },
  {
    icon: ClipboardCheck,
    label: "Review",
    detail: "Confirm & configure",
    color: "text-forest-mid-2",
    bg: "bg-surface-tint",
    border: "border-mist-green",
  },
];

export function DocumentPurposeStrip() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-center gap-2">
          <div
            className={`flex flex-1 items-center gap-3 rounded-xl border ${step.border} ${step.bg} px-4 py-3 transition-all duration-150`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-mist-green">
              <step.icon className={`h-4 w-4 ${step.color}`} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-forest-deep">
                {step.label}
              </p>
              <p className="text-xs text-sage-text">{step.detail}</p>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <ArrowRight
              className="hidden h-4 w-4 shrink-0 text-sage-light-2 sm:block"
              strokeWidth={2}
            />
          )}
        </div>
      ))}
    </div>
  );
}
