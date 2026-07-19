import { useEffect, useState } from 'react';

import apiClient from '../../../infrastructure/http/apiClient';

/**
 * Fetches the Template Kernel gallery (`GET /templates/`) and shapes it into a
 * file-tree ROOT — templates browsed as files, grouped by kind, so the HUD's
 * existing FileTree renders them. Each leaf carries its template summary on
 * `__template` so a click can open the preview.
 */
const KIND_LABELS = {
  security_report_template: 'Security Reports',
  workflow_template: 'Workflows'
};

const KIND_ORDER = ['security_report_template', 'workflow_template'];

export default function useTemplatesTree(workspaceId) {
  const [root, setRoot] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const params = workspaceId ? { workspace_id: workspaceId } : {};
        const res = await apiClient.get('/templates/', { params });
        const results = res?.data?.results || [];

        const byKind = {};
        results.forEach((t) => {
          (byKind[t.kind] ||= []).push(t);
        });
        const kinds = KIND_ORDER.filter((k) => byKind[k]).concat(
          Object.keys(byKind).filter((k) => !KIND_ORDER.includes(k))
        );

        const children = kinds.map((k) => ({
          name: KIND_LABELS[k] || k,
          type: 'folder',
          children: (byKind[k] || []).map((t) => ({
            name: t.name,
            type: 'doc',
            __template: t
          }))
        }));

        if (alive) {
          setRoot({ name: 'templates', type: 'folder', children });
          setTemplates(results);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [workspaceId]);

  return { root, templates, loading, error };
}
