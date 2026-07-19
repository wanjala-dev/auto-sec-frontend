import { useCallback } from 'react';
import {
  CREATE_DONATION_ERROR,
  CREATE_DONATION_LOADING,
  CREATE_DONATION_SUCCESS,
  GET_DONATIONS,
  GET_DONATIONS_ERROR,
  GET_DONATIONS_LOADING
} from '../../../types/seedTypes';
import {
  createManualDonation as createManualDonationRequest,
  listWorkspaceDonations
} from '../../../application/sponsorship/sponsorshipService';

const DEFAULT_TRANSACTIONS_PAGE_SIZE = 200;
const MAX_TRANSACTIONS_PAGES = 50;

export const useSeedDonationsPresentation = ({
  dispatch,
  addToast
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
}) => {
  type DonationFetchOptions = {
    filters?: Record<string, unknown>;
    page_size?: number;
    maxPages?: number;
  };

  const fetchDonations = useCallback(
    async (seedId, options: DonationFetchOptions = {}) => {
      if (!seedId) {
        dispatch({ type: GET_DONATIONS, payload: [] });
        return [];
      }

      dispatch({ type: GET_DONATIONS_LOADING });

      try {
        const {
          filters: baseFilters = {},
          page_size = DEFAULT_TRANSACTIONS_PAGE_SIZE,
          maxPages = MAX_TRANSACTIONS_PAGES
        } = options;
        const filters = { ...baseFilters };
        if (!Object.prototype.hasOwnProperty.call(filters, 'scope')) {
          filters.scope = 'all';
        }
        const response = await listWorkspaceDonations({
          seedId,
          filters,
          page_size,
          maxPages
        });
        const donationList = response?.items || [];
        dispatch({
          type: GET_DONATIONS,
          payload: donationList || []
        });
        return donationList;
      } catch (error) {
        const message =
          error.response?.data?.message || 'Failed to fetch donations';
        dispatch({
          type: GET_DONATIONS_ERROR,
          payload: message
        });
        if (typeof addToast === 'function') {
          addToast({ message, error: true });
        }
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const addManualDonation = useCallback(
    async (seedId, donationPayload) => {
      if (!seedId) {
        throw new Error('Seed id is required to add a donation');
      }

      dispatch({ type: CREATE_DONATION_LOADING });

      try {
        const normalizedPayload = {
          ...donationPayload,
          recipient:
            donationPayload?.recipient ??
            donationPayload?.child_id ??
            donationPayload?.child ??
            undefined
        };

        if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'child')) {
          delete normalizedPayload.child;
        }
        if (
          Object.prototype.hasOwnProperty.call(normalizedPayload, 'child_id')
        ) {
          delete normalizedPayload.child_id;
        }

        const response = await createManualDonationRequest(
          seedId,
          normalizedPayload
        );
        dispatch({ type: CREATE_DONATION_SUCCESS });
        await fetchDonations(seedId);
        return response;
      } catch (error) {
        const message =
          error.response?.data?.message || 'Unable to add donation';
        dispatch({
          type: CREATE_DONATION_ERROR,
          payload: message
        });
        if (typeof addToast === 'function') {
          addToast({ message, error: true });
        }
        throw error;
      }
    },
    [addToast, dispatch, fetchDonations]
  );

  return {
    fetchDonations,
    addManualDonation
  };
};
