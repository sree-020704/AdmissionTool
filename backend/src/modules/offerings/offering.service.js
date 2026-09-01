import { Offering } from "./offering.model.js";
import { Service } from "../services/service.model.js";
import { Application } from "../applications/application.model.js";
import { AppError } from "../../core/utils/AppError.js";
import { OFFERING_STATUS } from "../../shared/enums/offering.enums.js";

import {
  deriveOfferingStatus,
  getOfferingCompleteness,
  resolveOfferingDisplayStatus,
} from "../../shared/helpers/offeringCompleteness.helper.js";

import {
  normalizeWorkflowSteps,
  validateWorkflowSteps,
} from "../../shared/helpers/workflow.helper.js";

import { syncServiceActiveStatus } from "../services/service.service.js";
import { enqueueServiceReindex } from "../../core/queues/embedding.queue.js";
import { validateOperatingHoursWindow } from "../../shared/helpers/operatingHours.helper.js";

import { ensureUniqueApplicantFieldKeys } from "../../shared/helpers/applicantFields.helper.js";

import { cachedRead } from "../../shared/helpers/cachedRead.helper.js";
import { cacheNs } from "../../shared/constants/cacheKeys.js";
import { flushInstituteReadCache } from "../../shared/helpers/cacheInvalidation.helper.js";

import {
  ADMISSION_TYPES,
  normalizeAdmissionType,
} from "../../shared/helpers/admissionType.helper.js";

/**
 * Schedule AI/vector re-indexing after an offering changes.
 */
async function scheduleOfferingReindex(offering) {
  await enqueueServiceReindex(
    offering.instituteId.toString(),
    offering.serviceId.toString(),
    "offering-update",
  );
}

/**
 * Apply payment configuration.
 */
function applyPaymentConfig(offering, paymentConfig) {
  if (!paymentConfig?.enabled) {
    offering.paymentConfig = {
      enabled: false,
    };
  } else {
    offering.paymentConfig = {
      enabled: true,
      amount: paymentConfig.amount,
      currency: paymentConfig.currency ?? "INR",
      label: paymentConfig.label?.trim() || "Service fee",
      timing: paymentConfig.timing ?? "before_submit",
      workflowStepId:
        paymentConfig.timing === "workflow_step"
          ? paymentConfig.workflowStepId?.trim() || undefined
          : undefined,
    };
  }

  offering.markModified("paymentConfig");
}

/**
 * ---------------------------------------------------------
 * ADMISSION TYPE HELPERS
 * ---------------------------------------------------------
 */

/**
 * Get grouped eligibility rules from an offering.
 *
 * Supports:
 *
 * eligibilityByAdmissionType: {
 *   regular: [],
 *   transfer: []
 * }
 *
 * and legacy:
 *
 * eligibilityRules: []
 */
function getGroupedEligibilityRules(offering) {
  const grouped = offering?.eligibilityByAdmissionType;

  if (grouped && typeof grouped === "object" && !Array.isArray(grouped)) {
    return {
      regular: Array.isArray(grouped.regular) ? grouped.regular : [],
      transfer: Array.isArray(grouped.transfer) ? grouped.transfer : [],
    };
  }

  return {
    regular: Array.isArray(offering?.eligibilityRules)
      ? offering.eligibilityRules
      : [],
    transfer: [],
  };
}

/**
 * Get grouped document requirements.
 *
 * Supports:
 *
 * documentsByAdmissionType: {
 *   regular: [],
 *   transfer: []
 * }
 *
 * and legacy:
 *
 * documentRequirements: []
 */
function getGroupedDocumentRequirements(offering) {
  const grouped = offering?.documentsByAdmissionType;

  if (grouped && typeof grouped === "object" && !Array.isArray(grouped)) {
    return {
      regular: Array.isArray(grouped.regular) ? grouped.regular : [],
      transfer: Array.isArray(grouped.transfer) ? grouped.transfer : [],
    };
  }

  return {
    regular: Array.isArray(offering?.documentRequirements)
      ? offering.documentRequirements
      : [],
    transfer: [],
  };
}

/**
 * Normalize rules input.
 *
 * This supports both:
 *
 * updateEligibilityRules(id, instituteId, rules)
 *
 * and:
 *
 * updateEligibilityRules(id, instituteId, {
 *   admissionType: 'TRANSFER',
 *   rules: [...]
 * })
 */
function normalizeRulesPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      admissionType: ADMISSION_TYPES.REGULAR,
      rules: payload,
    };
  }

  return {
    admissionType: normalizeAdmissionType(payload?.admissionType),
    rules: Array.isArray(payload?.rules) ? payload.rules : [],
  };
}

/**
 * Normalize documents input.
 *
 * Supports both:
 *
 * updateDocumentRequirements(id, instituteId, requirements)
 *
 * and:
 *
 * updateDocumentRequirements(id, instituteId, {
 *   admissionType: 'TRANSFER',
 *   requirements: [...]
 * })
 */
function normalizeDocumentsPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      admissionType: ADMISSION_TYPES.REGULAR,
      requirements: payload,
    };
  }

  return {
    admissionType: normalizeAdmissionType(payload?.admissionType),
    requirements: Array.isArray(payload?.requirements)
      ? payload.requirements
      : [],
  };
}

/**
 * ---------------------------------------------------------
 * FORMAT OFFERING
 * ---------------------------------------------------------
 */

/**
 * @param {import('./offering.model.js').Offering} doc
 */
function formatOffering(doc) {
  const completeness = getOfferingCompleteness(doc);

  const eligibilityByAdmissionType = getGroupedEligibilityRules(doc);

  const documentsByAdmissionType = getGroupedDocumentRequirements(doc);

  return {
    id: doc._id.toString(),

    instituteId: doc.instituteId.toString(),

    serviceId: doc.serviceId.toString(),

    name: doc.name,

    description: doc.description ?? "",

    visitLocation: doc.visitLocation ?? "",

    visitInstructions: doc.visitInstructions ?? "",

    status: resolveOfferingDisplayStatus(doc),

    startDate: doc.startDate,

    endDate: doc.endDate,

    configurationVersion: doc.configurationVersion,

    /*
     * -----------------------------------------------------
     * BACKWARD COMPATIBLE REGULAR RULES
     * -----------------------------------------------------
     */
    eligibilityRules:
      doc.eligibilityRules ?? eligibilityByAdmissionType.regular ?? [],

    documentRequirements:
      doc.documentRequirements ?? documentsByAdmissionType.regular ?? [],

    /*
     * -----------------------------------------------------
     * NEW ADMISSION TYPE CONFIGURATION
     * -----------------------------------------------------
     */
    eligibilityByAdmissionType: {
      regular: eligibilityByAdmissionType.regular,
      transfer: eligibilityByAdmissionType.transfer,
    },

    documentsByAdmissionType: {
      regular: documentsByAdmissionType.regular,
      transfer: documentsByAdmissionType.transfer,
    },

    workflowSteps: doc.workflowSteps ?? [],

    queueMode: doc.queueMode ?? null,

    queueConfig: doc.queueConfig ?? null,

    appointmentConfig: doc.appointmentConfig ?? null,

    applicantFields: doc.applicantFields ?? [],

    intakeDocument: doc.intakeDocument?.label?.trim()
      ? {
          id: doc.intakeDocument._id.toString(),
          label: doc.intakeDocument.label,
          helpText: doc.intakeDocument.helpText ?? "",
          required: doc.intakeDocument.required !== false,
          allowedTypes: doc.intakeDocument.allowedTypes ?? ["pdf"],
          maxSizeMb: doc.intakeDocument.maxSizeMb ?? 5,
        }
      : null,

    paymentConfig: doc.paymentConfig?.enabled
      ? {
          enabled: true,
          amount: doc.paymentConfig.amount,
          currency: doc.paymentConfig.currency ?? "INR",
          label: doc.paymentConfig.label ?? "Service fee",
          timing: doc.paymentConfig.timing ?? "before_submit",
          workflowStepId: doc.paymentConfig.workflowStepId ?? null,
        }
      : {
          enabled: false,
        },

    hasAiSuggestions: Boolean(doc.aiSuggestions),

    completeness,

    activatedAt: doc.activatedAt,

    createdAt: doc.createdAt,

    updatedAt: doc.updatedAt,
  };
}

/**
 * ---------------------------------------------------------
 * GET OFFERING
 * ---------------------------------------------------------
 */

async function getOfferingDoc(offeringId, instituteId) {
  const offering = await Offering.findOne({
    _id: offeringId,
    instituteId,
  });

  if (!offering) {
    throw new AppError("Offering not found", 404);
  }

  return offering;
}

/**
 * ---------------------------------------------------------
 * LIST
 * ---------------------------------------------------------
 */

/**
 * @param {string} instituteId
 * @param {string} [serviceId]
 */
async function loadOfferingsList(instituteId, serviceId) {
  const filter = {
    instituteId,
  };

  if (serviceId) {
    filter.serviceId = serviceId;
  }

  const offerings = await Offering.find(filter).sort({
    createdAt: -1,
  });

  return offerings.map(formatOffering);
}

/**
 * @param {string} instituteId
 * @param {string} [serviceId]
 */
export async function listOfferings(instituteId, serviceId) {
  return cachedRead(
    cacheNs.OFFERINGS_LIST,
    [instituteId, serviceId ?? "all"],
    () => loadOfferingsList(instituteId, serviceId),
  );
}

/**
 * ---------------------------------------------------------
 * CREATE
 * ---------------------------------------------------------
 */

/**
 * @param {string} instituteId
 * @param {{ name: string, serviceId: string }} payload
 */
export async function createOffering(instituteId, payload) {
  const service = await Service.findOne({
    _id: payload.serviceId,
    instituteId,
  });

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  const offering = await Offering.create({
    instituteId,

    serviceId: payload.serviceId,

    name: payload.name.trim(),

    status: OFFERING_STATUS.DRAFT,

    /*
     * New admission-type configuration.
     *
     * Existing offerings are still supported.
     */
    eligibilityByAdmissionType: {
      regular: [],
      transfer: [],
    },

    documentsByAdmissionType: {
      regular: [],
      transfer: [],
    },
  });

  await scheduleOfferingReindex(offering);

  await flushInstituteReadCache(instituteId);

  return formatOffering(offering);
}

/**
 * ---------------------------------------------------------
 * GET BY ID
 * ---------------------------------------------------------
 */

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function getOfferingById(offeringId, instituteId) {
  return cachedRead(
    cacheNs.OFFERING_DETAIL,
    [instituteId, offeringId],
    async () => formatOffering(await getOfferingDoc(offeringId, instituteId)),
  );
}

/**
 * ---------------------------------------------------------
 * UPDATE OFFERING
 * ---------------------------------------------------------
 */

/**
 * @param {string} offeringId
 * @param {string} instituteId
 * @param {Object} payload
 */
export async function updateOffering(offeringId, instituteId, payload) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  if (payload.name) {
    offering.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    offering.description = payload.description?.trim() || "";
  }

  if (payload.visitLocation !== undefined) {
    offering.visitLocation = payload.visitLocation?.trim() || "";
  }

  if (payload.visitInstructions !== undefined) {
    offering.visitInstructions = payload.visitInstructions?.trim() || "";
  }

  if (payload.startDate !== undefined) {
    offering.startDate = payload.startDate ? new Date(payload.startDate) : null;
  }

  if (payload.endDate !== undefined) {
    offering.endDate = payload.endDate ? new Date(payload.endDate) : null;
  }

  if (payload.status) {
    offering.status = payload.status;
  }

  offering.status = deriveOfferingStatus(offering);

  await offering.save();

  await scheduleOfferingReindex(offering);

  await flushInstituteReadCache(instituteId);

  return formatOffering(offering);
}

/**
 * ---------------------------------------------------------
 * UPDATE DETAILS
 * ---------------------------------------------------------
 */

/**
 * @param {string} offeringId
 * @param {string} instituteId
 * @param {Object} payload
 */
export async function updateOfferingDetails(offeringId, instituteId, payload) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  if (payload.name) {
    offering.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    offering.description = payload.description?.trim() || "";
  }

  if (payload.visitLocation !== undefined) {
    offering.visitLocation = payload.visitLocation?.trim() || "";
  }

  if (payload.visitInstructions !== undefined) {
    offering.visitInstructions = payload.visitInstructions?.trim() || "";
  }

  if (payload.startDate !== undefined) {
    offering.startDate = payload.startDate ? new Date(payload.startDate) : null;
  }

  if (payload.endDate !== undefined) {
    offering.endDate = payload.endDate ? new Date(payload.endDate) : null;
  }

  if (payload.applicantFields !== undefined) {
    const labels = payload.applicantFields.map((field) =>
      field.label.trim().toLowerCase(),
    );

    if (new Set(labels).size !== labels.length) {
      throw new AppError(
        "Duplicate applicant field labels are not allowed",
        400,
      );
    }

    offering.applicantFields = ensureUniqueApplicantFieldKeys(
      payload.applicantFields,
    );
  }

  if (payload.intakeDocument !== undefined) {
    const label = payload.intakeDocument?.label?.trim() ?? "";

    if (!label) {
      offering.intakeDocument = undefined;
    } else {
      if (!offering.intakeDocument) {
        offering.intakeDocument = {};
      }

      offering.intakeDocument.label = label;

      offering.intakeDocument.helpText =
        payload.intakeDocument.helpText?.trim() ?? "";

      offering.intakeDocument.required =
        payload.intakeDocument.required !== false;

      offering.intakeDocument.allowedTypes = payload.intakeDocument.allowedTypes
        ?.length
        ? payload.intakeDocument.allowedTypes
        : ["pdf"];

      offering.intakeDocument.maxSizeMb = payload.intakeDocument.maxSizeMb ?? 5;

      offering.markModified("intakeDocument");
    }
  }

  if (payload.paymentConfig !== undefined) {
    applyPaymentConfig(offering, payload.paymentConfig);
  }

  offering.configurationVersion += 1;

  offering.status = deriveOfferingStatus(offering);

  await offering.save();

  await scheduleOfferingReindex(offering);

  await flushInstituteReadCache(instituteId);

  return formatOffering(offering);
}

/**
 * ---------------------------------------------------------
 * PAYMENT
 * ---------------------------------------------------------
 */

/**
 * @param {string} offeringId
 * @param {string} instituteId
 * @param {Object} paymentConfig
 */
export async function updateOfferingPayment(
  offeringId,
  instituteId,
  paymentConfig,
) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  applyPaymentConfig(offering, paymentConfig);

  offering.configurationVersion += 1;

  offering.status = deriveOfferingStatus(offering);

  await offering.save();

  await scheduleOfferingReindex(offering);

  await flushInstituteReadCache(instituteId);

  return formatOffering(offering);
}

/**
 * ---------------------------------------------------------
 * ELIGIBILITY RULES
 * ---------------------------------------------------------
 *
 * Supports:
 *
 * updateEligibilityRules(
 *   id,
 *   instituteId,
 *   [...]
 * )
 *
 * -> REGULAR
 *
 * OR
 *
 * updateEligibilityRules(
 *   id,
 *   instituteId,
 *   {
 *     admissionType: "TRANSFER",
 *     rules: [...]
 *   }
 * )
 *
 * -> TRANSFER
 */
export async function updateEligibilityRules(offeringId, instituteId, payload) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  const { admissionType, rules } = normalizeRulesPayload(payload);

  if (!Array.isArray(rules)) {
    throw new AppError("Eligibility rules must be an array", 400);
  }

  /*
   * Validate duplicate rule fields.
   *
   * This prevents accidental duplicate
   * configuration for the same field/operator.
   */
  const ruleKeys = rules.map(
    (rule) =>
      `${String(rule.field).trim().toLowerCase()}::${String(rule.operator)
        .trim()
        .toLowerCase()}`,
  );

  if (new Set(ruleKeys).size !== ruleKeys.length) {
    throw new AppError(
      `Duplicate eligibility rules are not allowed for ${admissionType.toLowerCase()} admission`,
      400,
    );
  }

  /*
   * Make sure grouped structure exists.
   */
  if (
    !offering.eligibilityByAdmissionType ||
    typeof offering.eligibilityByAdmissionType !== "object"
  ) {
    offering.eligibilityByAdmissionType = {
      regular: Array.isArray(offering.eligibilityRules)
        ? offering.eligibilityRules
        : [],
      transfer: [],
    };
  }

  /*
   * Update only the selected admission type.
   *
   * IMPORTANT:
   * Updating TRANSFER will NOT overwrite REGULAR.
   */
  if (admissionType === ADMISSION_TYPES.TRANSFER) {
    offering.eligibilityByAdmissionType.transfer = rules;

    offering.markModified("eligibilityByAdmissionType.transfer");
  } else {
    offering.eligibilityByAdmissionType.regular = rules;

    /*
     * Keep old eligibilityRules field
     * synchronized with REGULAR rules.
     */
    offering.eligibilityRules = rules;

    offering.markModified("eligibilityByAdmissionType.regular");

    offering.markModified("eligibilityRules");
  }

  offering.configurationVersion += 1;

  offering.status = deriveOfferingStatus(offering);

  await offering.save();

  await scheduleOfferingReindex(offering);

  await flushInstituteReadCache(instituteId);

  return formatOffering(offering);
}

/**
 * ---------------------------------------------------------
 * DOCUMENT REQUIREMENTS
 * ---------------------------------------------------------
 *
 * Supports:
 *
 * updateDocumentRequirements(
 *   id,
 *   instituteId,
 *   [...]
 * )
 *
 * -> REGULAR
 *
 * OR:
 *
 * updateDocumentRequirements(
 *   id,
 *   instituteId,
 *   {
 *     admissionType: "TRANSFER",
 *     requirements: [...]
 *   }
 * )
 *
 * -> TRANSFER
 */
export async function updateDocumentRequirements(
  offeringId,
  instituteId,
  payload,
) {
  const { admissionType, requirements } = normalizeDocumentsPayload(payload);

  if (!Array.isArray(requirements)) {
    throw new AppError("Document requirements must be an array", 400);
  }

  /*
   * Duplicate document names are not allowed
   * within the SAME admission type.
   *
   * Example:
   *
   * Regular:
   *   Aadhar
   *   Transfer Certificate
   *
   * Transfer:
   *   Aadhar
   *   Transfer Certificate
   *
   * This is completely valid because the
   * two lists are separate.
   */
  const names = requirements.map((requirement) =>
    requirement.name.trim().toLowerCase(),
  );

  if (new Set(names).size !== names.length) {
    throw new AppError(
      `Duplicate document names are not allowed for ${admissionType.toLowerCase()} admission`,
      400,
    );
  }

  const offering = await getOfferingDoc(offeringId, instituteId);

  /*
   * Create grouped structure if an
   * old offering does not have it.
   */
  if (
    !offering.documentsByAdmissionType ||
    typeof offering.documentsByAdmissionType !== "object"
  ) {
    offering.documentsByAdmissionType = {
      regular: Array.isArray(offering.documentRequirements)
        ? offering.documentRequirements
        : [],
      transfer: [],
    };
  }

  /*
   * Update ONLY the selected admission type.
   */
  if (admissionType === ADMISSION_TYPES.TRANSFER) {
    offering.documentsByAdmissionType.transfer = requirements;

    offering.markModified("documentsByAdmissionType.transfer");
  } else {
    offering.documentsByAdmissionType.regular = requirements;

    /*
     * Keep old field synchronized
     * with Regular documents.
     */
    offering.documentRequirements = requirements;

    offering.markModified("documentsByAdmissionType.regular");

    offering.markModified("documentRequirements");
  }

  offering.configurationVersion += 1;

  offering.status = deriveOfferingStatus(offering);

  await offering.save();

  await scheduleOfferingReindex(offering);

  await flushInstituteReadCache(instituteId);

  return formatOffering(offering);
}

/**
 * ---------------------------------------------------------
 * GET ELIGIBILITY BY ADMISSION TYPE
 * ---------------------------------------------------------
 *
 * Useful for the student application side.
 */
export async function getEligibilityRules(
  offeringId,
  instituteId,
  admissionType = ADMISSION_TYPES.REGULAR,
) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  const grouped = getGroupedEligibilityRules(offering);

  const type = normalizeAdmissionType(admissionType);

  return type === ADMISSION_TYPES.TRANSFER ? grouped.transfer : grouped.regular;
}

/**
 * ---------------------------------------------------------
 * GET DOCUMENTS BY ADMISSION TYPE
 * ---------------------------------------------------------
 *
 * Useful for the student application side.
 */
export async function getDocumentRequirements(
  offeringId,
  instituteId,
  admissionType = ADMISSION_TYPES.REGULAR,
) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  const grouped = getGroupedDocumentRequirements(offering);

  const type = normalizeAdmissionType(admissionType);

  return type === ADMISSION_TYPES.TRANSFER ? grouped.transfer : grouped.regular;
}

/**
 * ---------------------------------------------------------
 * WORKFLOW
 * ---------------------------------------------------------
 */

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function updateWorkflow(offeringId, instituteId, steps) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  offering.workflowSteps = validateWorkflowSteps(steps);

  offering.configurationVersion += 1;

  offering.status = deriveOfferingStatus(offering);

  await offering.save();

  await scheduleOfferingReindex(offering);

  await flushInstituteReadCache(instituteId);

  return formatOffering(offering);
}

/**
 * ---------------------------------------------------------
 * QUEUE
 * ---------------------------------------------------------
 */

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function updateQueueConfig(offeringId, instituteId, payload) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  offering.queueMode = payload.queueMode;

  offering.queueConfig = payload.queueConfig ?? undefined;

  if (payload.appointmentConfig) {
    const hours = validateOperatingHoursWindow(
      payload.appointmentConfig.operatingHoursStart,
      payload.appointmentConfig.operatingHoursEnd,
    );

    offering.appointmentConfig = {
      ...payload.appointmentConfig,

      operatingHoursStart:
        hours.start ?? payload.appointmentConfig.operatingHoursStart,

      operatingHoursEnd:
        hours.end ?? payload.appointmentConfig.operatingHoursEnd,
    };
  } else {
    offering.appointmentConfig = undefined;
  }

  offering.configurationVersion += 1;

  offering.status = deriveOfferingStatus(offering);

  await offering.save();

  await scheduleOfferingReindex(offering);

  await flushInstituteReadCache(instituteId);

  return formatOffering(offering);
}

/**
 * ---------------------------------------------------------
 * ACTIVATE
 * ---------------------------------------------------------
 */

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function activateOffering(offeringId, instituteId) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  const completeness = getOfferingCompleteness(offering);

  if (!completeness.isComplete) {
    throw new AppError("Offering configuration is incomplete", 400, [
      {
        missing: completeness.missing,
      },
    ]);
  }

  if (offering.endDate && offering.endDate < new Date()) {
    throw new AppError("Cannot activate an expired offering", 400);
  }

  offering.status = OFFERING_STATUS.ACTIVE;

  offering.activatedAt = new Date();

  await offering.save();

  await syncServiceActiveStatus(offering.serviceId.toString(), instituteId);

  await scheduleOfferingReindex(offering);

  await flushInstituteReadCache(instituteId);

  return formatOffering(offering);
}

/**
 * ---------------------------------------------------------
 * DUPLICATE
 * ---------------------------------------------------------
 */

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function duplicateOffering(offeringId, instituteId) {
  const source = await getOfferingDoc(offeringId, instituteId);

  const groupedEligibility = getGroupedEligibilityRules(source);

  const groupedDocuments = getGroupedDocumentRequirements(source);

  const copy = await Offering.create({
    instituteId,

    serviceId: source.serviceId,

    name: `${source.name} (Copy)`,

    status: OFFERING_STATUS.INCOMPLETE,

    /*
     * Backward-compatible fields.
     */
    eligibilityRules: groupedEligibility.regular,

    documentRequirements: groupedDocuments.regular,

    /*
     * New admission-type fields.
     */
    eligibilityByAdmissionType: {
      regular: groupedEligibility.regular,

      transfer: groupedEligibility.transfer,
    },

    documentsByAdmissionType: {
      regular: groupedDocuments.regular,

      transfer: groupedDocuments.transfer,
    },

    workflowSteps: normalizeWorkflowSteps(source.workflowSteps ?? []),

    queueMode: source.queueMode,

    queueConfig: source.queueConfig,

    appointmentConfig: source.appointmentConfig,

    applicantFields: source.applicantFields,

    intakeDocument: source.intakeDocument,

    paymentConfig: source.paymentConfig,

    description: source.description,

    visitLocation: source.visitLocation,

    visitInstructions: source.visitInstructions,

    configurationVersion: 1,
  });

  copy.status = deriveOfferingStatus(copy);

  await copy.save();

  await scheduleOfferingReindex(copy);

  await flushInstituteReadCache(instituteId);

  return formatOffering(copy);
}

/**
 * ---------------------------------------------------------
 * BULK ACTION
 * ---------------------------------------------------------
 */

/**
 * @param {string} instituteId
 * @param {{ offeringIds: string[], action: string }} payload
 */
export async function bulkOfferingAction(instituteId, payload) {
  const statusMap = {
    enable: OFFERING_STATUS.ACTIVE,

    disable: OFFERING_STATUS.DISABLED,

    archive: OFFERING_STATUS.ARCHIVED,
  };

  const targetStatus = statusMap[payload.action];

  const results = [];

  for (const id of payload.offeringIds) {
    const offering = await Offering.findOne({
      _id: id,
      instituteId,
    });

    if (!offering) {
      continue;
    }

    if (payload.action === "enable") {
      const completeness = getOfferingCompleteness(offering);

      if (!completeness.isComplete) {
        results.push({
          id,

          success: false,

          message: "Configuration incomplete",
        });

        continue;
      }

      offering.status = OFFERING_STATUS.ACTIVE;

      offering.activatedAt = new Date();
    } else {
      offering.status = targetStatus;
    }

    await offering.save();

    await syncServiceActiveStatus(offering.serviceId.toString(), instituteId);

    results.push({
      id,
      success: true,
    });
  }

  await flushInstituteReadCache(instituteId);

  return {
    results,
  };
}

/**
 * ---------------------------------------------------------
 * DELETE
 * ---------------------------------------------------------
 */

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function deleteOffering(offeringId, instituteId) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  const requestCount = await Application.countDocuments({
    offeringId: offering._id,
  });

  if (requestCount > 0) {
    throw new AppError(
      "This service option cannot be deleted because students have already submitted requests for it",
      400,
    );
  }

  const serviceId = offering.serviceId.toString();

  await Offering.deleteOne({
    _id: offeringId,
  });

  await syncServiceActiveStatus(serviceId, instituteId);

  await flushInstituteReadCache(instituteId);

  return {
    id: offeringId,
  };
}
