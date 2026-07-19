import React from 'react';

import { AgentProvider } from '../../features/agents/presentation/AgentContext';
import { AiChatProvider } from '../../features/ai-chat/presentation/AiChatContext';
import { LoginAuthProvider } from '../../features/auth/presentation/LoginAuthContext';
import { ErrorToastContextProvider } from '../../features/error-toast/presentation/ErrorToastContext';
import { FeatureFlagsProvider } from '../../features/feature-flags/presentation/FeatureFlagsContext';
import { KanbanBoardProvider } from '../../features/kanban/presentation/KanbanBoardContext';
import { SeedProvider } from '../../features/seed/presentation/SeedContext';

/**
 * Minimal React-Context provider tree for the V2 Command Center — the exact
 * contexts the page consumes (Seed, AiChat, Agent, Kanban) plus ErrorToast
 * (SeedProvider depends on it). Deliberately NO redux — auto-sec is
 * Context-only. Kanban is app-wide so the command center can both render the
 * triage board and watch task count to glow the DETECTIONS hex on new findings.
 * Viewer session is read from localStorage (useViewerSession), no provider.
 */
export default function V2Providers({ children }) {
  return (
    <ErrorToastContextProvider>
      <FeatureFlagsProvider>
        <LoginAuthProvider>
          <SeedProvider>
          <AiChatProvider>
            <AgentProvider>
              <KanbanBoardProvider>{children}</KanbanBoardProvider>
            </AgentProvider>
          </AiChatProvider>
          </SeedProvider>
        </LoginAuthProvider>
      </FeatureFlagsProvider>
    </ErrorToastContextProvider>
  );
}
