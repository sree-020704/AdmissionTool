import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function KnowledgeInsightPanel({
  children,
  className,
  suggested = false,
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border-soft bg-white p-4 transition-all duration-150",
        suggested && "border-mist-green bg-bg-faint-3",
        className,
      )}
    >
      {suggested && (
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-mist-alt px-2 py-1 text-[10px] font-semibold text-forest-mid"
          title="Suggested from your uploaded documents"
        >
          <Bot className="h-3 w-3" strokeWidth={2} aria-hidden />
          Suggested
        </span>
      )}
      <div className={cn(suggested && "pr-20")}>{children}</div>
    </div>
  );
}
