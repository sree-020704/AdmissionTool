import { useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileUp,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { DocumentPreviewModal } from "@/components/services/DocumentPreviewModal";

import {
  buildAcceptAttribute,
  formatFileSize,
  getDocumentProgressLabel,
  getMissingRequiredDocuments,
  getUploadedDocumentMap,
  validateFileForRequirement,
} from "@/utils/applicationDocuments";

import {
  downloadStudentDocument,
  isPreviewableMimeType,
} from "@/utils/documentFile";

/**
 * ------------------------------------------------------------
 * ADMISSION TYPE HELPERS
 * ------------------------------------------------------------
 */

function normalizeAdmissionType(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase() === "TRANSFER"
    ? "TRANSFER"
    : "REGULAR";
}

function getAdmissionLabel(admissionType) {
  return admissionType === "TRANSFER"
    ? "Transfer Admission"
    : "Regular Admission";
}

/**
 * Get the document requirements for the selected
 * admission type.
 *
 * Backward compatibility:
 *
 * Old offering:
 *   documentRequirements
 *
 * is treated as Regular Admission.
 */
function getDocumentsForAdmissionType(offering, admissionType) {
  const type = normalizeAdmissionType(admissionType);

  const grouped = offering?.documentsByAdmissionType;

  if (grouped && typeof grouped === "object" && !Array.isArray(grouped)) {
    if (type === "TRANSFER") {
      return Array.isArray(grouped.transfer) ? grouped.transfer : [];
    }

    return Array.isArray(grouped.regular)
      ? grouped.regular
      : (offering?.documentRequirements ?? []);
  }

  /*
   * Existing project structure.
   */
  if (type === "TRANSFER") {
    return [];
  }

  return offering?.documentRequirements ?? [];
}

/**
 * ------------------------------------------------------------
 * DOCUMENT ROW
 * ------------------------------------------------------------
 */

function DocumentUploadRow({
  requirement,
  uploadedDocument,
  canEdit,
  uploading,
  onUpload,
  onRemove,
  onPreview,
  onDownload,
}) {
  const inputRef = useRef(null);

  const [selectedName, setSelectedName] = useState("");

  const handleChoose = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    /*
     * Reset input so selecting the same file again
     * still fires the change event.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateFileForRequirement(file, requirement);

    if (validationError) {
      toast.error(validationError);

      return;
    }

    setSelectedName(file.name);

    try {
      await onUpload(requirement.id, file);

      setSelectedName("");
    } catch {
      setSelectedName("");
    }
  };

  const isUploaded = Boolean(uploadedDocument);

  return (
    <div className="rounded-xl border border-[#E2EEE8] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isUploaded ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0A6640]" />
            ) : (
              <FileUp className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
            )}

            <p className="text-sm font-semibold text-[#052E1C]">
              {requirement.name}
            </p>

            {requirement.required !== false ? (
              <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#92400E]">
                Required
              </span>
            ) : (
              <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
                Optional
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-[#4B6358]">
            Accepted:{" "}
            {(requirement.allowedTypes ?? ["pdf"])
              .map((type) => type.toUpperCase())
              .join(", ")}
            {" · "}
            Max {requirement.maxSizeMb ?? 5} MB
          </p>

          {isUploaded ? (
            <p className="mt-2 text-xs font-medium text-[#0A6640]">
              Uploaded: {uploadedDocument.originalName} (
              {formatFileSize(uploadedDocument.sizeBytes)})
            </p>
          ) : selectedName ? (
            <p className="mt-2 text-xs text-[#4B6358]">
              Selected: {selectedName}
            </p>
          ) : (
            <p className="mt-2 text-xs text-[#92400E]">Not uploaded yet</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isUploaded ? (
            <>
              {isPreviewableMimeType(uploadedDocument.mimeType) ? (
                <button
                  type="button"
                  onClick={() => onPreview(uploadedDocument)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-white px-3 text-xs font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => onDownload(uploadedDocument)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-white px-3 text-xs font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </>
          ) : null}

          {canEdit ? (
            <>
              <button
                type="button"
                onClick={handleChoose}
                disabled={uploading}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-[#F0FAF5] px-3 text-xs font-semibold text-[#0A6640] hover:bg-[#E3F5EC] disabled:opacity-60"
              >
                <UploadCloud className="h-3.5 w-3.5" />

                {isUploaded ? "Replace" : "Upload"}
              </button>

              {isUploaded ? (
                <button
                  type="button"
                  onClick={() => onRemove(requirement.id)}
                  disabled={uploading}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              ) : null}

              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={buildAcceptAttribute(requirement.allowedTypes)}
                onChange={handleFileChange}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * ------------------------------------------------------------
 * MAIN COMPONENT
 * ------------------------------------------------------------
 */

export function ApplicationDocumentUpload({
  serviceId,
  offeringId,
  offering,
  application,
  onUpload,
  onRemove,
  onRefresh,

  /*
   * New prop.
   *
   * The parent can explicitly pass:
   *
   *   REGULAR
   *   TRANSFER
   *
   * If it doesn't, the component uses the application's
   * admissionType and finally falls back to REGULAR.
   */
  admissionType,
}) {
  const [uploadingId, setUploadingId] = useState(null);

  const [previewDocument, setPreviewDocument] = useState(null);

  /**
   * Resolve selected admission type.
   */
  const selectedAdmissionType = normalizeAdmissionType(
    admissionType ??
      application?.admissionType ??
      offering?.admissionType ??
      "REGULAR",
  );

  /**
   * Select ONLY the documents belonging
   * to the selected admission type.
   */
  const requirements = getDocumentsForAdmissionType(
    offering,
    selectedAdmissionType,
  );

  /**
   * Existing application documents.
   */
  const uploadedMap = getUploadedDocumentMap(application);

  /**
   * Whether student can modify documents.
   */
  const canEdit =
    application?.status === "draft" ||
    application?.status === "needs_correction";

  /**
   * Calculate missing documents from the
   * currently selected admission type.
   */
  const missingRequired = getMissingRequiredDocuments(
    {
      ...offering,
      documentRequirements: requirements,
    },
    application,
  );

  /**
   * Calculate progress from the
   * currently selected admission type.
   */
  const progressLabel = getDocumentProgressLabel(
    {
      ...offering,
      documentRequirements: requirements,
    },
    application,
  );

  /**
   * No documents for selected admission type.
   */
  if (!requirements.length) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[#D1EEE0] bg-[#F9FCFB] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#10B981]">
            {getAdmissionLabel(selectedAdmissionType)}
          </p>

          <p className="mt-1 text-sm text-[#4B6358]">
            No documents are configured for this admission type.
          </p>
        </div>
      </div>
    );
  }

  /**
   * ----------------------------------------------------------
   * UPLOAD
   * ----------------------------------------------------------
   */

  const handleUpload = async (requirementId, file) => {
    setUploadingId(requirementId);

    try {
      await onUpload(requirementId, file);

      toast.success("Document uploaded");

      await onRefresh?.();
    } catch (err) {
      /*
       * IMPORTANT:
       *
       * Backend errors such as:
       *
       * Wrong document uploaded.
       * Required: "AadharId".
       * Detected: "Marksheet".
       *
       * should be displayed to the student.
       */
      toast.error(
        err?.response?.data?.message ??
          err?.message ??
          "Could not upload document",
      );

      throw err;
    } finally {
      setUploadingId(null);
    }
  };

  /**
   * ----------------------------------------------------------
   * REMOVE
   * ----------------------------------------------------------
   */

  const handleRemove = async (requirementId) => {
    setUploadingId(requirementId);

    try {
      await onRemove(requirementId);

      toast.success("Document removed");

      await onRefresh?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          err?.message ??
          "Could not remove document",
      );
    } finally {
      setUploadingId(null);
    }
  };

  /**
   * ----------------------------------------------------------
   * DOWNLOAD
   * ----------------------------------------------------------
   */

  const handleDownload = async (document) => {
    try {
      await downloadStudentDocument(serviceId, offeringId, document, true);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          err?.message ??
          "Could not download document",
      );
    }
  };

  /**
   * ----------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------
   */

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#052E1C]">
              Upload your documents
            </p>

            <p className="mt-1 text-xs text-[#4B6358]">
              {canEdit
                ? `Upload every required document for ${getAdmissionLabel(
                    selectedAdmissionType,
                  )} before you submit your request.`
                : `View or download the documents attached to your ${getAdmissionLabel(
                    selectedAdmissionType,
                  )} request.`}
            </p>
          </div>

          <span
            className={
              missingRequired.length === 0
                ? "rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#0A6640]"
                : "rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]"
            }
          >
            {progressLabel}
          </span>
        </div>

        <div className="rounded-xl border border-[#D1EEE0] bg-[#F9FCFB] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
            Admission type
          </p>

          <p className="mt-1 text-sm font-semibold text-[#052E1C]">
            {getAdmissionLabel(selectedAdmissionType)}
          </p>

          <p className="mt-1 text-xs text-[#4B6358]">
            Only document requirements for this admission type are shown.
          </p>
        </div>

        <div className="space-y-3">
          {requirements.map((requirement) => (
            <DocumentUploadRow
              key={requirement.id ?? requirement._id ?? requirement.name}
              requirement={{
                ...requirement,

                /*
                 * Normalise MongoDB _id for components
                 * that expect requirement.id.
                 */
                id: requirement.id ?? requirement._id,
              }}
              uploadedDocument={
                uploadedMap.get(String(requirement.id ?? requirement._id)) ??
                uploadedMap.get(requirement._id)
              }
              canEdit={canEdit}
              uploading={
                uploadingId === String(requirement.id ?? requirement._id)
              }
              onUpload={handleUpload}
              onRemove={handleRemove}
              onPreview={setPreviewDocument}
              onDownload={handleDownload}
            />
          ))}
        </div>

        {canEdit && missingRequired.length > 0 ? (
          <p className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
            Still needed: {missingRequired.map((item) => item.name).join(", ")}
          </p>
        ) : null}
      </div>

      <DocumentPreviewModal
        open={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
        serviceId={serviceId}
        offeringId={offeringId}
        onDownload={handleDownload}
      />
    </>
  );
}
