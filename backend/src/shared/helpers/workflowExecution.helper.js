import { APPLICATION_STATUS } from "../enums/application.enums.js";

import {
  HANDLER_TYPE,
  OUTCOME_TYPE,
  ROUTE_ACTION,
  TERMINAL_STATE,
} from "../enums/workflow.enums.js";

import { ROLES } from "../constants/roles.js";

import { toPlainObject } from "./workflow.helper.js";

/**
 * Create a snapshot of the offering workflow configuration.
 *
 * @param {import('../modules/offerings/offering.model.js').Offering} offering
 */
export function snapshotOfferingWorkflow(offering) {
  const steps = (offering.workflowSteps ?? [])
    .map((step) => toPlainObject(step))
    .sort((a, b) => a.order - b.order)
    .map((step) => ({
      stepId: step.stepId,

      order: step.order,

      name: step.name,

      description: step.description ?? "",

      handledBy: step.handledBy,

      slaValue: step.slaValue,

      slaUnit: step.slaUnit,

      outcomes: (step.outcomes ?? []).map((outcome) => ({
        type: outcome.type,

        route: outcome.route ?? {},
      })),
    }));

  return {
    configurationVersion: offering.configurationVersion ?? 1,

    workflowSnapshot: steps,
  };
}

/**
 * Get workflow steps stored on the application.
 *
 * @param {import('../modules/applications/application.model.js').Application} application
 */
export function getWorkflowSteps(application) {
  if (application.workflowSnapshot?.length) {
    return [...application.workflowSnapshot].sort((a, b) => a.order - b.order);
  }

  return [];
}

/**
 * Get the current workflow step.
 *
 * @param {import('../modules/applications/application.model.js').Application} application
 */
export function getCurrentWorkflowStep(application) {
  const steps = getWorkflowSteps(application);

  if (!steps.length) {
    return null;
  }

  if (!application.currentStepId) {
    return steps[0];
  }

  return (
    steps.find((step) => step.stepId === application.currentStepId) ?? steps[0]
  );
}

/**
 * Find an outcome on a workflow step.
 *
 * @param {Object} step
 * @param {string} outcomeType
 */
export function findStepOutcome(step, outcomeType) {
  return step.outcomes?.find((outcome) => outcome.type === outcomeType) ?? null;
}

/**
 * Check whether a user can act on a workflow step.
 *
 * @param {{ role: string, staffRole?: string | null }} user
 * @param {Object} step
 * @param {{ allowAiStep?: boolean }} [options]
 */
export function canUserActOnWorkflowStep(user, step, options = {}) {
  if (!step) {
    return false;
  }

  if (user.role === ROLES.ADMIN) {
    return true;
  }

  if (user.role !== ROLES.STAFF) {
    return false;
  }

  if (step.handledBy?.type === HANDLER_TYPE.STUDENT) {
    return false;
  }

  if (step.handledBy?.type === HANDLER_TYPE.AI) {
    if (!options.allowAiStep) {
      return false;
    }

    return true;
  }

  if (step.handledBy?.type !== HANDLER_TYPE.STAFF) {
    return false;
  }

  const assignee = step.handledBy.assignee ?? "general";

  const staffRole = user.staffRole ?? "general";

  return assignee === staffRole || staffRole === "general";
}

/**
 * Get workflow actions available to a user.
 *
 * @param {Object} step
 * @param {{ role: string, staffRole?: string | null }} user
 * @param {{ allowAiStep?: boolean }} [options]
 */
export function getAvailableWorkflowActions(step, user, options = {}) {
  if (!canUserActOnWorkflowStep(user, step, options)) {
    return [];
  }

  const actions = [];

  if (findStepOutcome(step, OUTCOME_TYPE.APPROVED)) {
    actions.push({
      outcome: OUTCOME_TYPE.APPROVED,

      label:
        step.handledBy?.type === HANDLER_TYPE.AI
          ? "Mark step complete"
          : "Approve step",
    });
  }

  if (findStepOutcome(step, OUTCOME_TYPE.REJECTED)) {
    actions.push({
      outcome: OUTCOME_TYPE.REJECTED,

      label: "Reject request",
    });
  }

  if (findStepOutcome(step, OUTCOME_TYPE.NEEDS_CORRECTION)) {
    actions.push({
      outcome: OUTCOME_TYPE.NEEDS_CORRECTION,

      label: "Request correction",
    });
  }

  return actions;
}

/**
 * Apply a workflow outcome to an application.
 *
 * IMPORTANT:
 * workflowHistory.action is required by application.model.js.
 *
 * @param {import('../modules/applications/application.model.js').Application} application
 * @param {Object} step
 * @param {Object} outcome
 * @param {{ userId: string, name: string, role: string }} actor
 * @param {string} [note]
 * @param {{ correctionRequiredDocuments?: string[] }} [options]
 */
export function applyWorkflowOutcome(
  application,
  step,
  outcome,
  actor,
  note = "",
  options = {},
) {
  const route = outcome.route ?? {};

  application.workflowHistory = application.workflowHistory ?? [];

  /*
   * IMPORTANT FIX:
   *
   * The Application schema requires:
   *
   * workflowHistory[].action
   *
   * Previously only "outcome" was being stored,
   * which caused:
   *
   * Application validation failed:
   * workflowHistory.0.action:
   * Path `action` is required.
   *
   * We now store both action and outcome.
   */
  application.workflowHistory.push({
    stepId: step.stepId,

    stepName: step.name,

    action: route.action ?? outcome.type ?? "unknown",

    outcome: outcome.type,

    actedBy: actor.userId,

    actedByName: actor.name,

    actedByRole: actor.role,

    note: note?.trim() ?? "",

    createdAt: new Date(),
  });

  /*
   * ----------------------------------------------------------
   * NEXT STEP
   * ----------------------------------------------------------
   */
  if (route.action === ROUTE_ACTION.NEXT_STEP && route.nextStepId) {
    application.status = APPLICATION_STATUS.IN_REVIEW;

    application.currentStepId = route.nextStepId;

    application.correctionNote = undefined;

    application.correctionRequiredDocuments = [];

    return {
      autoAdvance: true,
    };
  }

  /*
   * ----------------------------------------------------------
   * END WORKFLOW
   * ----------------------------------------------------------
   */
  if (route.action === ROUTE_ACTION.END_WORKFLOW) {
    application.currentStepId = step.stepId;

    application.status =
      route.terminalState === TERMINAL_STATE.REJECTED
        ? APPLICATION_STATUS.REJECTED
        : APPLICATION_STATUS.ADMITTED;

    application.correctionNote = undefined;

    application.correctionRequiredDocuments = [];

    return {
      terminal: true,

      status: application.status,
    };
  }

  /*
   * ----------------------------------------------------------
   * RETURN TO STUDENT
   * ----------------------------------------------------------
   */
  if (route.action === ROUTE_ACTION.RETURN_TO_STUDENT) {
    application.status = APPLICATION_STATUS.NEEDS_CORRECTION;

    application.currentStepId = route.returnToStepId ?? step.stepId;

    application.correctionNote =
      note?.trim() || "Please update your request and submit again.";

    const selectedDocuments = options.correctionRequiredDocuments;

    application.correctionRequiredDocuments =
      Array.isArray(selectedDocuments) && selectedDocuments.length
        ? selectedDocuments
        : (route.requireReupload ?? []);

    return {
      returnedToStudent: true,
    };
  }

  /*
   * ----------------------------------------------------------
   * DEFAULT
   * ----------------------------------------------------------
   */
  application.status = APPLICATION_STATUS.ADMITTED;

  application.currentStepId = step.stepId;

  return {
    terminal: true,

    status: application.status,
  };
}

/**
 * Automatically complete AI-handled workflow steps
 * until a staff step or terminal state is reached.
 *
 * @param {import('../modules/applications/application.model.js').Application} application
 * @param {{ userId: string, name: string, role: string }} actor
 */
export function autoAdvanceAiSteps(application, actor) {
  const advanced = [];

  let guard = 0;

  while (guard < 20) {
    guard += 1;

    const step = getCurrentWorkflowStep(application);

    /*
     * Stop when there is no current step
     * or the current step is not AI handled.
     */
    if (!step || step.handledBy?.type !== HANDLER_TYPE.AI) {
      break;
    }

    const outcome = findStepOutcome(step, OUTCOME_TYPE.APPROVED);

    /*
     * AI step must have an approved outcome
     * for automatic progression.
     */
    if (!outcome) {
      break;
    }

    const result = applyWorkflowOutcome(application, step, outcome, {
      ...actor,

      name: `${actor.name} (system)`,
    });

    advanced.push({
      stepId: step.stepId,

      stepName: step.name,
    });

    /*
     * Stop if workflow finished,
     * returned to student,
     * or did not auto-advance.
     */
    if (result.terminal || result.returnedToStudent || !result.autoAdvance) {
      break;
    }
  }

  return advanced;
}

/**
 * Format workflow information for the client.
 *
 * @param {import('../modules/applications/application.model.js').Application} application
 * @param {{ role: string, staffRole?: string | null }} user
 */
export function formatWorkflowForClient(application, user) {
  const steps = getWorkflowSteps(application);

  const currentStep = getCurrentWorkflowStep(application);

  const escalated = application.status === APPLICATION_STATUS.PENDING_AI_REVIEW;

  return {
    configurationVersion: application.configurationVersion ?? null,

    currentStep: currentStep
      ? {
          stepId: currentStep.stepId,

          order: currentStep.order,

          name: currentStep.name,

          description: currentStep.description,

          handledBy: currentStep.handledBy,
        }
      : null,

    steps: steps.map((step) => ({
      stepId: step.stepId,

      order: step.order,

      name: step.name,

      description: step.description,

      handledBy: step.handledBy,

      state:
        application.status === APPLICATION_STATUS.ADMITTED ||
        application.status === APPLICATION_STATUS.REJECTED
          ? step.order < (currentStep?.order ?? Infinity)
            ? "complete"
            : step.stepId === currentStep?.stepId
              ? "complete"
              : "upcoming"
          : application.currentStepId === step.stepId
            ? "current"
            : step.order < (currentStep?.order ?? Infinity)
              ? "complete"
              : "upcoming",
    })),

    availableActions: currentStep
      ? getAvailableWorkflowActions(currentStep, user, {
          allowAiStep: escalated,
        })
      : [],

    history: (application.workflowHistory ?? []).map((entry) => ({
      stepId: entry.stepId,

      stepName: entry.stepName,

      /*
       * Keep both fields for client compatibility.
       */
      action: entry.action ?? entry.outcome ?? null,

      outcome: entry.outcome ?? entry.action ?? null,

      actedByName: entry.actedByName,

      actedByRole: entry.actedByRole,

      note: entry.note,

      createdAt: entry.createdAt,
    })),

    correctionNote: application.correctionNote ?? "",

    correctionRequiredDocuments: application.correctionRequiredDocuments ?? [],
  };
}
