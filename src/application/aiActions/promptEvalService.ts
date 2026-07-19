import { promptEvalApi } from '../../infrastructure/aiActions/promptEvalApi';

/**
 * Wave 4 of the prompt-evaluation plan — application service for
 * reading prompt-eval reports. Wraps the API client in DRF-paginated
 * defaults so the hook layer never has to inspect raw axios shapes.
 */

export interface PromptEvalReportSummary {
  filename: string;
  prompt_id: string;
  version: string;
  label?: string | null;
  created_at: string;
  case_count: number;
  avg_score: number;
  pass_rate_at_seven: number;
  score_by_category?: Record<string, number> | null;
}

export interface PromptEvalReportListParams {
  prompt_id?: string;
  version?: string;
  page_size?: number;
}

export interface PromptEvalReportListResponse {
  results: PromptEvalReportSummary[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const listPromptEvalReports = async (
  params: PromptEvalReportListParams = {}
): Promise<PromptEvalReportListResponse> => {
  const normalized: Record<string, unknown> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    normalized[key] = value;
  });
  const response = await promptEvalApi.listReports(normalized);
  const data = response.data || {};
  return {
    results: Array.isArray(data.results) ? data.results : [],
    count: typeof data.count === 'number' ? data.count : 0,
    next: data.next ?? null,
    previous: data.previous ?? null
  };
};

export const retrievePromptEvalReport = async (filename: string) => {
  const response = await promptEvalApi.retrieveReport(filename);
  return response.data;
};
