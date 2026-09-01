import { apiClient } from "@/config/api";

export const offeringsApi = {
  /**
   * ============================================================
   * OFFERINGS
   * ============================================================
   */

  list: (serviceId) =>
    apiClient.get("/offerings", {
      params: serviceId ? { serviceId } : undefined,
    }),

  create: (data) => apiClient.post("/offerings", data),

  get: (id) => apiClient.get(`/offerings/${id}`),

  update: (id, data) => apiClient.patch(`/offerings/${id}`, data),

  /*
   * Backend:
   * PUT /:id/details
   */
  updateDetails: (id, data) => apiClient.put(`/offerings/${id}/details`, data),

  /*
   * Backend:
   * PUT /:id/payment
   */
  updatePayment: (id, paymentConfig) =>
    apiClient.put(`/offerings/${id}/payment`, {
      paymentConfig,
    }),

  /**
   * ============================================================
   * ELIGIBILITY
   * ============================================================
   *
   * Backend:
   * PUT /:id/eligibility
   *
   * admissionType:
   *   REGULAR
   *   TRANSFER
   */

  updateEligibility: (id, admissionType, rules) =>
    apiClient.put(`/offerings/${id}/eligibility`, {
      admissionType,
      rules,
    }),

  /**
   * ============================================================
   * DOCUMENT REQUIREMENTS
   * ============================================================
   *
   * Backend:
   * PUT /:id/documents
   */

  updateDocuments: (id, admissionType, requirements) =>
    apiClient.put(`/offerings/${id}/documents`, {
      admissionType,
      requirements,
    }),

  /**
   * ============================================================
   * WORKFLOW
   * ============================================================
   *
   * Backend:
   * PUT /:id/workflow
   */

  updateWorkflow: (id, steps) =>
    apiClient.put(`/offerings/${id}/workflow`, {
      steps,
    }),

  /**
   * ============================================================
   * QUEUE
   * ============================================================
   *
   * Backend:
   * PUT /:id/queue
   */

  updateQueue: (id, data) => apiClient.put(`/offerings/${id}/queue`, data),

  /**
   * ============================================================
   * ACTIVATION / DUPLICATION / DELETE
   * ============================================================
   */

  activate: (id) => apiClient.post(`/offerings/${id}/activate`),

  duplicate: (id) => apiClient.post(`/offerings/${id}/duplicate`),

  remove: (id) => apiClient.delete(`/offerings/${id}`),

  /**
   * ============================================================
   * BULK ACTION
   * ============================================================
   *
   * Backend:
   * POST /bulk
   *
   * NOT /bulk-action
   */

  bulkAction: (data) => apiClient.post("/offerings/bulk", data),

  /**
   * ============================================================
   * AI SUGGESTIONS
   * ============================================================
   */

  generateAiSuggestions: (id, section) =>
    apiClient.post(`/offerings/${id}/ai-suggestions/generate`, {
      section,
    }),

  getAiSuggestions: (id) => apiClient.get(`/offerings/${id}/ai-suggestions`),

  applyAiSuggestions: (id, data) =>
    apiClient.post(`/offerings/${id}/ai-suggestions/apply`, data),

  rejectAiSuggestions: (id) =>
    apiClient.post(`/offerings/${id}/ai-suggestions/reject`),
};
