/**
 * Wave 4 of the prompt-evaluation plan — snapshot + empty-state test
 * for the V2 prompt-quality panel.
 *
 * The backend ``/ai/prompt-eval/reports/`` endpoint is not shipped at
 * the time this test lives, so the panel renders an empty state — a
 * calm message pointing operators at ``run_planner_eval``. The test
 * confirms the empty state renders without crashing and matches the
 * snapshot baseline.
 */

jest.mock('../../hooks/useAgentPromptEvalReports', () => ({
  useAgentPromptEvalReports: jest.fn()
}));

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

import HudPromptQualityPanel from './HudPromptQualityPanel';
import { useAgentPromptEvalReports } from '../../hooks/useAgentPromptEvalReports';

const mockedHook = useAgentPromptEvalReports;

const renderInto = (node) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return { container, root };
};

const tearDown = ({ root, container }) => {
  act(() => root.unmount());
  container.remove();
};

describe('<HudPromptQualityPanel />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the calm empty state when there are no reports yet', () => {
    mockedHook.mockReturnValue({
      reports: [],
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    const ctx = renderInto(<HudPromptQualityPanel />);
    expect(ctx.container.textContent).toContain('No eval runs yet');
    expect(ctx.container.textContent).toContain('run_planner_eval');
    // Snapshot the empty state so visual regressions surface in PR review.
    expect(ctx.container.innerHTML).toMatchSnapshot();
    tearDown(ctx);
  });

  it('renders the headline + score table once reports arrive', () => {
    const now = new Date().toISOString();
    mockedHook.mockReturnValue({
      reports: [
        {
          filename: 'planner_v3__latest.json',
          prompt_id: 'planner_v3',
          version: '3',
          label: null,
          created_at: now,
          case_count: 12,
          avg_score: 8.4,
          pass_rate_at_seven: 0.92
        }
      ],
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    const ctx = renderInto(<HudPromptQualityPanel />);
    expect(ctx.container.textContent).toContain('Last 7 days');
    expect(ctx.container.textContent).toContain('1 report');
    expect(ctx.container.textContent).toContain('planner_v3');
    expect(ctx.container.textContent).toContain('8.4');
    tearDown(ctx);
  });

  it('renders the error state with a retry button when the hook errors', () => {
    const refresh = jest.fn();
    mockedHook.mockReturnValue({
      reports: [],
      isLoading: false,
      error: 'forbidden',
      refresh
    });

    const ctx = renderInto(<HudPromptQualityPanel />);
    expect(ctx.container.textContent).toContain('forbidden');
    const retry = ctx.container.querySelector('button');
    expect(retry?.textContent?.toLowerCase()).toContain('retry');
    tearDown(ctx);
  });
});
