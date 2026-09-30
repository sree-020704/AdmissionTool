import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { EXTRACTION_PROGRESS_STEPS } from "./reviewPackContents";
import { cn } from "@/lib/utils";

export function ExtractionProgress({ active }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      return undefined;
    }
    const id = setInterval(() => {
      setStepIndex((i) =>
        i < EXTRACTION_PROGRESS_STEPS.length - 1 ? i + 1 : i,
      );
    }, 2200);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="rounded-xl border border-mist-green bg-white p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-forest-mid/10">
          <Loader2
            className="h-3.5 w-3.5 animate-spin text-forest-mid"
            strokeWidth={2}
          />
        </div>
        <p className="text-sm font-semibold text-forest-deep">
          Building your review pack…
        </p>
      </div>
      <ul className="space-y-2.5">
        {EXTRACTION_PROGRESS_STEPS.map((label, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 text-sm transition-all duration-300",
                current
                  ? "text-forest-deep"
                  : done
                    ? "text-sage-muted"
                    : "text-sage-border",
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  current && "border border-forest-mid bg-white",
                  done && "bg-forest-mid",
                  !current && !done && "border border-border-soft bg-mist-faint",
                )}
              >
                {current && (
                  <Loader2
                    className="h-3 w-3 animate-spin text-forest-mid"
                    strokeWidth={2.5}
                  />
                )}
                {done && (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  current && "font-semibold",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
