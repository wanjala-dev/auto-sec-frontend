import { useCallback } from 'react';
import { GET_SEED } from '../../../types/seedTypes';

export const useSeedProjectPresentation = ({
  dispatch,
  stateSeed
}: {
  dispatch: any;
  stateSeed: any;
}) => {
  const updateSeedTransactionCategories = useCallback(
    (newCategory) => {
      dispatch({
        type: GET_SEED,
        payload: {
          ...stateSeed,
          transaction_categories: stateSeed?.transaction_categories
            ? [...stateSeed.transaction_categories, newCategory]
            : [newCategory]
        }
      });
    },
    [dispatch, stateSeed]
  );

  const updateBudgetEstimatesInProject = useCallback(
    (seedId, projectId, newEstimate) => {
      dispatch({
        type: GET_SEED,
        payload: {
          ...stateSeed,
          projects: stateSeed?.projects?.map((project) => {
            if (project.pk === projectId) {
              const formattedEstimate = {
                id: newEstimate.id,
                category_name: newEstimate.category?.name || 'Unknown Category',
                amount: newEstimate.amount
              };

              return {
                ...project,
                budget_estimates: project.budget_estimates
                  ? [...project.budget_estimates, formattedEstimate]
                  : [formattedEstimate]
              };
            }
            return { ...project };
          })
        }
      });
    },
    [dispatch, stateSeed]
  );

  const updateProjectUpdatesInProject = useCallback(
    (seedId, projectId, newUpdate) => {
      dispatch({
        type: GET_SEED,
        payload: {
          ...stateSeed,
          projects: stateSeed?.projects?.map((project) => {
            if (project.pk === projectId) {
              return {
                ...project,
                updates: project.updates
                  ? [...project.updates, newUpdate]
                  : [newUpdate]
              };
            }
            return { ...project };
          })
        }
      });
    },
    [dispatch, stateSeed]
  );

  const updateContributionMeansInProject = useCallback(
    (projectId, newContributionMeans) => {
      const newPayload = {
        ...stateSeed,
        projects: stateSeed?.projects?.map((project) =>
          project.pk === projectId
            ? { ...project, contribution_means: newContributionMeans }
            : { ...project }
        ),
        teams: stateSeed?.teams?.map((team) => ({
          ...team,
          projects: team.projects?.map((project) =>
            project.pk === projectId
              ? { ...project, contribution_means: newContributionMeans }
              : { ...project }
          )
        }))
      };
      dispatch({
        type: GET_SEED,
        payload: newPayload
      });
    },
    [dispatch, stateSeed]
  );

  return {
    updateSeedTransactionCategories,
    updateBudgetEstimatesInProject,
    updateProjectUpdatesInProject,
    updateContributionMeansInProject
  };
};
