import apiClient from '../http/apiClient';

/**
 * Wave 4 of the prompt-evaluation plan — frontend API client for the
 * agent prompt-eval report endpoints.
 *
 * The backend serves these from ``/ai/prompt-eval/reports/`` and
 * ``/ai/prompt-eval/reports/<filename>/``. Both require auth + a
 * workspace-scoped admin/owner permission. The list endpoint accepts
 * optional ``prompt_id`` + ``version`` query filters and returns a
 * DRF-paginated payload.
 */
export const promptEvalApi = {
  /**
   * List eval reports across all prompts. Each result row has the
   * summary shape ``{ filename, prompt_id, version, label, created_at,
   * case_count, avg_score, pass_rate_at_seven, score_by_category }``.
   *
   * Optional filters:
   *   prompt_id  - filter to a single prompt
   *   version    - combine with prompt_id to pin a version
   *   page_size  - DRF page size override
   */
  listReports: (params?: Record<string, unknown>) =>
    apiClient.get('/ai/prompt-eval/reports/', params ? { params } : undefined),

  /**
   * Fetch the full eval report JSON for one filename. Returns the same
   * shape the harness writes to ``docs/eval-reports/`` — has
   * ``cases: [{ id, score, code_grades, model_grades, ... }]`` etc.
   */
  retrieveReport: (filename: string) =>
    apiClient.get(`/ai/prompt-eval/reports/${encodeURIComponent(filename)}/`)
};

export default promptEvalApi;
