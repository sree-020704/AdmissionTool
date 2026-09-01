import { GoogleGenAI } from "@google/genai";
import { buildCombinedDocumentText } from "./document-text.service.js";
import { buildHeuristicServiceInsights } from "./knowledge-heuristics.service.js";
import { logger } from "../../core/logger/index.js";
import { env } from "../../core/config/env.js";

import {
  serviceInsightsResponseSchema,
  offeringEligibilityResponseSchema,
  offeringDocumentsResponseSchema,
  offeringWorkflowSkeletonResponseSchema,
  offeringWorkflowOutcomesResponseSchema,
  offeringQueueResponseSchema,
} from "../schemas/knowledge-ai.schemas.js";

import { mergeWorkflowSkeletonAndOutcomes } from "../helpers/workflow.helper.js";

import {
  ensureAdmissionWorkflowSkeleton,
  ensureAdmissionStepOutcomes,
  buildCanonicalAdmissionStepOutcomes,
} from "../helpers/admission-workflow.helper.js";

import { normalizeServiceInsightsPayload } from "../helpers/normalize-ai-response.helper.js";

import {
  extractStructuredOfferingsFromText,
  prepareInsightsDocumentText,
  mergeSuggestedOfferings,
  focusDocumentForOffering,
  extractEligibilityRulesFromText,
  mergeEligibilityRules,
  extractDocumentRequirementsFromText,
  mergeDocumentRequirements,
  extractQueueSettingsFromText,
  extractPaymentSettingsFromText,
} from "../helpers/structured-offerings.helper.js";

import {
  SERVICE_INSIGHTS_SYSTEM_PROMPT,
  buildServiceInsightsUserPrompt,
  buildOfferingBaseContext,
  buildOfferingEligibilityUserPrompt,
  buildOfferingDocumentsUserPrompt,
  buildOfferingWorkflowSkeletonUserPrompt,
  buildOfferingWorkflowOutcomesUserPrompt,
  buildOfferingQueueUserPrompt,
  OFFERING_ELIGIBILITY_SYSTEM_PROMPT,
  OFFERING_DOCUMENTS_SYSTEM_PROMPT,
  OFFERING_WORKFLOW_SKELETON_SYSTEM_PROMPT,
  OFFERING_WORKFLOW_OUTCOMES_SYSTEM_PROMPT,
  OFFERING_QUEUE_SYSTEM_PROMPT,
} from "../prompts/index.js";

/* ============================================================
   GEMINI CONFIGURATION
   ============================================================ */

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY?.trim() || env.GEMINI_API_KEY?.trim() || "";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  env.GEMINI_MODEL?.trim() ||
  "gemini-2.5-flash";

function isGeminiConfigured() {
  return Boolean(GEMINI_API_KEY);
}

/* ============================================================
   GEMINI ERROR FORMATTER
   ============================================================ */

function formatGeminiError(err) {
  const msg = err?.message ?? String(err);
  const lower = msg.toLowerCase();

  if (
    lower.includes("api key") ||
    lower.includes("apikey") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("permission")
  ) {
    return (
      "Gemini API authentication failed. Check GEMINI_API_KEY " +
      "and make sure the key has access to the configured model."
    );
  }

  if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("resource exhausted") ||
    lower.includes("rate limit")
  ) {
    return (
      "Gemini API quota or rate limit was exceeded. " +
      "Showing fallback results."
    );
  }

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("abort")
  ) {
    return (
      "Gemini analysis timed out while processing the document. " +
      "Showing fallback results."
    );
  }

  if (
    lower.includes("404") ||
    lower.includes("not found") ||
    lower.includes("model")
  ) {
    return (
      `Gemini model "${GEMINI_MODEL}" is unavailable or not accessible. ` +
      "Check GEMINI_MODEL in backend/.env."
    );
  }

  return `Gemini analysis failed: ${msg}`;
}

/* ============================================================
   GEMINI JSON CALL
   ============================================================ */

/**
 * Calls Gemini and converts the response into JSON.
 *
 * Existing Zod schemas are preserved.
 */
async function geminiChatJson({ system, user, schema, normalize, timeoutMs }) {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs ?? 120000);

  try {
    logger.debug(
      {
        model: GEMINI_MODEL,
      },
      "Calling Gemini",
    );

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,

      contents: [
        {
          role: "user",
          parts: [
            {
              text: user,
            },
          ],
        },
      ],

      config: {
        systemInstruction: system,

        responseMimeType: "application/json",

        temperature: 0.2,

        abortSignal: controller.signal,
      },
    });

    const text = response?.text?.trim();

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      logger.error(
        {
          error: parseErr.message,
          responsePreview: text.slice(0, 1000),
        },
        "Gemini returned invalid JSON",
      );

      throw new Error("Gemini returned invalid JSON");
    }

    const normalized = normalize ? normalize(parsed) : parsed;

    if (schema?.parse) {
      return schema.parse(normalized);
    }

    return normalized;
  } finally {
    clearTimeout(timeout);
  }
}

/* ============================================================
   SERVICE KNOWLEDGE INSIGHTS
   ============================================================ */

/**
 * @param {{ name: string, description?: string }} service
 * @param {Array} documents
 */
export async function generateServiceInsights(service, documents) {
  let fullDocText = "";

  try {
    fullDocText = await buildCombinedDocumentText(documents);
  } catch (err) {
    logger.error(
      {
        error: err.message,
      },
      "Failed to build combined document text",
    );

    return finalizeInsights(
      buildHeuristicServiceInsights(service, "", []),
      [],
      "heuristic",
      `Document text extraction failed: ${err.message}`,
    );
  }

  const safeDocText = typeof fullDocText === "string" ? fullDocText : "";

  const structuredOfferings = extractStructuredOfferingsFromText(safeDocText);

  const insightsDocText = prepareInsightsDocumentText(safeDocText);

  /*
   * No Gemini configuration:
   * use existing heuristic implementation.
   */
  if (!isGeminiConfigured()) {
    logger.warn("GEMINI_API_KEY is not configured; using heuristic analysis");

    return finalizeInsights(
      buildHeuristicServiceInsights(service, safeDocText, structuredOfferings),
      structuredOfferings,
      "heuristic",
      "Gemini API key is not configured. Showing basic fallback results.",
    );
  }

  /*
   * No extracted document text.
   *
   * IMPORTANT:
   * This does NOT mean the PDF is necessarily scanned.
   * It means the extraction pipeline returned no text.
   */
  if (!safeDocText.trim()) {
    logger.warn(
      {
        service: service.name,
        documentCount: documents?.length ?? 0,
      },
      "Document extraction returned empty text",
    );

    return finalizeInsights(
      buildHeuristicServiceInsights(service, safeDocText, structuredOfferings),
      structuredOfferings,
      "heuristic",
      "Document extraction returned no readable text. Check document-text.service.js and the PDF parser configuration.",
    );
  }

  try {
    const result = await geminiChatJson({
      system: SERVICE_INSIGHTS_SYSTEM_PROMPT,

      user: buildServiceInsightsUserPrompt({
        serviceName: service.name,
        serviceDescription: service.description,
        docText: insightsDocText,
      }),

      schema: serviceInsightsResponseSchema,

      normalize: normalizeServiceInsightsPayload,

      timeoutMs:
        env.GEMINI_INSIGHTS_TIMEOUT_MS ??
        env.OPENAI_INSIGHTS_TIMEOUT_MS ??
        120000,
    });

    const mergedOfferings = mergeSuggestedOfferings(
      result.suggestedOfferings ?? [],
      structuredOfferings,
    );

    const gaps = [...(result.gaps ?? [])];

    if (mergedOfferings.length === 0) {
      gaps.push(
        "No explicitly named offerings were found in the document. Add clearer intake/category labels to the document, or create offerings manually.",
      );
    } else if (
      (result.suggestedOfferings?.length ?? 0) < structuredOfferings.length
    ) {
      gaps.push(
        `Structured catalogue listed ${structuredOfferings.length} offerings; merged list has ${mergedOfferings.length} after combining AI + document headers.`,
      );
    }

    return finalizeInsights(
      {
        understandingSummary: result.understandingSummary,

        chatbotReadinessSummary: result.chatbotReadinessSummary,

        chatbotCanAnswer: result.chatbotCanAnswer,

        gaps,

        suggestedOfferings: mergedOfferings,
      },

      structuredOfferings,

      "gemini",

      null,
    );
  } catch (err) {
    logger.warn(
      {
        error: err.message,
        service: service.name,
      },
      "Gemini service insights failed; using heuristics",
    );

    const friendly = formatGeminiError(err);

    const heuristic = buildHeuristicServiceInsights(
      service,
      safeDocText,
      structuredOfferings,
    );

    return finalizeInsights(
      heuristic,
      structuredOfferings,
      "heuristic",
      friendly,
    );
  }
}

/* ============================================================
   FINALIZE SERVICE INSIGHTS
   ============================================================ */

/**
 * @param {{
 *   understandingSummary: string,
 *   chatbotReadinessSummary: string,
 *   chatbotCanAnswer: string[],
 *   gaps: string[],
 *   suggestedOfferings: Array<{
 *     name: string,
 *     description?: string,
 *     documentExcerpt: string
 *   }>,
 * }} base
 *
 * @param {Array} structuredOfferings
 *
 * @param {'gemini'|'openai'|'heuristic'} analysisMode
 *
 * @param {string|null} analysisWarning
 */
function finalizeInsights(
  base,
  structuredOfferings,
  analysisMode,
  analysisWarning,
) {
  const merged = mergeSuggestedOfferings(
    base?.suggestedOfferings ?? [],
    structuredOfferings ?? [],
  );

  const gaps = [...(base?.gaps ?? [])];

  if (merged.length > 0) {
    const idx = gaps.findIndex((g) => /exact offering names/i.test(g));

    if (idx >= 0) {
      gaps.splice(idx, 1);
    }
  }

  return {
    understandingSummary:
      base?.understandingSummary ?? "No understanding summary was generated.",

    chatbotReadinessSummary:
      base?.chatbotReadinessSummary ?? "Document analysis is incomplete.",

    chatbotCanAnswer: base?.chatbotCanAnswer ?? [],

    gaps,

    suggestedOfferings: merged.map((o) => ({
      id: crypto.randomUUID(),

      name: o.name?.trim() ?? "",

      description: o.description?.trim() ?? "",

      documentExcerpt: o.documentExcerpt?.trim() ?? "",

      rationale: o.documentExcerpt?.trim() ?? "",

      status: "pending",

      source:
        analysisMode === "gemini" || analysisMode === "openai"
          ? "ai"
          : "document",
    })),

    analysisMode,

    analysisWarning,
  };
}

/* ============================================================
   OFFERING SECTION SUGGESTIONS
   ============================================================ */

/**
 * @param {Object} params
 */
export async function generateOfferingSectionSuggestions({
  service,
  offering,
  documents,
  insights,
  section,
  pendingDocumentRequirements,
}) {
  let fullDocText = "";

  try {
    fullDocText = await buildCombinedDocumentText(documents);
  } catch (err) {
    logger.error(
      {
        error: err.message,
        offering: offering?.name,
        section,
      },
      "Failed to extract document text for offering",
    );

    return null;
  }

  const safeDocText = typeof fullDocText === "string" ? fullDocText : "";

  const priorRules = offering.eligibilityRules?.length
    ? JSON.stringify(offering.eligibilityRules, null, 2)
    : "(none yet)";

  const priorDocs = offering.documentRequirements?.length
    ? JSON.stringify(offering.documentRequirements, null, 2)
    : "(none yet)";

  /*
   * If Gemini isn't configured or documents contain
   * no extracted text, use structured extraction.
   */
  if (!isGeminiConfigured() || !safeDocText.trim()) {
    if (section === "eligibility" && safeDocText.trim()) {
      const structured = extractEligibilityRulesFromText(
        safeDocText,
        offering.name,
      );

      return structured.length
        ? {
            eligibilityRules: structured,
          }
        : null;
    }

    if (section === "documents" && safeDocText.trim()) {
      const structured = extractDocumentRequirementsFromText(
        safeDocText,
        offering.name,
      );

      return structured.length
        ? {
            documentRequirements: structured,
          }
        : null;
    }

    if (section === "queue" && safeDocText.trim()) {
      return extractQueueSettingsFromText(safeDocText, offering.name);
    }

    return null;
  }

  const docText = focusDocumentForOffering(safeDocText, offering.name);

  const baseContext = buildOfferingBaseContext({
    serviceName: service.name,
    offeringName: offering.name,
    offeringDescription: offering.description,
    understandingSummary: insights?.understandingSummary,
    docText,
  });

  try {
    /* ========================================================
       ELIGIBILITY
       ======================================================== */

    if (section === "eligibility") {
      const structured = extractEligibilityRulesFromText(
        safeDocText,
        offering.name,
      );

      let aiRules = [];

      try {
        const result = await geminiChatJson({
          system: OFFERING_ELIGIBILITY_SYSTEM_PROMPT,

          user: buildOfferingEligibilityUserPrompt({
            baseContext,
            priorRules,
            offeringName: offering.name,
          }),

          schema: offeringEligibilityResponseSchema,

          timeoutMs: env.GEMINI_TIMEOUT_MS ?? env.OPENAI_TIMEOUT_MS ?? 120000,
        });

        aiRules = result.eligibilityRules ?? [];
      } catch (eligibilityErr) {
        logger.warn(
          {
            error: eligibilityErr.message,
            offering: offering.name,
          },
          "Gemini eligibility extraction failed; using structured document rules",
        );
      }

      return {
        eligibilityRules: mergeEligibilityRules(aiRules, structured),
      };
    }

    /* ========================================================
       DOCUMENTS
       ======================================================== */

    if (section === "documents") {
      const structured = extractDocumentRequirementsFromText(
        safeDocText,
        offering.name,
      );

      let aiDocs = [];

      try {
        const result = await geminiChatJson({
          system: OFFERING_DOCUMENTS_SYSTEM_PROMPT,

          user: buildOfferingDocumentsUserPrompt({
            baseContext,
            priorDocs,
            priorRules,
            offeringName: offering.name,
          }),

          schema: offeringDocumentsResponseSchema,

          timeoutMs: env.GEMINI_TIMEOUT_MS ?? env.OPENAI_TIMEOUT_MS ?? 120000,
        });

        aiDocs = result.documentRequirements ?? [];
      } catch (documentsErr) {
        logger.warn(
          {
            error: documentsErr.message,
            offering: offering.name,
          },
          "Gemini document extraction failed; using structured document list",
        );
      }

      return {
        documentRequirements: mergeDocumentRequirements(aiDocs, structured),
      };
    }

    /* ========================================================
       WORKFLOW
       ======================================================== */

    if (section === "workflow") {
      const documentNames = [
        ...(offering.documentRequirements ?? []),
        ...(pendingDocumentRequirements ?? []),
      ]
        .map((d) => d.name)
        .filter(Boolean);

      const uniqueDocNames = [...new Set(documentNames)];

      const skeletonResult = await geminiChatJson({
        system: OFFERING_WORKFLOW_SKELETON_SYSTEM_PROMPT,

        user: buildOfferingWorkflowSkeletonUserPrompt({
          baseContext,
          priorRules,
          priorDocs,
          offeringName: offering.name,
        }),

        schema: offeringWorkflowSkeletonResponseSchema,

        timeoutMs: env.GEMINI_TIMEOUT_MS ?? env.OPENAI_TIMEOUT_MS ?? 120000,
      });

      const skeletonSteps = ensureAdmissionWorkflowSkeleton(
        skeletonResult.workflowSteps ?? [],
        {
          offeringName: offering.name,
          docText,
          priorRules,
          priorDocs,
          documentNames: uniqueDocNames,
        },
      );

      if (!skeletonSteps.length) {
        return {
          workflowSteps: [],
        };
      }

      const skeletonJson = JSON.stringify(skeletonSteps, null, 2);

      let stepOutcomes = [];

      try {
        const outcomesResult = await geminiChatJson({
          system: OFFERING_WORKFLOW_OUTCOMES_SYSTEM_PROMPT,

          user: buildOfferingWorkflowOutcomesUserPrompt({
            baseContext,
            priorRules,
            priorDocs,
            documentNames: uniqueDocNames,
            offeringName: offering.name,
            workflowSkeletonJson: skeletonJson,
          }),

          schema: offeringWorkflowOutcomesResponseSchema,

          timeoutMs: env.GEMINI_TIMEOUT_MS ?? env.OPENAI_TIMEOUT_MS ?? 120000,
        });

        stepOutcomes = outcomesResult.stepOutcomes ?? [];
      } catch (outcomesErr) {
        logger.warn(
          {
            error: outcomesErr.message,
            stepCount: skeletonSteps.length,
          },
          "Gemini workflow outcomes failed; using canonical admission routing",
        );
      }

      let alignedOutcomes = ensureAdmissionStepOutcomes(
        skeletonSteps,
        stepOutcomes,
        uniqueDocNames,
        docText,
        offering.name,
      );

      const missingOutcomes = alignedOutcomes.filter(
        (entry) => !entry.outcomes?.length,
      );

      if (missingOutcomes.length > 0) {
        const canonical = buildCanonicalAdmissionStepOutcomes(uniqueDocNames);

        alignedOutcomes = skeletonSteps.map((step) => {
          const entry = alignedOutcomes.find((e) => e.order === step.order);

          if (entry?.outcomes?.length >= 3) {
            return entry;
          }

          const fallback = canonical.find((c) => c.order === step.order);

          return {
            order: step.order,

            outcomes: fallback?.outcomes ?? [],
          };
        });
      }

      return {
        workflowSteps: mergeWorkflowSkeletonAndOutcomes(
          skeletonSteps,
          alignedOutcomes,
          {
            documentNames: uniqueDocNames,
          },
        ),
      };
    }

    /* ========================================================
       QUEUE
       ======================================================== */

    if (section === "queue") {
      const structured = extractQueueSettingsFromText(
        safeDocText,
        offering.name,
      );

      let aiQueue = null;

      try {
        const result = await geminiChatJson({
          system: OFFERING_QUEUE_SYSTEM_PROMPT,

          user: buildOfferingQueueUserPrompt({
            baseContext,
          }),

          schema: offeringQueueResponseSchema,

          timeoutMs: env.GEMINI_TIMEOUT_MS ?? env.OPENAI_TIMEOUT_MS ?? 120000,
        });

        if (result.queueMode) {
          aiQueue = result;
        }
      } catch (queueErr) {
        logger.warn(
          {
            error: queueErr.message,
            offering: offering.name,
          },
          "Gemini queue extraction failed; using structured queue settings",
        );
      }

      const merged = aiQueue?.queueMode ? aiQueue : structured;

      if (!merged?.queueMode) {
        return {
          queueMode: null,
        };
      }

      const payment = extractPaymentSettingsFromText(
        safeDocText,
        offering.name,
      );

      return {
        ...merged,

        ...(payment
          ? {
              paymentHint: payment,
            }
          : {}),
      };
    }
  } catch (err) {
    logger.warn(
      {
        error: err.message,
        section,
        offering: offering?.name,
      },
      "Gemini offering section failed",
    );

    return null;
  }

  return null;
}
