import mongoose from "mongoose";
import { APPLICATION_STATUS } from "../../shared/enums/application.enums.js";

const applicationDocumentSchema = new mongoose.Schema(
  {
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    requirementName: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    storedName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },

    filePath: {
      type: String,
      required: true,
      trim: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    /**
     * AI/document verification result.
     *
     * This is informational and allows staff/admin users
     * to understand why a document was accepted/rejected.
     */
    verification: {
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "review"],
        default: "pending",
      },

      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },

      detectedDocumentType: {
        type: String,
        trim: true,
      },

      message: {
        type: String,
        trim: true,
        maxlength: 2000,
      },

      checkedAt: {
        type: Date,
      },
    },
  },
  {
    _id: true,
  },
);

const workflowHistorySchema = new mongoose.Schema(
  {
    stepId: {
      type: String,
      required: true,
      trim: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    performedBy: {
      userId: {
        type: String,
        trim: true,
      },

      name: {
        type: String,
        trim: true,
      },

      role: {
        type: String,
        trim: true,
      },
    },

    note: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

const applicantDetailSchema = new mongoose.Schema(
  {
    fieldKey: {
      type: String,
      required: true,
      trim: true,
    },

    value: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    _id: false,
  },
);

const applicationSchema = new mongoose.Schema(
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

    offeringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offering",
      required: true,
      index: true,
    },

    applicantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    applicantEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    applicantMobile: {
      type: String,
      trim: true,
    },

    applicantDetails: {
      type: [applicantDetailSchema],
      default: [],
    },

    /**
     * REGULAR or TRANSFER.
     *
     * Existing applications default to REGULAR.
     */
    admissionType: {
      type: String,
      enum: ["REGULAR", "TRANSFER"],
      default: "REGULAR",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.DRAFT,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.DRAFT,
      index: true,
    },

    admissionType: {
      type: String,
      enum: ["REGULAR", "TRANSFER"],
      default: "REGULAR",
      required: true,
      index: true,
    },
    currentStepId: {
      type: String,
      trim: true,
    },

    configurationVersion: {
      type: Number,
      default: 1,
    },

    workflowSnapshot: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    workflowHistory: {
      type: [workflowHistorySchema],
      default: [],
    },

    documents: {
      type: [applicationDocumentSchema],
      default: [],
    },

    correctionNote: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    correctionRequiredDocuments: {
      type: [String],
      default: [],
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedAt: {
      type: Date,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    submittedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    rejectedAt: {
      type: Date,
    },

    admittedAt: {
      type: Date,
    },

    /**
     * AI verification summary for this application.
     */
    aiVerification: {
      status: {
        type: String,
        enum: ["pending", "passed", "failed", "review", "not_run"],
        default: "not_run",
      },

      checkedAt: {
        type: Date,
      },

      summary: {
        type: String,
        trim: true,
        maxlength: 5000,
      },

      issues: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  },
);

applicationSchema.index({
  instituteId: 1,
  applicantEmail: 1,
  updatedAt: -1,
});

applicationSchema.index({
  instituteId: 1,
  offeringId: 1,
  admissionType: 1,
  applicantEmail: 1,
});

applicationSchema.index({
  instituteId: 1,
  status: 1,
  updatedAt: -1,
});

export const Application = mongoose.model("Application", applicationSchema);
