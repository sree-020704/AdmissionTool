import path from "path";
import { DOCUMENT_FILE_TYPES } from "../enums/offering.enums.js";

const MIME_BY_TYPE = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
};

const EXTENSION_BY_TYPE = {
  pdf: ".pdf",
  jpg: ".jpg",
  jpeg: ".jpeg",
  png: ".png",
};

/**
 * ------------------------------------------------------------
 * ADMISSION TYPE HELPERS
 * ------------------------------------------------------------
 */

/**
 * Return document requirements configured for the selected
 * admission type.
 *
 * Supported:
 *
 * New:
 *   documentsByAdmissionType: {
 *     regular: [],
 *     transfer: []
 *   }
 *
 * Legacy:
 *   documentRequirements: []
 *
 * For backward compatibility, legacy documentRequirements
 * are treated as Regular documents.
 *
 * @param {import("../modules/offerings/offering.model.js").Offering} offering
 * @param {"REGULAR"|"TRANSFER"} [admissionType="REGULAR"]
 * @returns {Array}
 */
export function getDocumentRequirementsForAdmissionType(
  offering,
  admissionType = "REGULAR",
) {
  const normalizedType = admissionType === "TRANSFER" ? "TRANSFER" : "REGULAR";

  const grouped = offering?.documentsByAdmissionType;

  if (grouped && typeof grouped === "object" && !Array.isArray(grouped)) {
    if (normalizedType === "TRANSFER") {
      return Array.isArray(grouped.transfer) ? grouped.transfer : [];
    }

    return Array.isArray(grouped.regular)
      ? grouped.regular
      : Array.isArray(offering?.documentRequirements)
        ? offering.documentRequirements
        : [];
  }

  return Array.isArray(offering?.documentRequirements)
    ? offering.documentRequirements
    : [];
}

/**
 * Return all configured document requirements.
 *
 * Used when admission type is not available.
 *
 * @param {import("../modules/offerings/offering.model.js").Offering} offering
 * @returns {Array}
 */
export function getConfiguredDocumentRequirements(offering) {
  return getDocumentRequirementsForAdmissionType(offering, "REGULAR");
}

/**
 * ------------------------------------------------------------
 * INTAKE DOCUMENT
 * ------------------------------------------------------------
 */

/**
 * @param {import("../modules/offerings/offering.model.js").Offering["intakeDocument"]} intakeDocument
 */
export function formatIntakeDocumentConfig(intakeDocument) {
  const label = intakeDocument?.label?.trim();

  if (!label) {
    return null;
  }

  return {
    id: intakeDocument._id.toString(),
    label,
    helpText: intakeDocument.helpText?.trim() ?? "",
    required: intakeDocument.required !== false,
    allowedTypes: intakeDocument.allowedTypes?.length
      ? intakeDocument.allowedTypes
      : ["pdf"],
    maxSizeMb: intakeDocument.maxSizeMb ?? 5,
  };
}

/**
 * @param {import("../modules/offerings/offering.model.js").Offering} offering
 */
export function getIntakeDocumentRequirement(offering) {
  const config = formatIntakeDocumentConfig(offering?.intakeDocument);

  if (!config) {
    return null;
  }

  return {
    _id: offering.intakeDocument._id,
    name: config.label,
    required: config.required,
    allowedTypes: config.allowedTypes,
    maxSizeMb: config.maxSizeMb,
  };
}

/**
 * ------------------------------------------------------------
 * FORMAT REQUIREMENTS
 * ------------------------------------------------------------
 */

/**
 * @param {Array} requirements
 */
export function formatDocumentRequirements(requirements = []) {
  return requirements.map((requirement) => ({
    id: requirement._id.toString(),
    name: requirement.name,
    required: requirement.required !== false,
    allowedTypes: requirement.allowedTypes?.length
      ? requirement.allowedTypes
      : ["pdf"],
    maxSizeMb: requirement.maxSizeMb ?? 5,
  }));
}

/**
 * ------------------------------------------------------------
 * FIND REQUIREMENT
 * ------------------------------------------------------------
 */

/**
 * @param {import("../modules/offerings/offering.model.js").Offering} offering
 * @param {string} requirementId
 * @param {"REGULAR"|"TRANSFER"} [admissionType="REGULAR"]
 */
export function findDocumentRequirement(
  offering,
  requirementId,
  admissionType = "REGULAR",
) {
  const requirements = getDocumentRequirementsForAdmissionType(
    offering,
    admissionType,
  );

  if (!requirementId) {
    return undefined;
  }

  return requirements.find(
    (requirement) => requirement?._id?.toString() === requirementId.toString(),
  );
}

/**
 * ------------------------------------------------------------
 * FILE HELPERS
 * ------------------------------------------------------------
 */

/**
 * @param {string} fileName
 */
function getFileExtension(fileName) {
  return path.extname(fileName).replace(".", "").toLowerCase();
}

/**
 * @param {string} mimeType
 */
function getExtensionFromMime(mimeType) {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";

    case "image/jpeg":
      return "jpeg";

    case "image/png":
      return "png";

    default:
      return null;
  }
}

/**
 * ------------------------------------------------------------
 * FILE VALIDATION
 * ------------------------------------------------------------
 */

/**
 * @param {object} requirement
 * @param {Express.Multer.File} file
 */
export function validateUploadedFile(requirement, file) {
  const allowedTypes = requirement?.allowedTypes?.length
    ? requirement.allowedTypes
    : ["pdf"];

  const extension = getFileExtension(file.originalname);

  const mimeExtension = getExtensionFromMime(file.mimetype);

  const normalizedAllowed = allowedTypes.map((type) =>
    String(type).toLowerCase(),
  );

  const extensionAllowed =
    normalizedAllowed.includes(extension) ||
    (mimeExtension && normalizedAllowed.includes(mimeExtension));

  const mimeAllowed = normalizedAllowed.some((type) =>
    (MIME_BY_TYPE[type] ?? []).includes(file.mimetype),
  );

  if (!extensionAllowed && !mimeAllowed) {
    const labels = normalizedAllowed
      .map((type) => type.toUpperCase())
      .join(", ");

    return `Only ${labels} files are allowed for ${requirement.name}`;
  }

  const maxSizeMb = requirement.maxSizeMb ?? 5;

  const maxBytes = maxSizeMb * 1024 * 1024;

  if (file.size > maxBytes) {
    return `${requirement.name} must be ${maxSizeMb} MB or smaller`;
  }

  return null;
}

/**
 * ------------------------------------------------------------
 * UPLOADED DOCUMENT MATCHING
 * ------------------------------------------------------------
 */

/**
 * Determine whether an application document belongs
 * to a requirement.
 *
 * Primary:
 *   requirementId
 *
 * Fallback:
 *   requirementName
 *
 * The name fallback protects older applications where
 * requirement IDs changed after an offering update.
 *
 * @param {object} document
 * @param {object} requirement
 */
function documentMatchesRequirement(document, requirement) {
  if (!document || !requirement) {
    return false;
  }

  const documentRequirementId = document.requirementId?.toString?.() ?? "";

  const requirementId = requirement._id?.toString?.() ?? "";

  if (
    documentRequirementId &&
    requirementId &&
    documentRequirementId === requirementId
  ) {
    return true;
  }

  const documentName = String(document.requirementName ?? "")
    .trim()
    .toLowerCase();

  const requirementName = String(requirement.name ?? "")
    .trim()
    .toLowerCase();

  if (documentName && requirementName && documentName === requirementName) {
    return true;
  }

  return false;
}

/**
 * ------------------------------------------------------------
 * MISSING REQUIRED DOCUMENTS
 * ------------------------------------------------------------
 */

/**
 * @param {import("../modules/offerings/offering.model.js").Offering} offering
 * @param {import("../modules/applications/application.model.js").Application} application
 * @param {"REGULAR"|"TRANSFER"} [admissionType="REGULAR"]
 */
export function getMissingRequiredDocuments(
  offering,
  application,
  admissionType = "REGULAR",
) {
  const requirements = getDocumentRequirementsForAdmissionType(
    offering,
    admissionType,
  );

  const requiredRequirements = requirements.filter(
    (requirement) => requirement?.required !== false,
  );

  if (!requiredRequirements.length) {
    return [];
  }

  const documents = Array.isArray(application?.documents)
    ? application.documents
    : [];

  return requiredRequirements.filter(
    (requirement) =>
      !documents.some((document) =>
        documentMatchesRequirement(document, requirement),
      ),
  );
}

/**
 * ------------------------------------------------------------
 * DOCUMENT UPLOAD PROGRESS
 * ------------------------------------------------------------
 */

/**
 * @param {import("../modules/offerings/offering.model.js").Offering} offering
 * @param {import("../modules/applications/application.model.js").Application} application
 * @param {"REGULAR"|"TRANSFER"} [admissionType="REGULAR"]
 */
export function getDocumentUploadProgress(
  offering,
  application,
  admissionType = "REGULAR",
) {
  const requirements = getDocumentRequirementsForAdmissionType(
    offering,
    admissionType,
  );

  const requiredRequirements = requirements.filter(
    (requirement) => requirement?.required !== false,
  );

  const missingRequired = getMissingRequiredDocuments(
    offering,
    application,
    admissionType,
  );

  return {
    documents: (application?.documents ?? []).map((document) => ({
      id: document?._id?.toString?.(),
      requirementId: document?.requirementId?.toString?.(),
      requirementName: document?.requirementName,
      originalName: document?.originalName,
      storedName: document?.storedName,
      filePath: document?.filePath,
      mimeType: document?.mimeType,
      sizeBytes: document?.sizeBytes,
      uploadedAt: document?.uploadedAt,
    })),

    requiredDocumentCount: requiredRequirements.length,

    uploadedRequiredCount: requiredRequirements.length - missingRequired.length,

    missingRequiredDocuments: missingRequired.map((requirement) => ({
      id: requirement?._id?.toString?.(),
      name: requirement?.name,
    })),

    documentsComplete: missingRequired.length === 0,
  };
}

/**
 * ------------------------------------------------------------
 * ACCEPT ATTRIBUTE
 * ------------------------------------------------------------
 */

/**
 * @param {string[]} allowedTypes
 */
export function buildAcceptAttribute(allowedTypes = ["pdf"]) {
  const normalized = allowedTypes.length ? allowedTypes : ["pdf"];

  const extensions = normalized
    .map((type) => EXTENSION_BY_TYPE[type.toLowerCase()])
    .filter(Boolean);

  const mimeTypes = normalized.flatMap(
    (type) => MIME_BY_TYPE[type.toLowerCase()] ?? [],
  );

  return [...new Set([...mimeTypes, ...extensions])].join(",");
}

/**
 * @param {string} type
 */
export function isAllowedDocumentType(type) {
  return DOCUMENT_FILE_TYPES.includes(type);
}

/**
 * ------------------------------------------------------------
 * APPLICATION DOCUMENT
 * ------------------------------------------------------------
 */

/**
 * @param {import("../modules/applications/application.model.js").Application} application
 * @param {string} documentId
 */
export function findApplicationDocument(application, documentId) {
  if (!application || !documentId) {
    return undefined;
  }

  return application.documents?.find(
    (document) => document?._id?.toString?.() === documentId.toString(),
  );
}
