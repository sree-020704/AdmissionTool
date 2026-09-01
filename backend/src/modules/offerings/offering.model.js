import mongoose from "mongoose";

import {
  OFFERING_STATUS,
  QUEUE_MODE,
  RULE_FIELD_TYPE,
  RULE_OPERATOR,
  SLA_UNIT,
  DOCUMENT_FILE_TYPES,
  APPLICANT_FIELD_TYPE,
} from "../../shared/enums/offering.enums.js";

import { offeringConfigSnapshotPlugin } from "./offering.version.plugin.js";

import {
  HANDLER_TYPE,
  OUTCOME_TYPE,
  ROUTE_ACTION,
  TERMINAL_STATE,
} from "../../shared/enums/workflow.enums.js";

/**
 * ============================================================
 * ELIGIBILITY RULE
 * ============================================================
 *
 * Existing rule structure is preserved.
 *
 * Additional fields:
 * - admissionType
 * - enabled
 * - order
 * - description
 *
 * This lets an admin maintain separate Regular and Transfer
 * eligibility rules and disable rules without removing them.
 */

const eligibilityRuleSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    fieldType: {
      type: String,
      enum: Object.values(RULE_FIELD_TYPE),
      required: true,
    },

    operator: {
      type: String,
      enum: Object.values(RULE_OPERATOR),
      required: true,
    },

    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    /**
     * REGULAR = normal admission
     * TRANSFER = transfer admission
     */
    admissionType: {
      type: String,
      enum: ["REGULAR", "TRANSFER"],
      default: "REGULAR",
      required: true,
      index: true,
    },

    /**
     * Disabled rules remain stored but are ignored
     * by the eligibility evaluator.
     */
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },

    /**
     * Display order in admin UI.
     */
    order: {
      type: Number,
      default: 1,
      min: 1,
    },

    /**
     * Human-readable explanation of the rule.
     */
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    _id: true,
  },
);

/**
 * ============================================================
 * ADMISSION-TYPE ELIGIBILITY GROUP
 * ============================================================
 *
 * This is the new grouped structure:
 *
 * eligibilityByAdmissionType: {
 *   regular: [...],
 *   transfer: [...]
 * }
 *
 * Old eligibilityRules remains below for backward compatibility.
 */

const eligibilityByAdmissionTypeSchema = new mongoose.Schema(
  {
    regular: {
      type: [eligibilityRuleSchema],
      default: [],
    },

    transfer: {
      type: [eligibilityRuleSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

/**
 * ============================================================
 * DOCUMENT REQUIREMENT
 * ============================================================
 */

const documentRequirementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    required: {
      type: Boolean,
      default: true,
    },

    allowedTypes: {
      type: [String],
      enum: DOCUMENT_FILE_TYPES,
      default: ["pdf"],
    },

    maxSizeMb: {
      type: Number,
      default: 5,
      min: 1,
      max: 25,
    },

    /**
     * Regular, Transfer or Both.
     */
    admissionType: {
      type: String,
      enum: ["REGULAR", "TRANSFER", "BOTH"],
      default: "BOTH",
      required: true,
      index: true,
    },

    /**
     * Disabled requirements stay stored so admins can
     * enable them again later.
     */
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },

    /**
     * Display order.
     */
    order: {
      type: Number,
      default: 1,
      min: 1,
    },

    /**
     * Optional help text.
     */
    helpText: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    _id: true,
  },
);

/**
 * ============================================================
 * ADMISSION-TYPE DOCUMENT GROUP
 * ============================================================
 */

const documentsByAdmissionTypeSchema = new mongoose.Schema(
  {
    regular: {
      type: [documentRequirementSchema],
      default: [],
    },

    transfer: {
      type: [documentRequirementSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

/**
 * ============================================================
 * INTAKE DOCUMENT
 * ============================================================
 */

const intakeDocumentSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    helpText: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    required: {
      type: Boolean,
      default: true,
    },

    allowedTypes: {
      type: [String],
      enum: DOCUMENT_FILE_TYPES,
      default: ["pdf", "jpg", "jpeg", "png"],
    },

    maxSizeMb: {
      type: Number,
      default: 5,
      min: 1,
      max: 25,
    },
  },
  {
    _id: true,
  },
);

/**
 * ============================================================
 * WORKFLOW ROUTE
 * ============================================================
 */

const outcomeRouteSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: Object.values(ROUTE_ACTION),
      required: true,
    },

    nextStepId: {
      type: String,
    },

    terminalState: {
      type: String,
      enum: Object.values(TERMINAL_STATE),
    },

    returnToStepId: {
      type: String,
    },

    requireReupload: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  },
);

/**
 * ============================================================
 * WORKFLOW OUTCOME
 * ============================================================
 */

const stepOutcomeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(OUTCOME_TYPE),
      required: true,
    },

    route: {
      type: outcomeRouteSchema,
      required: true,
    },
  },
  {
    _id: false,
  },
);

/**
 * ============================================================
 * WORKFLOW STEP
 * ============================================================
 */

const workflowStepSchema = new mongoose.Schema(
  {
    stepId: {
      type: String,
      required: true,
    },

    order: {
      type: Number,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    handledBy: {
      type: {
        type: String,
        enum: Object.values(HANDLER_TYPE),
        required: true,
      },

      assignee: {
        type: String,
        required: true,
        trim: true,
      },
    },

    slaValue: {
      type: Number,
      required: true,
      min: 1,
    },

    slaUnit: {
      type: String,
      enum: Object.values(SLA_UNIT),
      required: true,
    },

    outcomes: {
      type: [stepOutcomeSchema],
      required: true,
    },

    assignedRole: {
      type: String,
    },

    allowedActions: {
      type: [String],
    },
  },
  {
    _id: true,
  },
);

/**
 * ============================================================
 * APPLICANT FIELD
 * ============================================================
 */

const applicantFieldSchema = new mongoose.Schema(
  {
    fieldKey: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    fieldType: {
      type: String,
      enum: Object.values(APPLICANT_FIELD_TYPE),
      required: true,
    },

    required: {
      type: Boolean,
      default: true,
    },

    placeholder: {
      type: String,
      trim: true,
      default: "",
    },

    helpText: {
      type: String,
      trim: true,
      default: "",
    },

    options: {
      type: [String],
      default: [],
    },

    order: {
      type: Number,
      default: 1,
    },
  },
  {
    _id: true,
  },
);

/**
 * ============================================================
 * OFFERING
 * ============================================================
 */

const offeringSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    visitLocation: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    visitInstructions: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: Object.values(OFFERING_STATUS),
      default: OFFERING_STATUS.DRAFT,
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    configurationVersion: {
      type: Number,
      default: 1,
    },

    /**
     * ========================================================
     * APPLICANT FIELDS
     * ========================================================
     */

    applicantFields: [applicantFieldSchema],

    /**
     * ========================================================
     * INTAKE DOCUMENT
     * ========================================================
     */

    intakeDocument: intakeDocumentSchema,

    /**
     * ========================================================
     * LEGACY ELIGIBILITY
     * ========================================================
     *
     * Existing installations use this field.
     *
     * It is treated as REGULAR eligibility.
     */
    eligibilityRules: [eligibilityRuleSchema],

    /**
     * ========================================================
     * NEW ADMISSION-SPECIFIC ELIGIBILITY
     * ========================================================
     */
    eligibilityByAdmissionType: eligibilityByAdmissionTypeSchema,

    /**
     * ========================================================
     * LEGACY DOCUMENT REQUIREMENTS
     * ========================================================
     *
     * Existing installations use this field.
     *
     * It is treated as REGULAR documents.
     */
    documentRequirements: [documentRequirementSchema],

    /**
     * ========================================================
     * NEW ADMISSION-SPECIFIC DOCUMENT REQUIREMENTS
     * ========================================================
     */

    documentsByAdmissionType: documentsByAdmissionTypeSchema,

    /**
     * ========================================================
     * WORKFLOW
     * ========================================================
     */

    workflowSteps: [workflowStepSchema],

    /**
     * ========================================================
     * QUEUE
     * ========================================================
     */

    queueMode: {
      type: String,
      enum: Object.values(QUEUE_MODE),
    },

    queueConfig: {
      capacity: {
        type: Number,
        min: 1,
      },

      processingRatePerHour: {
        type: Number,
        min: 1,
      },

      avgServiceMinutes: {
        type: Number,
        min: 1,
      },

      counters: {
        type: [
          {
            id: {
              type: String,
              required: true,
            },

            label: {
              type: String,
              required: true,
              trim: true,
            },

            active: {
              type: Boolean,
              default: true,
            },
          },
        ],

        default: [],
      },
    },

    /**
     * ========================================================
     * APPOINTMENT
     * ========================================================
     */

    appointmentConfig: {
      slotDurationMinutes: {
        type: Number,
        min: 5,
      },

      slotCapacity: {
        type: Number,
        min: 1,
      },

      operatingHoursStart: {
        type: String,
      },

      operatingHoursEnd: {
        type: String,
      },

      operatingDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5],
      },

      bookingHorizonDays: {
        type: Number,
        min: 1,
        max: 60,
      },

      virtualAppointment: {
        enabled: {
          type: Boolean,
          default: false,
        },

        allowedProviders: {
          type: [String],
          default: ["google_meet", "zoom", "manual"],
        },

        defaultProvider: {
          type: String,
          default: "google_meet",
        },

        autoGenerateLink: {
          type: Boolean,
          default: true,
        },

        autoSendLinkOnConfirm: {
          type: Boolean,
          default: true,
        },

        allowAdditionalRecipients: {
          type: Boolean,
          default: true,
        },

        maxAdditionalRecipients: {
          type: Number,
          min: 1,
          max: 500,
          default: 50,
        },
      },
    },

    /**
     * ========================================================
     * AI SUGGESTIONS
     * ========================================================
     */

    aiSuggestions: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /**
     * ========================================================
     * PAYMENT
     * ========================================================
     */

    paymentConfig: {
      enabled: {
        type: Boolean,
        default: false,
      },

      amount: {
        type: Number,
        min: 1,
      },

      currency: {
        type: String,
        default: "INR",
        trim: true,
      },

      label: {
        type: String,
        trim: true,
        maxlength: 120,
      },

      timing: {
        type: String,
        enum: ["before_submit", "workflow_step"],
        default: "before_submit",
      },

      workflowStepId: {
        type: String,
        trim: true,
      },
    },

    /**
     * ========================================================
     * ACTIVATION
     * ========================================================
     */

    activatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Existing index.
 */
offeringSchema.index({
  instituteId: 1,
  serviceId: 1,
  name: 1,
});

/**
 * Indexes used by admission-specific filtering.
 */
offeringSchema.index({
  instituteId: 1,
  serviceId: 1,
  "eligibilityRules.admissionType": 1,
});

offeringSchema.index({
  instituteId: 1,
  serviceId: 1,
  "eligibilityRules.enabled": 1,
});

offeringSchema.index({
  instituteId: 1,
  serviceId: 1,
  "documentRequirements.admissionType": 1,
});

offeringSchema.index({
  instituteId: 1,
  serviceId: 1,
  "documentRequirements.enabled": 1,
});

/**
 * Existing configuration snapshot plugin.
 */
offeringSchema.plugin(offeringConfigSnapshotPlugin);

/**
 * @typedef {mongoose.InferSchemaType<typeof offeringSchema> & {
 *   _id: mongoose.Types.ObjectId
 * }} OfferingDocument
 */

export const Offering = mongoose.model("Offering", offeringSchema);
