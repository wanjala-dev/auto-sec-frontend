import { useSeedBudgetPresentation } from './useSeedBudgetPresentation';
import { useSeedCollaborationPresentation } from './useSeedCollaborationPresentation';
import { useSeedDonationsPresentation } from './useSeedDonationsPresentation';
import { useSeedEntityPresentation } from './useSeedEntityPresentation';
import { useSeedPreferencesPresentation } from './useSeedPreferencesPresentation';
import { useSeedProjectPresentation } from './useSeedProjectPresentation';
import { useSeedResourcePresentation } from './useSeedResourcePresentation';
import { useSeedSponsorshipPresentation } from './useSeedSponsorshipPresentation';
import { useSeedTransactionsPresentation } from './useSeedTransactionsPresentation';
import { useSeedWorkspacePresentation } from './useSeedWorkspacePresentation';

export const useSeedPresentationSlices = ({
  state,
  dispatch,
  addToast,
  notifySuccess,
  notifyError,
  activeSeed,
  activeBanners,
  selectedChild,
  support
}: {
  state: any;
  dispatch: any;
  addToast: any;
  notifySuccess: any;
  notifyError: any;
  activeSeed: any;
  activeBanners: any;
  selectedChild: any;
  support: any;
}) => {
  const project = useSeedProjectPresentation({
    dispatch,
    stateSeed: state.seed
  });

  const preferences = useSeedPreferencesPresentation({
    dispatch
  });

  const donationsActions = useSeedDonationsPresentation({
    dispatch,
    addToast
  });

  const collaboration = useSeedCollaborationPresentation({
    dispatch,
    addToast,
    notifySuccess,
    notifyError,
    isCacheEntryFresh: support.isCacheEntryFresh,
    seedCacheRef: support.seedCacheRef,
    latestSeedRef: support.latestSeedRef,
    stateSeed: state.seed
  });

  const resource = useSeedResourcePresentation({
    dispatch,
    addToast,
    notifySuccess,
    notifyError,
    isCacheEntryFresh: support.isCacheEntryFresh,
    resolveUserId: support.resolveUserId,
    seedCacheRef: support.seedCacheRef,
    seedRequestRef: support.seedRequestRef,
    latestSeedRef: support.latestSeedRef,
    seedsCacheRef: support.seedsCacheRef,
    userSeedsCacheRef: support.userSeedsCacheRef,
    mergeTeamCollections: collaboration.mergeTeamCollections,
    persistSeedSnapshot: collaboration.persistSeedSnapshot,
    stateSeed: state.seed
  });

  const workspace = useSeedWorkspacePresentation({
    activeSeed,
    activeBanners,
    dispatch,
    addToast,
    getSeed: resource.getSeed,
    isCacheEntryFresh: support.isCacheEntryFresh
  });

  const budget = useSeedBudgetPresentation({
    dispatch,
    addToast,
    notifySuccess,
    notifyError,
    isCacheEntryFresh: support.isCacheEntryFresh,
    seedCacheRef: support.seedCacheRef
  });

  const transactions = useSeedTransactionsPresentation({
    dispatch,
    addToast,
    budgetCategories: budget.budgetCategories,
    budgets: state?.budgets
  });

  const sponsorship = useSeedSponsorshipPresentation({
    dispatch,
    addToast,
    seedCacheRef: support.seedCacheRef,
    seedRequestRef: support.seedRequestRef,
    stateTeamEvents: state?.teamEvents
  });

  const entity = useSeedEntityPresentation({
    dispatch,
    addToast,
    activeSeed,
    selectedChild,
    getSeed: resource.getSeed,
    updateSeedDetails: resource.updateSeedDetails
  });

  return {
    project,
    preferences,
    donationsActions,
    collaboration,
    resource,
    workspace,
    budget,
    transactions,
    sponsorship,
    entity
  };
};
