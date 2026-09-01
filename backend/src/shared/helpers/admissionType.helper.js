/**
 * Admission type helpers
 *
 * Supported:
 * - REGULAR
 * - TRANSFER
 *
 * Backward compatible:
 * Existing offerings that only have eligibilityRules /
 * documentRequirements continue to work as REGULAR.
 */

export const ADMISSION_TYPES = Object.freeze({
  REGULAR: "REGULAR",
  TRANSFER: "TRANSFER",
});

export function normalizeAdmissionType(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (normalized === ADMISSION_TYPES.TRANSFER) {
    return ADMISSION_TYPES.TRANSFER;
  }

  return ADMISSION_TYPES.REGULAR;
}

/**
 * Get eligibility rules for the selected admission type.
 *
 * New structure:
 *
 * eligibilityByAdmissionType: {
 *   regular: [...],
 *   transfer: [...]
 * }
 *
 * Backward compatibility:
 *
 * eligibilityRules: [...]
 *
 * is treated as regular eligibility.
 */
export function getEligibilityRulesForAdmissionType(
  offering,
  admissionType = ADMISSION_TYPES.REGULAR,
) {
  const type = normalizeAdmissionType(admissionType);

  const grouped = offering?.eligibilityByAdmissionType;

  if (grouped && typeof grouped === "object" && !Array.isArray(grouped)) {
    if (type === ADMISSION_TYPES.TRANSFER) {
      return Array.isArray(grouped.transfer) ? grouped.transfer : [];
    }

    return Array.isArray(grouped.regular) ? grouped.regular : [];
  }

  if (type === ADMISSION_TYPES.REGULAR) {
    return Array.isArray(offering?.eligibilityRules)
      ? offering.eligibilityRules
      : [];
  }

  return [];
}

/**
 * Get document requirements for the selected
 * admission type.
 *
 * New structure:
 *
 * documentsByAdmissionType: {
 *   regular: [...],
 *   transfer: [...]
 * }
 *
 * Existing documentRequirements remain REGULAR.
 */
export function getDocumentRequirementsForAdmissionType(
  offering,
  admissionType = ADMISSION_TYPES.REGULAR,
) {
  const type = normalizeAdmissionType(admissionType);

  const grouped = offering?.documentsByAdmissionType;

  if (grouped && typeof grouped === "object" && !Array.isArray(grouped)) {
    if (type === ADMISSION_TYPES.TRANSFER) {
      return Array.isArray(grouped.transfer) ? grouped.transfer : [];
    }

    return Array.isArray(grouped.regular) ? grouped.regular : [];
  }

  if (type === ADMISSION_TYPES.REGULAR) {
    return Array.isArray(offering?.documentRequirements)
      ? offering.documentRequirements
      : [];
  }

  return [];
}

/**
 * Return a student-friendly label.
 */
export function getAdmissionTypeLabel(admissionType) {
  return normalizeAdmissionType(admissionType) === ADMISSION_TYPES.TRANSFER
    ? "Transfer Admission"
    : "Regular Admission";
}

/**
 * Validate admission type.
 */
export function isValidAdmissionType(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  return (
    normalized === ADMISSION_TYPES.REGULAR ||
    normalized === ADMISSION_TYPES.TRANSFER
  );
}
