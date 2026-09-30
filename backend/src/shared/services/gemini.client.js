import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "../../core/config/env.js";
import { logger } from "../../core/logger/index.js";

let client = null;

/*
 * Gemini can temporarily return 429/500/502/503/504.
 * We retry those automatically.
 */
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1500;
const MAX_BACKOFF_DELAY_MS = 10000;

export function isGeminiConfigured() {
  return Boolean(env.GEMINI_API_KEY?.trim());
}

function getClient() {
  if (!isGeminiConfigured()) {
    return null;
  }

  if (!client) {
    client = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    });
  }

  return client;
}

/**
 * Text-only Gemini JSON request.
 *
 * @param {{
 *   system: string,
 *   user: string,
 *   schema: z.ZodType,
 *   timeoutMs?: number,
 * }} params
 */
export async function chatJson({ system, user, schema, timeoutMs }) {
  const gemini = getClient();

  if (!gemini) {
    throw new Error("Gemini API key is not configured");
  }

  return generateWithRetry({
    gemini,
    system,
    user,
    schema,
    timeoutMs,
    parts: [],
  });
}

/**
 * Vision/document Gemini JSON request.
 *
 * Supports:
 * - image/jpeg
 * - image/png
 * - application/pdf
 *
 * @param {{
 *   system: string,
 *   user: string,
 *   images?: Array<{dataUrl: string}>,
 *   schema: z.ZodType,
 *   timeoutMs?: number,
 * }} params
 */
export async function chatVisionJson({
  system,
  user,
  images = [],
  schema,
  timeoutMs,
}) {
  const gemini = getClient();

  if (!gemini) {
    throw new Error("Gemini API key is not configured");
  }

  const parts = [];

  for (const image of images ?? []) {
    if (!image?.dataUrl) {
      continue;
    }

    const match = image.dataUrl.match(/^data:([^;]+);base64,(.+)$/);

    if (!match) {
      logger.warn("Invalid data URL passed to Gemini");
      continue;
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const supported =
      mimeType.startsWith("image/") || mimeType === "application/pdf";

    if (!supported) {
      logger.warn(
        {
          mimeType,
        },
        "Unsupported media MIME type passed to Gemini",
      );
      continue;
    }

    parts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });
  }

  if (parts.length === 0) {
    throw new Error("No valid image or PDF content was supplied to Gemini");
  }

  return generateWithRetry({
    gemini,
    system,
    user,
    schema,
    timeoutMs,
    parts,
  });
}

/**
 * Shared retry implementation.
 */
async function generateWithRetry({
  gemini,
  system,
  user,
  schema,
  timeoutMs,
  parts,
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await generateOnce({
        gemini,
        system,
        user,
        schema,
        timeoutMs,
        parts,
      });
    } catch (error) {
      lastError = error;

      const retryable = isRetryableGeminiError(error);

      if (!retryable || attempt >= MAX_RETRIES) {
        throw error;
      }

      const delay = Math.min(
        INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1),
        MAX_BACKOFF_DELAY_MS,
      );

      logger.warn(
        {
          attempt,
          maxRetries: MAX_RETRIES,
          delayMs: delay,
          error: error?.message,
        },
        "Retrying Gemini request after temporary failure",
      );

      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Gemini request failed");
}

/**
 * Perform one Gemini request.
 */
async function generateOnce({
  gemini,
  system,
  user,
  schema,
  timeoutMs,
  parts,
}) {
  const requestParts = [
    {
      text: `${system}\n\nUSER REQUEST:\n${user}`,
    },
    ...parts,
  ];

  /*
   * IMPORTANT:
   *
   * Do NOT send temperature/top_p/top_k here.
   * Current Gemini 3.x models have deprecated those
   * sampling parameters.
   *
   * responseMimeType is sufficient for JSON generation.
   */
  const requestPromise = gemini.models.generateContent({
    model: env.GEMINI_MODEL || "gemini-3.7-flash",

    contents: [
      {
        role: "user",
        parts: requestParts,
      },
    ],

    config: {
      responseMimeType: "application/json",
    },
  });

  const waitMs = Number(timeoutMs ?? env.GEMINI_TIMEOUT_MS) || 30000;

  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Gemini request timed out after ${waitMs} ms`));
    }, waitMs);

    /*
     * Do not keep Node alive because of this timer.
     */
    timer.unref?.();
  });

  const response = await Promise.race([requestPromise, timeoutPromise]);

  const raw = response?.text;

  return parseAndValidate(raw, schema);
}

/**
 * Normalize common alternate field names returned by
 * Gemini.
 */
function normalizeStructuredResponse(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed;
  }

  const normalized = {
    ...parsed,
  };

  /*
   * Alternate document type field.
   */
  if (
    !normalized.detectedDocumentType &&
    typeof normalized.identifiedDocumentType === "string"
  ) {
    normalized.detectedDocumentType = normalized.identifiedDocumentType;
  }

  /*
   * Alternate message field.
   */
  if (!normalized.summary && typeof normalized.reason === "string") {
    normalized.summary = normalized.reason;
  }

  /*
   * Alternate boolean field names that Gemini may
   * occasionally produce.
   */
  if (
    typeof normalized.matchesRequirement !== "boolean" &&
    typeof normalized.isMatch === "boolean"
  ) {
    normalized.matchesRequirement = normalized.isMatch;
  }

  return normalized;
}

/**
 * Parse and validate Gemini JSON.
 */
function parseAndValidate(raw, schema) {
  if (!raw) {
    throw new Error("Empty response from Gemini");
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logger.warn(
      {
        rawPreview: String(raw).slice(0, 500),
      },
      "Gemini returned invalid JSON",
    );

    throw new Error("Gemini returned invalid JSON");
  }

  const normalized = normalizeStructuredResponse(parsed);

  const result = schema.safeParse(normalized);

  if (!result.success) {
    logger.warn(
      {
        errors: result.error.flatten(),
        sampleKeys: Object.keys(normalized ?? {}),
        rawPreview: JSON.stringify(normalized).slice(0, 1000),
      },
      "Gemini JSON failed schema validation",
    );

    throw new Error("Gemini response did not match expected structure");
  }

  return result.data;
}

/**
 * Detect temporary Gemini/API failures.
 */
function isRetryableGeminiError(error) {
  const message = String(error?.message ?? "").toLowerCase();

  const statusCandidates = [
    error?.status,
    error?.code,
    error?.error?.code,
    error?.response?.status,
  ];

  const status = statusCandidates
    .map(Number)
    .find((value) => Number.isFinite(value));

  if ([408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  return (
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("service unavailable") ||
    message.includes("resource exhausted") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("overloaded") ||
    message.includes("unavailable")
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
