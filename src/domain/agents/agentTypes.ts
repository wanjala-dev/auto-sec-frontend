const AGENT_TYPE_MAPPING = {
  financial: 'financial_agent',
  project: 'project_agent',
  project_management: 'project_agent',
  task: 'task_agent',
  task_management: 'task_agent',
  donation: 'donation_agent',
  fundraising: 'fundraising_agent',
  sponsorship: 'sponsorship_agent',
  child_sponsorship: 'sponsorship_agent',
  organization: 'seed_agent',
  seed: 'seed_agent',
  news: 'blog_agent',
  blog: 'blog_agent',
  budget: 'budget_agent',
  budget_agent: 'budget_agent',
  unknown: 'financial_agent',
  generic: 'financial_agent',
  default: 'financial_agent'
};

const VALID_AGENT_TYPES = new Set([
  'blog_agent',
  'donation_agent',
  'dynamic',
  'budget_agent',
  'financial_agent',
  'fundraising_agent',
  'project_agent',
  'seed_agent',
  'sponsorship_agent',
  'task_agent'
]);

export const normalizeCreateAgentType = (agentTypeSlug: string) => {
  const normalizedInput = (agentTypeSlug || '').toString().toLowerCase();
  const mappedType = AGENT_TYPE_MAPPING[normalizedInput] || normalizedInput;

  if (!VALID_AGENT_TYPES.has(mappedType)) {
    return 'financial';
  }

  return mappedType;
};
