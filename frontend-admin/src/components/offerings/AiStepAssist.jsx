import { Sparkles, BookOpen, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiStepAssist({
  section,
  aiSuggestions,
  generating,
  onGenerate,
  canGenerate = true,
}) {
  return (
    <div className="rounded-xl border border-mist-green bg-surface-tint p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-forest-mid/10">
              <Sparkles
                className="h-3.5 w-3.5 text-forest-mid"
                strokeWidth={2}
              />
            </div>
            <p className="text-sm font-semibold text-forest-deep">
              AI assistance
            </p>
          </div>
          <p className="text-xs leading-relaxed text-sage-text max-w-sm">
            Extracts eligibility, documents, workflow, and queue settings from
            your knowledge documents into the fields below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onGenerate(section)}
          disabled={generating || !canGenerate}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-150",
            generating || !canGenerate
              ? "cursor-not-allowed border-mist-green bg-white text-sage-muted"
              : "border-forest-mid bg-forest-mid text-white shadow-sm hover:bg-forest-strong active:scale-[0.98]",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          {generating ? "Extracting…" : "Extract from documents"}
        </button>
      </div>

      {aiSuggestions?.understandingSummary && (
        <div className="flex gap-3 rounded-lg border border-border-soft bg-white px-4 py-3">
          <BookOpen
            className="h-4 w-4 shrink-0 text-forest-mid mt-0.5"
            strokeWidth={2}
          />
          <p className="text-xs leading-relaxed text-forest-mid-2">
            {aiSuggestions.understandingSummary}
          </p>
        </div>
      )}

      {aiSuggestions?.gaps?.length > 0 && (
        <div className="rounded-lg border border-sand-chip bg-cream px-4 py-3 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-text">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
            Knowledge gaps detected
          </p>
          <ul className="space-y-1 pl-5 list-disc">
            {aiSuggestions.gaps.slice(0, 2).map((g) => (
              <li key={g} className="text-xs text-brown-text">
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
