import { CheckCircle2 } from "lucide-react";
import { formatEligibilityRule } from "@/utils/eligibility";

/**
 * Displays eligibility rules for the selected admission type.
 *
 * Props:
 * - rules: rules already filtered for REGULAR or TRANSFER
 * - admissionType: optional label for the UI
 */
export function EligibilityList({ rules, admissionType = "REGULAR" }) {
  const admissionLabel =
    admissionType === "TRANSFER" ? "Transfer Admission" : "Regular Admission";

  if (!rules?.length) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-[#4B6358]">
          No specific eligibility rules are configured for {admissionLabel}.
        </p>

        <p className="text-xs text-[#6B7F75]">
          Please contact the institute if you need clarification about
          eligibility.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#4B6358]">
        The following eligibility requirements apply to {admissionLabel}.
      </p>

      <ul className="space-y-3">
        {rules
          .filter((rule) => rule?.enabled !== false)
          .map((rule, index) => (
            <li
              key={
                rule?._id ??
                `${rule.field}-${rule.operator}-${rule.value}-${index}`
              }
              className="flex gap-3"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A6640]" />

              <span className="text-sm leading-relaxed text-[#052E1C]">
                {formatEligibilityRule(rule)}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
