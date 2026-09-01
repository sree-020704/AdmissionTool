import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { studentApi } from "@/api/student.api";

const STATUS_ICON = {
  passed: CheckCircle2,
  failed: AlertCircle,
  unchecked: HelpCircle,
};

const STATUS_TONE = {
  passed: "text-[#0A6640] bg-[#F0FAF5] border-[#C4E8D4]",

  failed: "text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]",

  unchecked: "text-[#92400E] bg-[#FFFBEB] border-[#FDE68A]",
};

/**
 * @param {Object} props
 * @param {string} props.offeringId
 * @param {'REGULAR'|'TRANSFER'} [props.admissionType]
 */
export function EligibilityPreview({ offeringId, admissionType = "REGULAR" }) {
  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!offeringId) {
      return;
    }

    let cancelled = false;

    setLoading(true);
    setPreview(null);

    studentApi
      .previewEligibility(offeringId, admissionType)
      .then(({ data }) => {
        if (!cancelled) {
          setPreview(data?.data ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [offeringId, admissionType]);

  if (loading) {
    return (
      <p className="text-sm text-[#4B6358]">
        Checking {admissionType === "TRANSFER" ? "transfer" : "regular"}{" "}
        admission eligibility...
      </p>
    );
  }

  if (!preview) {
    return null;
  }

  const admissionLabel =
    admissionType === "TRANSFER" ? "Transfer Admission" : "Regular Admission";

  return (
    <div className="rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#052E1C]">
            Eligibility check
          </h3>

          <p className="mt-1 text-xs text-[#4B6358]">{admissionLabel}</p>
        </div>

        <span className="rounded-full border border-[#D8E8E0] bg-[#F7FBF9] px-3 py-1 text-xs font-semibold text-[#35604D]">
          {preview.admissionType ?? admissionType}
        </span>
      </div>

      <p
        className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${
          preview.eligible
            ? preview.needsReview
              ? "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
              : "border-[#C4E8D4] bg-[#F0FAF5] text-[#0A6640]"
            : "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
        }`}
      >
        {preview.message}
      </p>

      {preview.needsReview && (
        <p className="mt-2 text-xs text-[#92400E]">
          Some requirements need institute review — you may still apply, but
          staff will verify them.
        </p>
      )}

      {preview.failures?.length > 0 && (
        <div className="mt-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3">
          <p className="text-xs font-semibold text-[#991B1B]">
            Eligibility issues
          </p>

          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[#B91C1C]">
            {preview.failures.map((failure, index) => (
              <li key={index}>{failure}</li>
            ))}
          </ul>
        </div>
      )}

      {preview.results?.length > 0 && (
        <ul className="mt-4 space-y-2">
          {preview.results.map((result, index) => {
            const Icon = STATUS_ICON[result.status] ?? HelpCircle;

            return (
              <li
                key={result.field ?? index}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  STATUS_TONE[result.status] ?? STATUS_TONE.unchecked
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />

                <div>
                  <p className="font-semibold">{result.field}</p>

                  <p className="text-xs opacity-90">{result.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!preview.results?.length && !preview.failures?.length && (
        <p className="mt-4 text-xs text-[#4B6358]">
          No individual eligibility checks are configured for this admission
          type.
        </p>
      )}
    </div>
  );
}
