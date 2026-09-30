import { z } from "zod";

import { chatJson, chatVisionJson } from "./gemini.client.js";

import { prepareDocumentForVerification } from "./document-text.service.js";

import { logger } from "../../core/logger/index.js";

/**
 * Gemini verification result schema.
 */
const documentVerificationSchema = z.object({
  matchesRequirement: z.boolean(),

  confidence: z.number().min(0).max(1),

  detectedDocumentType: z.string().min(1).max(200),

  summary: z.string().min(1).max(1000),
});

const DOCUMENT_CHECK_SYSTEM_PROMPT = `
You are a university student-document verification assistant.

Your task is to determine whether the uploaded document
actually matches the required document type.

GENERAL RULES:

1. Inspect the ACTUAL document.
2. Never trust the filename.
3. Never trust the upload field name.
4. Never identify the document using only the student's name.
5. Use visible headings, labels, document structure,
   institution/government identifiers, fields, layout,
   photographs, numbers, seals, logos, and other meaningful evidence.
6. Do not invent information.
7. If the document is clearly another type, return false.
8. If the document is genuinely ambiguous or impossible to read,
   return false.
9. Confidence must represent your actual certainty.
10. Return ONLY valid JSON.

GOVERNMENT ID RULES:

A Government ID may include documents such as:
- Aadhaar
- Passport
- Driving Licence
- Voter ID
- other government-issued identity documents

An Aadhaar card should be recognized when the uploaded document
visually contains Aadhaar/government identity characteristics.

COLLEGE ID RULES:

A College ID / Student ID may contain:
- college or university name
- student photograph
- student name
- roll number / registration number
- course or programme
- institutional logo
- student ID number
- other college identification information

IMPORTANT:

A College ID is NOT the same as a Government ID.

A Government ID is NOT the same as a College ID.

An academic marksheet is NOT a Government ID.

A transfer certificate is NOT a Government ID.

Return EXACTLY this JSON structure:

{
  "matchesRequirement": true,
  "confidence": 0.95,
  "detectedDocumentType": "Aadhaar Card",
  "summary": "The uploaded document matches the Government ID requirement."
}
`;

/**
 * Verify one student document.
 *
 * @param {{
 *   filePath: string,
 *   mimeType: string,
 *   requirementName: string,
 *   applicantName?: string
 * }} params
 *
 * @returns {Promise<{
 *   valid: boolean,
 *   unavailable?: boolean,
 *   confidence: number,
 *   detectedDocumentType: string,
 *   message: string,
 *   raw?: object
 * }>}
 */
export async function verifyStudentDocument({
  filePath,
  mimeType,
  requirementName,
  applicantName,
}) {
  /*
   * ----------------------------------------------------------
   * STEP 1
   * Prepare document
   * ----------------------------------------------------------
   */

  let prepared;

  try {
    prepared = await prepareDocumentForVerification(filePath, mimeType);
  } catch (error) {
    logger.error(
      {
        error: error?.message ?? String(error),
        filePath,
        mimeType,
        requirementName,
      },
      "Failed to prepare student document",
    );

    return {
      valid: false,
      unavailable: false,
      confidence: 0,
      detectedDocumentType: "Unreadable document",
      message:
        "The uploaded document could not be read. Please upload a clear and valid document.",
    };
  }

  /*
   * ----------------------------------------------------------
   * STEP 2
   * Unreadable only when the FILE ITSELF could not be prepared.
   * ----------------------------------------------------------
   */

  if (!prepared || prepared.kind === "unreadable") {
    logger.warn(
      {
        filePath,
        mimeType,
        requirementName,
        reason: prepared?.reason,
      },
      "Student document could not be prepared for verification",
    );

    return {
      valid: false,
      unavailable: false,
      confidence: 0,
      detectedDocumentType: "Unreadable document",
      message:
        "The uploaded document could not be processed. Please upload a clear and valid document.",
    };
  }

  /*
   * ----------------------------------------------------------
   * STEP 3
   * Verification prompt
   * ----------------------------------------------------------
   */

  const userPrompt = `
REQUIRED DOCUMENT:
${requirementName}

APPLICANT:
${applicantName || "Unknown"}

The student selected this upload requirement:
"${requirementName}"

Inspect the uploaded document itself.

Determine:

1. What is the actual document type?
2. Does it match "${requirementName}"?
3. Is there sufficient visual/textual evidence?
4. How confident are you?

Important:

- Do not trust the filename.
- Do not trust the file extension.
- Do not rely only on the applicant's name.
- Use the document's visible content.
- For Government ID, recognize Aadhaar and other government-issued IDs.
- For CollegeID, recognize institutional/student identity cards.
- A scanned PDF must still be judged from its actual visible contents.
- A PDF being scanned does NOT automatically mean it is invalid.
- Return false only when the actual document is wrong or genuinely ambiguous.
- Do not classify a correct document as unreadable merely because text extraction
  was poor.

Return exactly:

{
  "matchesRequirement": true,
  "confidence": 0.95,
  "detectedDocumentType": "Aadhaar Card",
  "summary": "The uploaded document matches the Government ID requirement."
}
`;

  /*
   * ----------------------------------------------------------
   * STEP 4
   * CALL GEMINI
   * ----------------------------------------------------------
   */

  try {
    let result;

    /*
     * --------------------------------------------------------
     * NORMAL IMAGE
     * --------------------------------------------------------
     */

    if (prepared.kind === "image") {
      if (!prepared.dataUrl) {
        return {
          valid: false,
          unavailable: false,
          confidence: 0,
          detectedDocumentType: "Invalid image",
          message:
            "The uploaded document image is invalid. Please upload a clear image.",
        };
      }

      logger.info(
        {
          requirementName,
          mimeType,
        },
        "Sending image document to Gemini",
      );

      result = await chatVisionJson({
        system: DOCUMENT_CHECK_SYSTEM_PROMPT,

        user: userPrompt,

        images: [
          {
            dataUrl: prepared.dataUrl,
          },
        ],

        schema: documentVerificationSchema,
      });
    } else if (prepared.kind === "pdf") {

    /*
     * --------------------------------------------------------
     * PDF
     *
     * IMPORTANT:
     * Native PDF is sent directly to Gemini.
     * No pdf-parse dependency is required for verification.
     * --------------------------------------------------------
     */
      if (!prepared.dataUrl) {
        return {
          valid: false,
          unavailable: false,
          confidence: 0,
          detectedDocumentType: "Invalid PDF",
          message:
            "The uploaded PDF could not be read. Please upload a valid PDF.",
        };
      }

      logger.info(
        {
          requirementName,
          mimeType: "application/pdf",
        },
        "Sending PDF directly to Gemini for native document verification",
      );

      result = await chatVisionJson({
        system: DOCUMENT_CHECK_SYSTEM_PROMPT,

        user: `${userPrompt}

IMPORTANT:
This file is a PDF.
Inspect the actual PDF pages visually and semantically.
Do NOT assume it is unreadable just because normal PDF text extraction is poor.
If the PDF contains a scanned Aadhaar card, College ID, or other identity card,
inspect the visual document and classify it from what is actually visible.`,

        images: [
          {
            dataUrl: prepared.dataUrl,
          },
        ],

        schema: documentVerificationSchema,
      });
    } else if (prepared.kind === "text") {

    /*
     * --------------------------------------------------------
     * TEXT
     * --------------------------------------------------------
     */
      if (!prepared.text?.trim()) {
        return {
          valid: false,
          unavailable: false,
          confidence: 0,
          detectedDocumentType: "Unreadable document",
          message: "No readable content was found in the uploaded document.",
        };
      }

      logger.info(
        {
          requirementName,
          mimeType,
        },
        "Sending text document to Gemini",
      );

      result = await chatJson({
        system: DOCUMENT_CHECK_SYSTEM_PROMPT,

        user: `${userPrompt}

DOCUMENT CONTENT:
"""
${prepared.text}
"""`,

        schema: documentVerificationSchema,
      });
    } else {
      return {
        valid: false,
        unavailable: false,
        confidence: 0,
        detectedDocumentType: "Unsupported document",
        message: "The uploaded document type is not supported.",
      };
    }

    /*
     * ----------------------------------------------------------
     * STEP 5
     * EMPTY RESPONSE
     * ----------------------------------------------------------
     */

    if (!result) {
      logger.warn(
        {
          requirementName,
          mimeType,
        },
        "Gemini returned an empty verification result",
      );

      return {
        valid: false,
        unavailable: true,
        confidence: 0,
        detectedDocumentType: "Unable to verify",
        message:
          "Document verification is temporarily unavailable. Please try again in a moment.",
      };
    }

    /*
     * ----------------------------------------------------------
     * STEP 6
     * NORMALIZE
     * ----------------------------------------------------------
     */

    const matchesRequirement = result.matchesRequirement === true;

    const confidence =
      typeof result.confidence === "number" ? result.confidence : 0;

    const detectedDocumentType =
      result.detectedDocumentType?.trim() || "Unknown document";

    const message =
      result.summary?.trim() ||
      "The uploaded document does not match the required document.";

    /*
     * ----------------------------------------------------------
     * STEP 7
     * DECISION
     * ----------------------------------------------------------
     *
     * Do not reject a document solely because Gemini returned
     * 0.79 instead of 0.80.
     *
     * The model's matchesRequirement boolean is the semantic decision.
     */

    const valid = matchesRequirement;

    /*
     * ----------------------------------------------------------
     * CORRECT DOCUMENT
     * ----------------------------------------------------------
     */

    if (valid) {
      logger.info(
        {
          requirementName,
          detectedDocumentType,
          confidence,
        },
        "Student document verified successfully",
      );

      return {
        valid: true,
        unavailable: false,
        confidence,
        detectedDocumentType,
        message,
        raw: result,
      };
    }

    /*
     * ----------------------------------------------------------
     * WRONG DOCUMENT
     * ----------------------------------------------------------
     */

    logger.warn(
      {
        requirementName,
        detectedDocumentType,
        confidence,
        matchesRequirement,
      },
      "Student document did not match requirement",
    );

    return {
      valid: false,
      unavailable: false,
      confidence,
      detectedDocumentType,
      message,
      raw: result,
    };
  } catch (error) {
    /*
     * ----------------------------------------------------------
     * STEP 8
     * GEMINI/API FAILURE
     * ----------------------------------------------------------
     *
     * This is NOT a document rejection.
     * unavailable=true allows the caller to distinguish
     * AI outage from genuinely wrong document.
     */

    logger.error(
      {
        error: error?.message ?? String(error),
        requirementName,
        mimeType,
      },
      "Student document AI verification failed",
    );

    return {
      valid: false,
      unavailable: true,
      confidence: 0,
      detectedDocumentType: "Unable to verify",
      message:
        "Document verification is temporarily unavailable. Please try again in a moment.",
    };
  }
}
