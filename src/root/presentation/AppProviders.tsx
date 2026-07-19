import React, { type PropsWithChildren } from 'react';

import Default from '../../components/Partials/Default';
import { AgentProvider } from '../../features/agents/presentation/AgentContext';
import { AiChatProvider } from '../../features/ai-chat/presentation/AiChatContext';
import { AuthProvider } from '../../features/auth/presentation/AuthContext';
import { CartProvider } from '../../features/shop/presentation/CartContext';
import ConnectivityBanner from '../../components/Error/ConnectivityBanner';
import ErrorBoundary from '../../components/Error/ErrorBoundary';
import { ErrorToastContextProvider } from '../../features/error-toast/presentation/ErrorToastContext';
import { FeatureFlagsProvider } from '../../features/feature-flags/presentation/FeatureFlagsContext';
import { FilterProvider } from '../../features/shop/presentation/FilterContext';
import { ItemProvider } from '../../features/shop/presentation/ItemContext';
import { KanbanBoardProvider } from '../../features/kanban/presentation/KanbanBoardContext';
import { LangProvider } from '../../features/language/presentation/LanguageContext';
import { LoginAuthProvider } from '../../features/auth/presentation/LoginAuthContext';
import { NotificationsProvider } from '../../features/notifications/presentation/NotificationsContext';
import { PaymentsProvider } from '../../features/payments/presentation/PaymentsContext';
import { SeedProvider } from '../../features/seed/presentation/SeedContext';
import { WorkspacePermissionsProvider } from '../../features/workspace-permissions/presentation/WorkspacePermissionsContext';
import { StoreProvider } from '../../features/shop/presentation/StoreContext';
import { ThemeProvider } from '../../features/theme/presentation/ThemeContext';
import { UserProfileProvider } from '../../features/user/profile/presentation/UserProfileContext';
import { WorkflowProvider } from '../../features/workflow/presentation/WorkflowContext';
import { BackgroundJobsProvider } from '../../features/background-jobs/presentation/BackgroundJobsContext';
import BackgroundJobReviewModal from '../../features/background-jobs/presentation/BackgroundJobReviewModal';
import BackgroundJobsStatusModal from '../../features/background-jobs/presentation/BackgroundJobsStatusModal';

export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <Default>
      <ThemeProvider>
        <FeatureFlagsProvider>
          <ErrorToastContextProvider>
            <ConnectivityBanner />
            <LangProvider>
              <AuthProvider>
                <LoginAuthProvider>
                  <UserProfileProvider>
                    <SeedProvider>
                      <WorkspacePermissionsProvider>
                        <PaymentsProvider>
                          <AiChatProvider>
                            <AgentProvider>
                              <StoreProvider>
                                <CartProvider>
                                  <ItemProvider>
                                    <KanbanBoardProvider>
                                      <NotificationsProvider>
                                        <WorkflowProvider>
                                          <BackgroundJobsProvider>
                                            <BackgroundJobReviewModal />
                                            <BackgroundJobsStatusModal />
                                            <FilterProvider>
                                              <ErrorBoundary fallbackMessage="Something went wrong. Please refresh the page.">
                                                {children}
                                              </ErrorBoundary>
                                            </FilterProvider>
                                          </BackgroundJobsProvider>
                                        </WorkflowProvider>
                                      </NotificationsProvider>
                                    </KanbanBoardProvider>
                                  </ItemProvider>
                                </CartProvider>
                              </StoreProvider>
                            </AgentProvider>
                          </AiChatProvider>
                        </PaymentsProvider>
                      </WorkspacePermissionsProvider>
                    </SeedProvider>
                  </UserProfileProvider>
                </LoginAuthProvider>
              </AuthProvider>
            </LangProvider>
          </ErrorToastContextProvider>
        </FeatureFlagsProvider>
      </ThemeProvider>
    </Default>
  );
}
