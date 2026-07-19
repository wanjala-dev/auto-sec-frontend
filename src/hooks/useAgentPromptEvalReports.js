import { useCallback, useEffect, useMemo, useState } from 'react';

import { listPromptEvalReports } from '../application/aiActions/promptEvalService';

/**
 * Wave 4 of the prompt-evaluation plan — read prompt-eval reports from
 * ``/ai/prompt-eval/reports/`` with optional ``prompt_id`` + ``version``
 * filters.
 *
 * Contract:
 *   useAgentPromptEvalReports({
 *     prompt_id?: string,
 *     version?: string,
 *     pageSize?: number,   // default 25
 *     enabled?: boolean    // default true
 *   })
 *
 * Response shape per report — written by the eval harness:
 *   {
 *     filename, prompt_id, version, label, created_at,
 *     case_count, avg_score, pass_rate_at_seven,
 *     score_by_category
 *   }
 *
 * Returns: { reports, isLoading, error, refresh }
 */
export const useAgentPromptEvalReports = (options = {}) => {
  const {
    prompt_id: promptId,
    version,
    pageSize = 25,
    enabled = true
  } = options || {};

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stable serialization so the effect only re-fires when the filter
  // values actually change.
  const filterSignature = useMemo(() => {
    const normalized = {};
    if (promptId) normalized.prompt_id = promptId;
    if (version) normalized.version = version;
    if (pageSize) normalized.page_size = pageSize;
    return JSON.stringify(normalized);
  }, [promptId, version, pageSize]);

  const normalizedFilters = useMemo(() => {
    try {
      return JSON.parse(filterSignature) || {};
    } catch (_err) {
      return {};
    }
  }, [filterSignature]);

  const fetchReports = useCallback(async () => {
    if (!enabled) {
      setReports([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await listPromptEvalReports(normalizedFilters);
      setReports(response?.results || []);
    } catch (err) {
      setReports([]);
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load prompt-eval reports.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, normalizedFilters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    isLoading,
    error,
    refresh: fetchReports
  };
};

export default useAgentPromptEvalReports;
