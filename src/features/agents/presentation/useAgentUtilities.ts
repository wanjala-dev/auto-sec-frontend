import { useMemo } from 'react';
import {
  DEFAULT_AI_ALIAS,
  ensureAbsoluteUrl,
  extractDownloadUrl,
  extractPlainText,
  formatFileSize,
  makePossessive,
  normalizeApiPath,
  resolvePdfUrl
} from './agentUtilities';

export const useAgentUtilities = () =>
  useMemo(
    () => ({
      defaultAlias: DEFAULT_AI_ALIAS,
      makePossessive,
      ensureAbsoluteUrl,
      normalizeApiPath,
      resolvePdfUrl,
      extractDownloadUrl,
      formatFileSize,
      extractPlainText
    }),
    []
  );
