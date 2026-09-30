import fs from "fs";

/** Maximum extracted text used by RAG/corpus processing. */
const MAX_EXTRACT_CHARS = 200_000;

/** Maximum text sent to the text-based verifier. */
const MAX_VERIFY_TEXT_CHARS = 12_000;

/** Minimum text required for a text-only document. */
const MIN_READABLE_TEXT_CHARS = 20;

/** Supported image MIME types. */
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

/**
 * Normalize extracted text.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeExtractedText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract readable text from a document.
 *
 * PDFs are still extracted here because other parts of the
 * application may need text/RAG processing.
 *
 * IMPORTANT:
 * Verification does NOT depend on this extraction for PDFs.
 *
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
export async function extractTextFromDocument(filePath, mimeType) {
  if (!filePath) {
    console.warn("[document-text] No file path provided");

    return "";
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`[document-text] File does not exist: ${filePath}`);

    return "";
  }

  let text = "";

  try {
    if (mimeType === "application/pdf") {
      text = await extractPdfText(filePath);
    } else if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      text = await extractDocxText(filePath);
    } else if (mimeType === "text/plain" || mimeType === "text/markdown") {
      text = fs.readFileSync(filePath, "utf8");
    } else {
      console.warn(`[document-text] Unsupported MIME type: ${mimeType}`);

      return "";
    }
  } catch (error) {
    console.error("[document-text] Document extraction failed", {
      filePath,
      mimeType,
      error: error?.message ?? String(error),
    });

    return "";
  }

  const normalized = normalizeExtractedText(text);

  return normalized.slice(0, MAX_EXTRACT_CHARS);
}

/**
 * Extract text from PDF using pdf-parse v2.
 *
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function extractPdfText(filePath) {
  let parser = null;

  try {
    const { PDFParse } = await import("pdf-parse");

    if (!PDFParse) {
      throw new Error("PDFParse export was not found");
    }

    const buffer = fs.readFileSync(filePath);

    if (!buffer.length) {
      throw new Error("PDF file is empty");
    }

    parser = new PDFParse({
      data: buffer,
    });

    const result = await parser.getText();

    const text = result?.text ?? "";

    const normalized = normalizeExtractedText(text);

    console.log("[document-text] PDF extraction successful", {
      filePath,
      extractedCharacters: normalized.length,
    });

    return normalized;
  } catch (error) {
    console.error("[document-text] PDF extraction failed", {
      filePath,
      error: error?.message ?? String(error),
    });

    return "";
  } finally {
    try {
      if (parser && typeof parser.destroy === "function") {
        await parser.destroy();
      }
    } catch (error) {
      console.warn("[document-text] PDF parser destroy failed", {
        error: error?.message ?? String(error),
      });
    }
  }
}

/**
 * Extract text from DOCX/DOC.
 *
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function extractDocxText(filePath) {
  try {
    const mammoth = await import("mammoth");

    const result = await mammoth.extractRawText({
      path: filePath,
    });

    const text = result?.value ?? "";

    const normalized = normalizeExtractedText(text);

    console.log("[document-text] DOCX extraction successful", {
      filePath,
      extractedCharacters: normalized.length,
    });

    return normalized;
  } catch (error) {
    console.error("[document-text] DOCX extraction failed", {
      filePath,
      error: error?.message ?? String(error),
    });

    return "";
  }
}

/**
 * Convert a local image to a Gemini-ready data URL.
 *
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {Promise<string|null>}
 */
async function imageFileToDataUrl(filePath, mimeType) {
  try {
    const buffer = fs.readFileSync(filePath);

    if (!buffer.length) {
      return null;
    }

    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("[document-text] Failed to load image", {
      filePath,
      mimeType,
      error: error?.message ?? String(error),
    });

    return null;
  }
}

/**
 * Convert a local PDF directly to a Gemini-ready
 * application/pdf data URL.
 *
 * IMPORTANT:
 *
 * We intentionally do NOT render the PDF into PNG.
 * Gemini supports PDF natively and can inspect the
 * visual/textual contents of the document.
 *
 * @param {string} filePath
 * @returns {Promise<string|null>}
 */
async function pdfFileToDataUrl(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);

    if (!buffer.length) {
      return null;
    }

    return `data:application/pdf;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("[document-text] Failed to load PDF", {
      filePath,
      error: error?.message ?? String(error),
    });

    return null;
  }
}

/**
 * Prepare one uploaded document for AI verification.
 *
 * IMPORTANT FLOW:
 *
 * IMAGE
 *   -> Gemini vision
 *
 * PDF
 *   -> Gemini native PDF input
 *
 * DOCX/TXT/MD
 *   -> extracted text
 *
 * Therefore a scanned Aadhaar PDF no longer becomes
 * "Unreadable document" merely because pdf-parse extracted
 * only a few characters.
 *
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {Promise<{
 *   kind: "image" | "pdf" | "text" | "unreadable",
 *   dataUrl?: string,
 *   text?: string,
 *   reason?: string
 * }>}
 */
export async function prepareDocumentForVerification(filePath, mimeType) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      kind: "unreadable",
      reason: "File is missing on the server",
    };
  }

  /*
   * ---------------------------------------------------------
   * IMAGE
   * ---------------------------------------------------------
   */

  if (IMAGE_MIME_TYPES.has(mimeType)) {
    const dataUrl = await imageFileToDataUrl(filePath, mimeType);

    if (!dataUrl) {
      return {
        kind: "unreadable",
        reason: "Image file could not be read",
      };
    }

    return {
      kind: "image",
      dataUrl,
    };
  }

  /*
   * ---------------------------------------------------------
   * PDF
   * ---------------------------------------------------------
   *
   * DO NOT rely on pdf-parse for verification.
   *
   * Even if extraction gives 12 chars, the PDF itself may
   * contain a perfectly readable scanned ID.
   */

  if (mimeType === "application/pdf") {
    const dataUrl = await pdfFileToDataUrl(filePath);

    if (!dataUrl) {
      return {
        kind: "unreadable",
        reason: "PDF file could not be read",
      };
    }

    return {
      kind: "pdf",
      dataUrl,
    };
  }

  /*
   * ---------------------------------------------------------
   * TEXT DOCUMENTS
   * ---------------------------------------------------------
   */

  const text = await extractTextFromDocument(filePath, mimeType);

  const trimmed = text.trim();

  if (trimmed.length >= MIN_READABLE_TEXT_CHARS) {
    return {
      kind: "text",
      text: trimmed.slice(0, MAX_VERIFY_TEXT_CHARS),
    };
  }

  return {
    kind: "unreadable",
    reason: "No readable content found in the file",
  };
}

/**
 * Build combined extracted text from multiple documents.
 *
 * Used by knowledge/RAG functionality.
 *
 * @param {Array<{
 *   extractedText?: string,
 *   filePath?: string,
 *   mimeType?: string,
 *   originalName?: string
 * }>} documents
 *
 * @returns {Promise<string>}
 */
export async function buildCombinedDocumentText(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return "";
  }

  const parts = [];

  for (const doc of documents) {
    if (!doc) {
      continue;
    }

    let text =
      typeof doc.extractedText === "string" ? doc.extractedText.trim() : "";

    if (!text && doc.filePath && doc.mimeType) {
      text = await extractTextFromDocument(doc.filePath, doc.mimeType);
    }

    text = normalizeExtractedText(text);

    if (text) {
      parts.push(`--- ${doc.originalName ?? "Document"} ---\n${text}`);
    } else {
      console.warn("[document-text] No text extracted from document", {
        originalName: doc.originalName ?? "Document",
        mimeType: doc.mimeType,
        filePath: doc.filePath,
      });
    }
  }

  return parts.join("\n\n").slice(0, MAX_EXTRACT_CHARS);
}
