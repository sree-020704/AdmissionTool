import { z } from "zod";

import {
  QUEUE_MODE,
  RULE_FIELD_TYPE,
  RULE_OPERATOR,
  SLA_UNIT,
  DOCUMENT_FILE_TYPES,
  OFFERING_STATUS,
  APPLICANT_FIELD_TYPE,
} from "../../shared/enums/offering.enums.js";

import {
  HANDLER_TYPE,
  AI_HANDLER,
  OUTCOME_TYPE,
  ROUTE_ACTION,
  TERMINAL_STATE,
} from "../../shared/enums/workflow.enums.js";

import {
  normalizeOperatingHoursTime,
  validateOperatingHoursWindow,
} from "../../shared/helpers/operatingHours.helper.js";

import { paymentConfigSchema } from "../payments/payment.validator.js";

/* =========================================================
   ADMISSION TYPES
   ========================================================= */

export const ADMISSION_TYPES = Object.freeze({
  REGULAR: "REGULAR",
  TRANSFER: "TRANSFER",
});

const admissionTypeSchema = z.enum([
  ADMISSION_TYPES.REGULAR,
  ADMISSION_TYPES.TRANSFER,
]);

/* =========================================================
   ELIGIBILITY RULE
   ========================================================= */

const eligibilityRuleSchema = z.object({
  field: z.string().min(1).max(100),

  fieldType: z.enum([
    RULE_FIELD_TYPE.NUMERIC,
    RULE_FIELD_TYPE.TEXT,
    RULE_FIELD_TYPE.BOOLEAN,
  ]),

  operator: z.enum(Object.values(RULE_OPERATOR)),

  value: z.union([z.string(), z.number(), z.boolean()]),
});

/*
 * Separate eligibility configuration.
 *
 * Example:
 *
 * {
 *   regular: [...],
 *   transfer: [...]
 * }
 */
const eligibilityByAdmissionTypeSchema = z.object({
  regular: z.array(eligibilityRuleSchema).default([]),
  transfer: z.array(eligibilityRuleSchema).default([]),
});

/* =========================================================
   DOCUMENT REQUIREMENT
   ========================================================= */

const documentRequirementSchema = z.object({
  name: z.string().min(1).max(120),

  required: z.boolean(),

  allowedTypes: z.array(z.enum(DOCUMENT_FILE_TYPES)).min(1),

  maxSizeMb: z.number().min(1).max(25),
});

/*
 * Separate document configuration.
 *
 * Example:
 *
 * {
 *   regular: [...],
 *   transfer: [...]
 * }
 */
const documentsByAdmissionTypeSchema = z.object({
  regular: z.array(documentRequirementSchema).default([]),
  transfer: z.array(documentRequirementSchema).default([]),
});

/* =========================================================
   WORKFLOW
   ========================================================= */

const outcomeRouteSchema = z.object({
  action: z.enum(Object.values(ROUTE_ACTION)),

  nextStepId: z.string().nullish(),

  terminalState: z.enum(Object.values(TERMINAL_STATE)).nullish(),

  returnToStepId: z.string().nullish(),

  requireReupload: z.array(z.string()).optional(),
});

const stepOutcomeSchema = z.object({
  type: z.enum(Object.values(OUTCOME_TYPE)),

  route: outcomeRouteSchema,
});

const workflowStepSchema = z.object({
  stepId: z.string().min(1),

  order: z.number().int().min(1),

  name: z.string().min(1).max(120),

  description: z.string().max(500).optional(),

  handledBy: z.object({
    type: z.enum(Object.values(HANDLER_TYPE)),

    assignee: z.string().min(1).max(80),
  }),

  slaValue: z.number().int().min(1),

  slaUnit: z.enum([SLA_UNIT.MINUTES, SLA_UNIT.HOURS, SLA_UNIT.DAYS]),

  outcomes: z.array(stepOutcomeSchema).min(1).max(3),
});

/* =========================================================
   QUEUE
   ========================================================= */

const queueConfigSchema = z.object({
  capacity: z.number().int().min(1),

  processingRatePerHour: z.number().int().min(1).optional(),

  avgServiceMinutes: z.number().int().min(1).optional(),

  counters: z
    .array(
      z.object({
        id: z.string().min(1).max(40),

        label: z.string().min(1).max(80),

        active: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
});

/* =========================================================
   OPERATING HOURS
   ========================================================= */

const operatingHoursSchema = z
  .string()
  .min(1)
  .transform((value) => normalizeOperatingHoursTime(value))
  .refine((value) => Boolean(value), {
    message: "Use 24-hour time such as 09:00 or 17:00",
  });

const operatingDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7);

/* =========================================================
   APPOINTMENT
   ========================================================= */

const appointmentConfigSchema = z
  .object({
    slotDurationMinutes: z.number().int().min(5),

    slotCapacity: z.number().int().min(1).optional(),

    operatingHoursStart: operatingHoursSchema,

    operatingHoursEnd: operatingHoursSchema,

    operatingDays: operatingDaysSchema.optional(),

    bookingHorizonDays: z.number().int().min(1).max(60).optional(),

    virtualAppointment: z
      .object({
        enabled: z.boolean().optional(),

        allowedProviders: z
          .array(z.enum(["google_meet", "zoom", "manual"]))
          .optional(),

        defaultProvider: z.enum(["google_meet", "zoom", "manual"]).optional(),

        autoGenerateLink: z.boolean().optional(),

        autoSendLinkOnConfirm: z.boolean().optional(),

        allowAdditionalRecipients: z.boolean().optional(),

        maxAdditionalRecipients: z.number().int().min(1).max(500).optional(),
      })
      .optional(),
  })
  .superRefine((config, ctx) => {
    const validation = validateOperatingHoursWindow(
      config.operatingHoursStart,
      config.operatingHoursEnd,
    );

    if (!validation.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,

        message:
          validation.reason === "end_before_start"
            ? "Closing time must be after opening time (use 24-hour format, e.g. 09:00 and 17:00)"
            : "Use 24-hour times like 09:00 and 17:00",

        path: ["operatingHoursEnd"],
      });
    }
  });

/* =========================================================
   APPLICANT FIELDS
   ========================================================= */

const applicantFieldSchema = z.object({
  fieldKey: z.string().min(1).max(80).optional(),

  label: z.string().min(1).max(120),

  fieldType: z.enum(Object.values(APPLICANT_FIELD_TYPE)),

  required: z.boolean().default(true),

  placeholder: z.string().max(200).optional(),

  helpText: z.string().max(300).optional(),

  options: z.array(z.string().min(1).max(120)).optional(),

  order: z.number().int().min(1).optional(),
});

/* =========================================================
   INTAKE DOCUMENT
   ========================================================= */

const intakeDocumentSchema = z.object({
  label: z.string().max(120).optional(),

  helpText: z.string().max(300).optional(),

  required: z.boolean().optional(),

  allowedTypes: z.array(z.enum(DOCUMENT_FILE_TYPES)).min(1).optional(),

  maxSizeMb: z.number().min(1).max(25).optional(),
});

/* =========================================================
   OFFERING DETAILS
   ========================================================= */

export const updateOfferingDetailsSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),

    description: z.string().max(2000).optional().nullable(),

    visitLocation: z.string().max(500).optional().nullable(),

    visitInstructions: z.string().max(2000).optional().nullable(),

    startDate: z.string().datetime().optional().nullable(),

    endDate: z.string().datetime().optional().nullable(),

    applicantFields: z.array(applicantFieldSchema).optional(),

    intakeDocument: intakeDocumentSchema.optional().nullable(),

    paymentConfig: paymentConfigSchema.optional(),
  })

  .superRefine((payload, ctx) => {
    /* Date validation */

    if (payload.startDate && payload.endDate) {
      const start = new Date(payload.startDate);

      const end = new Date(payload.endDate);

      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,

          message: "Closing date must be on or after the opening date",

          path: ["endDate"],
        });
      }
    }

    /* Applicant field validation */

    if (payload.applicantFields?.length) {
      const labels = payload.applicantFields.map((field) =>
        field.label.trim().toLowerCase(),
      );

      if (new Set(labels).size !== labels.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,

          message: "Applicant field labels must be unique",

          path: ["applicantFields"],
        });
      }

      payload.applicantFields.forEach((field, index) => {
        if (
          field.fieldType === APPLICANT_FIELD_TYPE.SELECT &&
          !(field.options?.length >= 1)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,

            message: "Dropdown fields need at least one option",

            path: ["applicantFields", index, "options"],
          });
        }
      });
    }
  });

/* =========================================================
   CREATE OFFERING
   ========================================================= */

export const createOfferingSchema = z.object({
  name: z.string().min(2).max(200),

  serviceId: z.string().min(1),
});

/* =========================================================
   UPDATE OFFERING
   ========================================================= */

export const updateOfferingSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),

    description: z.string().max(2000).optional().nullable(),

    visitLocation: z.string().max(500).optional().nullable(),

    visitInstructions: z.string().max(2000).optional().nullable(),

    startDate: z.string().datetime().optional().nullable(),

    endDate: z.string().datetime().optional().nullable(),

    status: z
      .enum([
        OFFERING_STATUS.DRAFT,
        OFFERING_STATUS.DISABLED,
        OFFERING_STATUS.ARCHIVED,
      ])
      .optional(),
  })

  .superRefine((payload, ctx) => {
    if (payload.startDate && payload.endDate) {
      const start = new Date(payload.startDate);

      const end = new Date(payload.endDate);

      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,

          message: "Closing date must be on or after the opening date",

          path: ["endDate"],
        });
      }
    }
  });

/* =========================================================
   ELIGIBILITY UPDATE
   ========================================================= */

/*
 * Supports BOTH:
 *
 * OLD:
 * {
 *   rules: [...]
 * }
 *
 * NEW:
 * {
 *   admissionType: "REGULAR",
 *   rules: [...]
 * }
 *
 * OR:
 *
 * {
 *   eligibilityByAdmissionType: {
 *     regular: [...],
 *     transfer: [...]
 *   }
 * }
 */

export const updateEligibilitySchema = z
  .object({
    admissionType: admissionTypeSchema.optional(),

    rules: z.array(eligibilityRuleSchema).optional(),

    eligibilityByAdmissionType: eligibilityByAdmissionTypeSchema.optional(),
  })

  .superRefine((payload, ctx) => {
    if (!payload.rules && !payload.eligibilityByAdmissionType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,

        message: "Eligibility rules are required",

        path: ["rules"],
      });
    }

    /*
     * When admissionType is supplied,
     * rules must also be supplied.
     */
    if (payload.admissionType && !payload.rules) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,

        message: "Rules are required for the selected admission type",

        path: ["rules"],
      });
    }
  });

/* =========================================================
   DOCUMENT UPDATE
   ========================================================= */

export const updateDocumentsSchema = z
  .object({
    admissionType: admissionTypeSchema.optional(),

    requirements: z.array(documentRequirementSchema).optional(),

    documentsByAdmissionType: documentsByAdmissionTypeSchema.optional(),
  })

  .superRefine((payload, ctx) => {
    if (!payload.requirements && !payload.documentsByAdmissionType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,

        message: "Document requirements are required",

        path: ["requirements"],
      });
    }

    if (payload.admissionType && !payload.requirements) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,

        message:
          "Document requirements are required for the selected admission type",

        path: ["requirements"],
      });
    }

    /*
     * Check duplicate document names.
     */
    if (payload.requirements) {
      const names = payload.requirements.map((requirement) =>
        requirement.name.trim().toLowerCase(),
      );

      if (new Set(names).size !== names.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,

          message: "Document names must be unique",

          path: ["requirements"],
        });
      }
    }

    if (payload.documentsByAdmissionType) {
      const groups = payload.documentsByAdmissionType;

      for (const [type, requirements] of Object.entries(groups)) {
        const names = requirements.map((requirement) =>
          requirement.name.trim().toLowerCase(),
        );

        if (new Set(names).size !== names.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,

            message: `Duplicate document names are not allowed in ${type} admission`,

            path: ["documentsByAdmissionType", type],
          });
        }
      }
    }
  });

/* =========================================================
   WORKFLOW UPDATE
   ========================================================= */

export const updateWorkflowSchema = z.object({
  steps: z.array(workflowStepSchema).min(1),
});

/* =========================================================
   QUEUE UPDATE
   ========================================================= */

export const updateQueueSchema = z
  .object({
    queueMode: z.enum([
      QUEUE_MODE.QUEUE_ONLY,
      QUEUE_MODE.APPOINTMENT_ONLY,
      QUEUE_MODE.HYBRID,
    ]),

    queueConfig: queueConfigSchema.optional(),

    appointmentConfig: appointmentConfigSchema.optional(),
  })

  .superRefine((payload, ctx) => {
    const needsQueue =
      payload.queueMode === QUEUE_MODE.QUEUE_ONLY ||
      payload.queueMode === QUEUE_MODE.HYBRID;

    const needsAppointment =
      payload.queueMode === QUEUE_MODE.APPOINTMENT_ONLY ||
      payload.queueMode === QUEUE_MODE.HYBRID;

    if (needsQueue && !payload.queueConfig?.capacity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,

        message: "Queue capacity is required",

        path: ["queueConfig", "capacity"],
      });
    }

    if (needsAppointment && !payload.appointmentConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,

        message: "Appointment settings are required",

        path: ["appointmentConfig"],
      });
    }
  });

/* =========================================================
   AI
   ========================================================= */

export const generateAiSectionSchema = z.object({
  section: z.enum(["eligibility", "documents", "workflow", "queue"]).optional(),
});

export const applyAiSuggestionsSchema = z.object({
  section: z.enum(["eligibility", "documents", "workflow", "queue"]).optional(),

  admissionType: admissionTypeSchema.optional(),

  acceptEligibility: z.boolean().optional(),

  acceptDocuments: z.boolean().optional(),

  acceptWorkflow: z.boolean().optional(),

  acceptQueue: z.boolean().optional(),
});

/* =========================================================
   BULK ACTION
   ========================================================= */

export const bulkOfferingActionSchema = z.object({
  offeringIds: z.array(z.string().min(1)).min(1),

  action: z.enum(["enable", "disable", "archive"]),
});

/* =========================================================
   EXPORTS
   ========================================================= */

export {
  AI_HANDLER,
  HANDLER_TYPE,
  OUTCOME_TYPE,
  eligibilityRuleSchema,
  documentRequirementSchema,
  eligibilityByAdmissionTypeSchema,
  documentsByAdmissionTypeSchema,
  applicantFieldSchema,
  intakeDocumentSchema,
  workflowStepSchema,
  queueConfigSchema,
  appointmentConfigSchema,
};
