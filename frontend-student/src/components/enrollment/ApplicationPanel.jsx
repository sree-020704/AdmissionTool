import { CheckCircle2, Clock3, Send } from "lucide-react";
import { formatQueueMode } from "@/utils/offering";
import { ApplicantDetailsForm } from "@/components/enrollment/ApplicantDetailsForm";
import { IntakeDocumentInput } from "@/components/enrollment/IntakeDocumentInput";
import { PhoneInput } from "@/components/ui/PhoneInput";

export function ApplicationPanel({
  visible,
  offering,
  applicantName,
  applicantEmail,
  applicantMobile,
  intakeDocumentFile,
  applicantDetails,
  onNameChange,
  onEmailChange,
  onMobileChange,
  onIntakeDocumentChange,
  onApplicantDetailChange,
  onSubmit,
  submitting,
  intakeStatus,
  checkingIntake,
  admissionType = "REGULAR",
  admissionLabel = "Regular Admission",
}) {
  const blocked = intakeStatus?.canSubmit === false;

  const pending = intakeStatus?.status === "pending_authorization";

  const groupedEligibility = offering?.eligibilityByAdmissionType ?? {};

  const groupedDocuments = offering?.documentsByAdmissionType ?? {};

  /*
   * Backward compatibility:
   *
   * Old offerings:
   *   eligibilityRules
   *   documentRequirements
   *
   * are treated as Regular Admission.
   */
  const regularRules = Array.isArray(groupedEligibility.regular)
    ? groupedEligibility.regular
    : (offering?.eligibilityRules ?? []);

  const transferRules = Array.isArray(groupedEligibility.transfer)
    ? groupedEligibility.transfer
    : [];

  const regularDocuments = Array.isArray(groupedDocuments.regular)
    ? groupedDocuments.regular
    : (offering?.documentRequirements ?? []);

  const transferDocuments = Array.isArray(groupedDocuments.transfer)
    ? groupedDocuments.transfer
    : [];

  const currentRules =
    admissionType === "TRANSFER" ? transferRules : regularRules;

  const currentDocuments =
    admissionType === "TRANSFER" ? transferDocuments : regularDocuments;

  const activeEligibilityCount = currentRules.filter(
    (rule) => rule?.enabled !== false,
  ).length;

  const requiredDocumentCount = currentDocuments.filter(
    (document) => document?.enabled !== false && document?.required !== false,
  ).length;

  return (
    <div
      className={`rounded-2xl border border-divider bg-white/90 p-6 shadow-sm transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <div>
        <h2 className="text-lg font-semibold text-heading">
          Start your application
        </h2>

        <p className="mt-1 text-sm text-label">
          Submit your details for institute authorization. After approval you
          will receive student portal access to complete enrollment.
        </p>
      </div>

      {/* ==================================================
          SELECTED ADMISSION TYPE
          ================================================== */}

      <div className="mt-4 rounded-xl border border-mint-border bg-row-hover p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
          Admission type
        </p>

        <p className="mt-1 text-sm font-semibold text-heading">
          {admissionLabel}
        </p>

        <p className="mt-1 text-xs text-label">
          Your eligibility checks and required documents are based on this
          admission type.
        </p>
      </div>

      {/* ==================================================
          BLOCKED / PENDING MESSAGE
          ================================================== */}

      {blocked && intakeStatus?.message ? (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            pending
              ? "border-warning-border bg-warning-bg text-warning-text"
              : "border-divider bg-row-hover text-label"
          }`}
        >
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                {pending ? "Authorization pending" : "Request already on file"}
              </p>

              <p className="mt-1 text-sm leading-relaxed">
                {intakeStatus.message}
              </p>

              {intakeStatus.admissionType ? (
                <p className="mt-2 text-xs font-medium">
                  Admission type: {intakeStatus.admissionType}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ==================================================
          READINESS
          ================================================== */}

      {offering && !blocked ? (
        <div className="mt-5 rounded-xl border border-divider bg-row-hover p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
            Before you start
          </p>

          <ul className="mt-3 space-y-2 text-xs text-label">
            <ReadinessItem
              label={`${activeEligibilityCount} ${
                activeEligibilityCount === 1
                  ? "eligibility check"
                  : "eligibility checks"
              } for ${admissionLabel}`}
            />

            <ReadinessItem
              label={`${requiredDocumentCount} required ${
                requiredDocumentCount === 1 ? "document" : "documents"
              } for ${admissionLabel}`}
            />

            <ReadinessItem label={formatQueueMode(offering.queueMode)} />
          </ul>
        </div>
      ) : null}

      {/* ==================================================
          APPLICATION FORM
          ================================================== */}

      {!blocked ? (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {/* ----------------------------------------------
              FULL NAME
              ---------------------------------------------- */}

          <div>
            <label
              htmlFor="applicant-name"
              className="mb-1.5 block text-sm font-medium text-heading"
            >
              Full name
            </label>

            <input
              id="applicant-name"
              type="text"
              value={applicantName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Your full name"
              className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-4 text-sm text-heading outline-none transition focus:border-mint focus:bg-white"
              required
            />
          </div>

          {/* ----------------------------------------------
              EMAIL
              ---------------------------------------------- */}

          <div>
            <label
              htmlFor="applicant-email"
              className="mb-1.5 block text-sm font-medium text-heading"
            >
              Email
            </label>

            <input
              id="applicant-email"
              type="email"
              value={applicantEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@email.com"
              className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-4 text-sm text-heading outline-none transition focus:border-mint focus:bg-white"
              required
            />

            {checkingIntake ? (
              <p className="mt-1.5 text-xs text-text-muted">
                Checking existing {admissionLabel.toLowerCase()} request…
              </p>
            ) : null}
          </div>

          {/* ----------------------------------------------
              MOBILE
              ---------------------------------------------- */}

          <div>
            <label
              htmlFor="applicant-mobile-number"
              className="mb-1.5 block text-sm font-medium text-heading"
            >
              Mobile number
            </label>

            <PhoneInput
              id="applicant-mobile"
              value={applicantMobile}
              onChange={onMobileChange}
              placeholder="Mobile number"
            />
          </div>

          {/* ----------------------------------------------
              APPLICANT DETAILS
              ---------------------------------------------- */}

          <ApplicantDetailsForm
            fields={offering?.applicantFields ?? []}
            values={applicantDetails ?? {}}
            onChange={onApplicantDetailChange}
          />

          {/* ----------------------------------------------
              INTAKE DOCUMENT
              ---------------------------------------------- */}

          <IntakeDocumentInput
            intakeDocument={offering?.intakeDocument}
            file={intakeDocumentFile}
            onChange={onIntakeDocumentChange}
          />

          {/* ----------------------------------------------
              EXISTING REQUEST STATUS
              ---------------------------------------------- */}

          {intakeStatus?.message && intakeStatus.canSubmit ? (
            <p className="rounded-xl border border-divider bg-row-hover px-4 py-3 text-xs leading-relaxed text-label">
              {intakeStatus.message}
            </p>
          ) : null}

          {/* ----------------------------------------------
              SUBMIT
              ---------------------------------------------- */}

          <button
            type="submit"
            disabled={submitting || checkingIntake}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            <Send className="h-4 w-4" />

            {submitting ? "Submitting..." : "Start application"}
          </button>

          <p className="text-xs leading-relaxed text-label">
            This sends an authorization request to the institute. Login
            credentials are emailed after admin approval.
          </p>
        </form>
      ) : null}
    </div>
  );
}

function ReadinessItem({ label }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />

      <span>{label}</span>
    </li>
  );
}
