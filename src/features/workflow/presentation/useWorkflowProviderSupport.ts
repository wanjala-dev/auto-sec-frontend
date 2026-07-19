import { useMemo } from 'react';
import {
  DEFAULT_WORKFLOW_TEMPLATE,
  WORKFLOW_TEMPLATE_DEFINITIONS
} from '../../../reducer/workflowReducer';
import type { WorkflowTemplate } from '../../../types/workflow';
import { normalizeTemplateGraph } from '../../../domain/workflow/workflowNormalizers';

const getErrorMessage = (error: any, fallback: string) => {
  if (!error) return fallback;
  const responseData = error?.response?.data;
  return (
    responseData?.detail ||
    responseData?.message ||
    responseData?.error ||
    error.message ||
    fallback
  );
};

const mapTemplatesById = (
  templates: WorkflowTemplate[] = []
): Record<string, WorkflowTemplate> =>
  templates.reduce<Record<string, WorkflowTemplate>>((acc, template) => {
    if (template?.id) acc[template.id] = template;
    return acc;
  }, {});

const mergeTemplates = (
  localTemplates: WorkflowTemplate[] = [],
  apiTemplates: WorkflowTemplate[] = []
) => {
  const merged = {
    ...mapTemplatesById(localTemplates)
  };
  apiTemplates.forEach((template) => {
    if (!template?.id) return;
    merged[template.id] = {
      ...merged[template.id],
      ...template
    };
  });
  return Object.values(merged) as WorkflowTemplate[];
};

export const useWorkflowProviderSupport = ({ state }: { state: any }) => {
  const localTemplates = useMemo<WorkflowTemplate[]>(
    () =>
      WORKFLOW_TEMPLATE_DEFINITIONS.map((template) =>
        normalizeTemplateGraph(template)
      ) as WorkflowTemplate[],
    []
  );

  const apiTemplates = useMemo<WorkflowTemplate[]>(
    () =>
      Array.isArray(state.templates.items)
        ? (state.templates.items.map((template) =>
            normalizeTemplateGraph(template as WorkflowTemplate)
          ) as WorkflowTemplate[])
        : [],
    [state.templates.items]
  );

  const mergedTemplates = useMemo<WorkflowTemplate[]>(() => {
    if (!apiTemplates.length) return localTemplates;
    return mergeTemplates(localTemplates, apiTemplates);
  }, [apiTemplates, localTemplates]);

  const workflowTemplateOptions = useMemo(
    () =>
      mergedTemplates.map((template) => ({
        ...template
      })),
    [mergedTemplates]
  );

  const workflowTemplate = useMemo<WorkflowTemplate>(() => {
    const selected = mergedTemplates.find(
      (template: WorkflowTemplate) => template.id === state.templateId
    );
    return (
      selected ||
      mergedTemplates[0] ||
      (normalizeTemplateGraph(DEFAULT_WORKFLOW_TEMPLATE) as WorkflowTemplate)
    );
  }, [mergedTemplates, state.templateId]);

  return {
    getErrorMessage,
    mergedTemplates,
    workflowTemplateOptions,
    workflowTemplate
  };
};
