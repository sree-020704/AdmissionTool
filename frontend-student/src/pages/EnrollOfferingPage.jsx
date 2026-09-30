import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  ListChecks,
  MapPinned,
} from "lucide-react";

import { toast } from "sonner";

import { PublicLayout } from "@/components/StudentLayout";
import { EnrollmentOfferingSkeleton } from "@/components/skeletons";
import { EnrollmentAccordion } from "@/components/enrollment/EnrollmentAccordion";
import { EligibilityList } from "@/components/enrollment/EligibilityList";
import { DocumentList } from "@/components/enrollment/DocumentList";
import { EnrollmentProcessTimeline } from "@/components/enrollment/EnrollmentProcessTimeline";
import { ApplicationPanel } from "@/components/enrollment/ApplicationPanel";

import {
  createEmptyPhoneValue,
  serializeApplicantDetailsForSubmit,
  validateApplicantPhoneFields,
  validatePhoneInput,
} from "@/utils/phone";

import { studentApi } from "@/api/student.api";

import {
  formatOfferingWindow,
  formatQueueMode,
  getOfferingStats,
  getTotalSlaLabel,
} from "@/utils/offering";

import { formatOperatingHoursRange } from "@/utils/operatingHours";

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Return Regular / Transfer configuration from the offering.
 *
 * Backward compatibility:
 *
 * Existing offering:
 *   eligibilityRules
 *   documentRequirements
 *
 * is treated as REGULAR.
 */
function getAdmissionConfiguration(offering, admissionType) {
  const type = admissionType === "TRANSFER" ? "TRANSFER" : "REGULAR";

  const groupedEligibility = offering?.eligibilityByAdmissionType ?? {};

  const groupedDocuments = offering?.documentsByAdmissionType ?? {};

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

  return {
    admissionType: type,

    eligibilityRules: type === "TRANSFER" ? transferRules : regularRules,

    documentRequirements:
      type === "TRANSFER" ? transferDocuments : regularDocuments,
  };
}

/**
 * Admission-type label shown to the student.
 */
function getAdmissionLabel(admissionType) {
  return admissionType === "TRANSFER"
    ? "Transfer Admission"
    : "Regular Admission";
}

/**
 * ============================================================
 * MAIN PAGE
 * ============================================================
 */

export function EnrollOfferingPage() {
  const { instituteId, offeringId } = useParams();

  const navigate = useNavigate();

  const [institute, setInstitute] = useState(null);

  const [offering, setOffering] = useState(null);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [applicantName, setApplicantName] = useState("");

  const [applicantEmail, setApplicantEmail] = useState("");

  const [applicantMobile, setApplicantMobile] = useState(createEmptyPhoneValue);

  const [intakeDocumentFile, setIntakeDocumentFile] = useState(null);

  const [applicantDetails, setApplicantDetails] = useState({});

  const [intakeStatus, setIntakeStatus] = useState(null);

  const [checkingIntake, setCheckingIntake] = useState(false);

  /**
   * ==========================================================
   * ADMISSION TYPE
   * ==========================================================
   *
   * Student chooses:
   *
   * REGULAR
   * TRANSFER
   *
   * The selected type controls:
   *
   * - eligibility rules
   * - document requirements
   * - application admissionType
   */
  const [admissionType, setAdmissionType] = useState("REGULAR");

  /**
   * ==========================================================
   * LOAD OFFERING
   * ==========================================================
   */

  useEffect(() => {
    let cancelled = false;

    if (!instituteId || !offeringId) {
      return undefined;
    }

    setLoading(true);

    Promise.all([
      studentApi.getInstitute(instituteId),

      studentApi.getEnrollmentOffering(instituteId, offeringId),
    ])
      .then(([instituteRes, offeringRes]) => {
        if (cancelled) {
          return;
        }

        setInstitute(instituteRes?.data?.data?.institute ?? null);

        setOffering(offeringRes?.data?.data?.offering ?? null);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        toast.error(err?.message ?? "Failed to load programme");

        navigate(`/${instituteId}/enroll`, {
          replace: true,
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [instituteId, offeringId, navigate]);

  /**
   * ==========================================================
   * ADMISSION CONFIGURATION
   * ==========================================================
   */

  const admissionConfig = useMemo(
    () => getAdmissionConfiguration(offering, admissionType),
    [offering, admissionType],
  );

  const { eligibilityRules, documentRequirements } = admissionConfig;

  /**
   * ==========================================================
   * CHECK EXISTING INTAKE
   * ==========================================================
   */

  useEffect(() => {
    const email = applicantEmail.trim();

    if (!email || !email.includes("@")) {
      setIntakeStatus(null);

      return undefined;
    }

    setCheckingIntake(true);

    const timer = window.setTimeout(() => {
      studentApi
        .getEnrollmentIntakeStatus(
          instituteId,
          offeringId,
          email,
          admissionType,
        )
        .then(({ data }) => {
          setIntakeStatus(data?.data?.intake ?? null);
        })
        .catch(() => {
          setIntakeStatus(null);
        })
        .finally(() => {
          setCheckingIntake(false);
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [applicantEmail, instituteId, offeringId, admissionType]);

  /**
   * ==========================================================
   * CHANGE ADMISSION TYPE
   * ==========================================================
   */

  const handleAdmissionTypeChange = (nextType) => {
    const normalized = nextType === "TRANSFER" ? "TRANSFER" : "REGULAR";

    setAdmissionType(normalized);

    /*
     * Clear a previously selected intake document.
     *
     * This prevents accidentally submitting a document
     * selected under the other admission flow.
     */
    setIntakeDocumentFile(null);

    /*
     * Existing intake state may belong to the previous
     * admission type.
     */
    setIntakeStatus(null);
  };

  /**
   * ==========================================================
   * SUBMIT
   * ==========================================================
   */

  const onSubmit = async (event) => {
    event.preventDefault();

    if (intakeStatus?.canSubmit === false) {
      toast.error(
        intakeStatus.message || "You cannot submit another request right now.",
      );

      return;
    }

    /**
     * Phone validation.
     */
    const mobileResult = validatePhoneInput(applicantMobile);

    if (!mobileResult.valid) {
      toast.error(mobileResult.error || "Enter a valid mobile number");

      return;
    }

    /**
     * Applicant field validation.
     */
    const phoneFieldError = validateApplicantPhoneFields(
      offering?.applicantFields ?? [],
      applicantDetails,
    );

    if (phoneFieldError) {
      toast.error(phoneFieldError);

      return;
    }

    /**
     * Intake document validation.
     */
    const intakeDocument = offering?.intakeDocument;

    if (
      intakeDocument?.label &&
      intakeDocument.required !== false &&
      !intakeDocumentFile
    ) {
      toast.error(`Please upload your ${intakeDocument.label}`);

      return;
    }

    /**
     * Prevent submission when the selected admission
     * type has no active documents only when the institution
     * explicitly configured documents for that type.
     *
     * We do not force documents when none are configured.
     */
    setSubmitting(true);

    try {
      await studentApi.createApplication(
        instituteId,
        {
          offeringId,

          applicantName: applicantName.trim(),

          applicantEmail: applicantEmail.trim().toLowerCase(),

          applicantMobile: mobileResult.e164,

          applicantDetails: serializeApplicantDetailsForSubmit(
            offering?.applicantFields ?? [],
            applicantDetails,
          ),

          /**
           * Critical:
           * Tell backend whether this is
           * Regular or Transfer admission.
           */
          admissionType,
        },

        intakeDocumentFile,
      );

      toast.success(
        `${getAdmissionLabel(
          admissionType,
        )} request submitted. Your institute will review authorization before you can sign in.`,
      );

      setApplicantName("");

      setApplicantEmail("");

      setApplicantMobile(createEmptyPhoneValue());

      setIntakeDocumentFile(null);

      setApplicantDetails({});

      setIntakeStatus(null);
    } catch (err) {
      /*
       * Backend AppError messages should now reach the
       * student instead of a generic Internal Server Error.
       */
      const message =
        err?.response?.data?.message ??
        err?.message ??
        `Failed to start ${getAdmissionLabel(
          admissionType,
        ).toLowerCase()} application`;

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * ==========================================================
   * COUNTS
   * ==========================================================
   */

  const eligibilityCount =
    eligibilityRules?.filter((rule) => rule?.enabled !== false).length ?? 0;

  const documentCount =
    documentRequirements?.filter(
      (document) => document?.enabled !== false && document?.required !== false,
    ).length ?? 0;

  const processCount = offering?.workflowSteps?.length ?? 0;

  /**
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <PublicLayout instituteName={institute?.name} instituteId={instituteId}>
        <EnrollmentOfferingSkeleton />
      </PublicLayout>
    );
  }

  /**
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <PublicLayout instituteName={institute?.name} instituteId={instituteId}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          to={`/${instituteId}/enroll`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          All programmes
        </Link>

        {/* ==================================================
            PROGRAMME HEADER
            ================================================== */}

        <div className="mt-5 rounded-xl border border-mint-border bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-bright">
                Programme details
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-heading">
                {offering?.name ?? "Programme details"}
              </h1>

              {offering?.description && (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-label">
                  {offering.description}
                </p>
              )}

              {!institute?.name ? null : (
                <p className="mt-2 text-xs font-medium text-text-muted">
                  {institute.name}
                </p>
              )}

              {offering?.visitLocation ? (
                <p className="mt-3 inline-flex items-start gap-2 rounded-lg border border-divider bg-row-hover px-3 py-2 text-xs font-medium text-heading">
                  <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                  <span>
                    {offering.visitLocation}

                    {offering.visitInstructions ? (
                      <span className="mt-1 block font-normal text-label">
                        {offering.visitInstructions}
                      </span>
                    ) : null}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
              <MetaPill
                icon={CalendarDays}
                label={formatOfferingWindow(offering)}
              />

              <MetaPill
                icon={MapPinned}
                label={formatQueueMode(offering.queueMode)}
              />

              <MetaPill
                icon={Clock3}
                label={getTotalSlaLabel(offering.workflowSteps)}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {getOfferingStats(offering).map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-divider bg-row-hover p-4"
              >
                <p className="text-2xl font-bold text-heading">
                  {stat.value}
                </p>

                <p className="mt-1 text-xs font-semibold text-label">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ==================================================
            ADMISSION TYPE
            ================================================== */}

        <div className="mt-6 rounded-xl border border-mint-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-heading">
                Select admission type
              </p>

              <p className="mt-1 text-xs text-label">
                Eligibility and document requirements depend on the admission
                type you choose.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAdmissionTypeChange("REGULAR")}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  admissionType === "REGULAR"
                    ? "border-primary bg-primary text-white"
                    : "border-mist-green-2 bg-white text-heading hover:bg-page-bg-2"
                }`}
              >
                Regular Admission
              </button>

              <button
                type="button"
                onClick={() => handleAdmissionTypeChange("TRANSFER")}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  admissionType === "TRANSFER"
                    ? "border-primary bg-primary text-white"
                    : "border-mist-green-2 bg-white text-heading hover:bg-page-bg-2"
                }`}
              >
                Transfer Admission
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-divider bg-row-hover px-3 py-2 text-xs text-label">
            Selected:
            <span className="ml-1 font-bold text-heading">
              {getAdmissionLabel(admissionType)}
            </span>
          </div>
        </div>

        {/* ==================================================
            CONTENT
            ================================================== */}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)] lg:items-start">
          <div className="space-y-4">
            {/* =================================================
                ELIGIBILITY
                ================================================= */}

            <EnrollmentAccordion
              title={`Am I eligible for ${getAdmissionLabel(admissionType)}?`}
              count={eligibilityCount}
              defaultOpen
            >
              <EligibilityList
                rules={eligibilityRules}
                admissionType={admissionType}
              />
            </EnrollmentAccordion>

            {/* =================================================
                DOCUMENTS
                ================================================= */}

            <EnrollmentAccordion
              title={`Documents needed for ${getAdmissionLabel(admissionType)}`}
              count={documentCount}
            >
              <DocumentList documents={documentRequirements} />
            </EnrollmentAccordion>

            {/* =================================================
                PROCESS
                ================================================= */}

            <EnrollmentAccordion
              title="Enrollment process"
              count={processCount}
            >
              <EnrollmentProcessTimeline steps={offering?.workflowSteps} />
            </EnrollmentAccordion>

            {/* =================================================
                QUEUE / APPOINTMENT
                ================================================= */}

            <EnrollmentAccordion
              title="Queue or appointment access"
              count={offering?.queueMode ? 1 : 0}
            >
              <AccessModePanel offering={offering} />
            </EnrollmentAccordion>
          </div>

          {/* ==================================================
              APPLICATION PANEL
              ================================================== */}

          <div className="lg:sticky lg:top-24">
            <ApplicationPanel
              visible
              offering={offering}
              applicantName={applicantName}
              applicantEmail={applicantEmail}
              applicantMobile={applicantMobile}
              intakeDocumentFile={intakeDocumentFile}
              applicantDetails={applicantDetails}
              onNameChange={setApplicantName}
              onEmailChange={setApplicantEmail}
              onMobileChange={setApplicantMobile}
              onIntakeDocumentChange={setIntakeDocumentFile}
              onApplicantDetailChange={(fieldKey, value) =>
                setApplicantDetails((current) => ({
                  ...current,

                  [fieldKey]: value,
                }))
              }
              onSubmit={onSubmit}
              submitting={submitting}
              intakeStatus={intakeStatus}
              checkingIntake={checkingIntake}
              /*
               * Extra prop.
               *
               * Existing ApplicationPanel can ignore this if it
               * does not use it. If you later update the panel,
               * it can display the selected admission type.
               */
              admissionType={admissionType}
              admissionLabel={getAdmissionLabel(admissionType)}
            />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

/**
 * ============================================================
 * META PILL
 * ============================================================
 */

function MetaPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-divider bg-row-hover px-3 text-xs font-semibold text-heading">
      <Icon className="h-4 w-4 shrink-0 text-primary" />

      {label}
    </span>
  );
}

/**
 * ============================================================
 * ACCESS MODE
 * ============================================================
 */

function AccessModePanel({ offering }) {
  const hasQueue =
    offering.queueMode === "queue_only" || offering.queueMode === "hybrid";

  const hasAppointment =
    offering.queueMode === "appointment_only" ||
    offering.queueMode === "hybrid";

  return (
    <div className="space-y-4">
      <p className="text-sm text-label">
        For this programme you can{" "}
        <span className="font-semibold text-heading">
          {formatQueueMode(offering.queueMode).toLowerCase()}
        </span>
        .
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {hasQueue && (
          <div className="rounded-xl border border-divider bg-row-hover p-4">
            <ListChecks className="h-4 w-4 text-primary" />

            <p className="mt-2 text-sm font-semibold text-heading">
              Walk-in queue
            </p>

            <p className="mt-1 text-xs text-label">
              Join the queue when you visit. About{" "}
              {offering.queueConfig?.capacity ?? "limited"} students can wait at
              a time.
            </p>
          </div>
        )}

        {hasAppointment && (
          <div className="rounded-xl border border-divider bg-row-hover p-4">
            <ClipboardCheck className="h-4 w-4 text-primary" />

            <p className="mt-2 text-sm font-semibold text-heading">
              Book a time slot
            </p>

            <p className="mt-1 text-xs text-label">
              {offering.appointmentConfig?.slotDurationMinutes ?? "Flexible"}
              -minute slots between{" "}
              {formatOperatingHoursRange(
                offering.appointmentConfig?.operatingHoursStart ?? "09:00",

                offering.appointmentConfig?.operatingHoursEnd ?? "17:00",
              )}
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
