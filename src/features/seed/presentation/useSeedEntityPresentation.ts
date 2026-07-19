import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CREATE_CHILD_ERROR,
  CREATE_CHILD_LOADING,
  CREATE_CHILD_SUCCESS,
  CREATE_SEED,
  GET_CHILD,
  GET_CHILD_ERROR,
  GET_CHILD_LOADING,
  GET_CHILD_SUCCESS,
  SEED_LOADING
} from '../../../types/seedTypes';
import { normalizeWorkspaceId as normalizeSeedId } from '../../../domain/workspace/workspaceId';
import { fetchChildAggregate } from '../../../application/childLedger/childLedgerService';
import {
  createSponsorshipRecipients,
  fetchSponsorshipChildDetails,
  listSponsorshipChildren,
  updateSponsorshipChild
} from '../../../application/sponsorship/sponsorshipService';
import {
  uploadFileViaPresignedPut,
  uploadWorkspaceFile
} from '../../../application/uploads/uploadsService';
import { createWorkspaceWithLegacyFallback } from '../../../application/workspace/workspaceService';
import { resolveStoredSummaryWorkspaceId } from '../../../domain/auth/storedSummarySelectors';
import { resolveStoredActiveSeedId } from '../../../domain/auth/storedUserSelectors';
import {
  readViewerStoredUser,
  readViewerStoredUserSummary
} from '../../../features/auth/presentation/browserAuthSessionSupport';

const PLACEHOLDER_IMAGE_URL =
  'https://www.slntechnologies.com/wp-content/uploads/2017/08/ef3-placeholder-image.jpg';

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () =>
      reject(reader.error || new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });

const normalizeChildId = (child) => {
  if (!child || typeof child !== 'object') return null;
  const candidate =
    child.id ??
    child.child_id ??
    child.childId ??
    child.pk ??
    child.uuid ??
    child.beneficiary_id ??
    child.beneficiaryId ??
    null;
  if (candidate === null || candidate === undefined) return null;
  return String(candidate);
};

const normalizeChildRecordId = (record) => {
  if (!record || typeof record !== 'object') return null;
  const candidates = [
    record.id,
    record.child_id,
    record.childId,
    record.pk,
    record.beneficiaryId,
    record.beneficiary_id
  ];
  for (const candidate of candidates) {
    const normalized = normalizeSeedId(candidate);
    if (normalized !== null && normalized !== undefined) {
      return normalized;
    }
  }
  return null;
};

const resolveChildCurrency = (child) => {
  const candidates = [
    child?.currency,
    child?.currency_code,
    child?.currencyCode,
    child?.ledgerTotals?.currency,
    child?.ledgerTotals?.currency_code
  ];
  const match = candidates
    .map((code) => (typeof code === 'string' ? code.trim().toUpperCase() : ''))
    .find((code) => code.length === 3);
  return match || 'USD';
};

const mergeChildAggregate = (child, aggregatePayload) => {
  if (!aggregatePayload || typeof aggregatePayload !== 'object') return child;

  const aggregate =
    aggregatePayload.aggregate ||
    aggregatePayload.data ||
    aggregatePayload ||
    {};
  const mergedChild =
    aggregatePayload.child && typeof aggregatePayload.child === 'object'
      ? { ...child, ...aggregatePayload.child }
      : child;

  const totals =
    aggregate.totals || aggregate.summary || aggregate.data || aggregate;

  const totalRaised =
    aggregate.total_raised ??
    totals?.total_raised ??
    totals?.credits ??
    totals?.total_donations ??
    totals?.donations ??
    totals?.total_income ??
    totals?.total_credits ??
    aggregate.total_donations ??
    aggregate.total_income ??
    aggregate.credits ??
    null;

  const totalSponsorshipRaised =
    aggregate.total_sponsorship_raised ??
    totals?.total_sponsorship_raised ??
    null;

  const mergedLedger = {
    ...aggregate,
    total_raised:
      aggregate.total_raised ??
      totals?.total_raised ??
      aggregate.total_donations ??
      aggregate.credits ??
      null,
    total_donations:
      aggregate.total_donations ??
      aggregate.total_raised ??
      totals?.total_donations ??
      totals?.total_raised ??
      totals?.credits ??
      null,
    credits: aggregate.credits ?? totals?.credits ?? null
  };

  return {
    ...mergedChild,
    childLedgerBalance: mergedLedger,
    ledgerTotals: totals,
    total_raised:
      totalRaised !== null && totalRaised !== undefined
        ? totalRaised
        : child.total_raised,
    total_donations:
      totalRaised !== null && totalRaised !== undefined
        ? totalRaised
        : child.total_donations,
    total_sponsorship_raised:
      totalSponsorshipRaised ??
      child.total_sponsorship_raised ??
      child.total_raised
  };
};

const resolveWorkspaceForRecipient = (firstChild) => {
  const explicitCandidates = [
    firstChild?.workspace,
    firstChild?.workspace_id,
    firstChild?.workspaceId,
    firstChild?.seed,
    firstChild?.seed_id,
    firstChild?.seedId
  ];

  for (const candidate of explicitCandidates) {
    const normalized = normalizeSeedId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const summaryWorkspace = normalizeSeedId(
    resolveStoredSummaryWorkspaceId(readViewerStoredUserSummary())
  );
  if (summaryWorkspace) {
    return summaryWorkspace;
  }

  const userWorkspace = normalizeSeedId(
    resolveStoredActiveSeedId(readViewerStoredUser())
  );
  if (userWorkspace) {
    return userWorkspace;
  }

  return null;
};

// Extract a human-readable validation message from a DRF error body.
// The backend wraps validation errors as
// ``{ success: false, data: null, message: <serializer.errors> }``
// where ``message`` is either a per-field dict or, for ``many=True``
// endpoints (e.g. recipient create), a list of per-row dicts. Surface
// the first concrete field message so users see what to fix instead of
// a generic "Server Error!" toast.
const _extractFieldMessage = (payload) => {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const m = _extractFieldMessage(item);
      if (m) return m;
    }
    return null;
  }
  if (typeof payload === 'object') {
    for (const [field, value] of Object.entries(payload)) {
      const inner = _extractFieldMessage(value);
      if (inner) {
        if (field && field !== 'non_field_errors' && field !== 'detail') {
          return `${field}: ${inner}`;
        }
        return inner;
      }
    }
  }
  return null;
};

const showServerErrorToast = (
  addToast,
  error,
  fallbackMessage = 'Server Error!'
) => {
  if (typeof addToast !== 'function') return;
  if (error?.response === undefined) {
    addToast({
      message: 'Unknown Error - check your network connection',
      error: true
    });
    return;
  }
  const status = error.response.status;
  // 4xx validation errors carry actionable per-field messages. Show
  // them verbatim so the user knows which field to fix (e.g.
  // "photo_url: Ensure this field has no more than 500 characters.")
  // instead of the unhelpful "Server Error!" fallback.
  if (status >= 400 && status < 500 && status !== 404) {
    const body = error.response.data;
    const fieldMsg =
      _extractFieldMessage(body?.message) || _extractFieldMessage(body);
    if (fieldMsg) {
      addToast({ message: fieldMsg, error: true });
      return;
    }
  }
  addToast({ message: fallbackMessage, error: true });
};

export const useSeedEntityPresentation = ({
  dispatch,
  addToast,
  activeSeed,
  selectedChild,
  getSeed,
  updateSeedDetails
}: {
  dispatch: any;
  addToast?: ((payload: { message: string; error: boolean }) => void) | null;
  activeSeed?: any;
  selectedChild?: any;
  getSeed: (id: any, options?: Record<string, unknown>) => Promise<any>;
  updateSeedDetails: (
    seedId: any,
    updates?: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => Promise<any>;
}) => {
  const [kids, setKids] = useState<any[]>([]);
  const [childrenTotal, setChildrenTotal] = useState(0);
  const [childrenSponsored, setChildrenSponsored] = useState(0);
  const [childrenPending, setChildrenPending] = useState(0);

  const kidsRef = useRef(kids);
  const childrenRequestsRef = useRef<Record<string, Promise<any>>>({});
  const kidsSeedRef = useRef<any>(null);

  useEffect(() => {
    kidsRef.current = kids;
  }, [kids]);

  const createSeed = useCallback(
    async (file, seed) => {
      dispatch({ type: SEED_LOADING });

      try {
        const seedToCreate = { ...seed };

        if (!seedToCreate.photo_url) {
          seedToCreate.photo_url = PLACEHOLDER_IMAGE_URL;
        }

        let finalSeedData: Record<string, any> =
          (await createWorkspaceWithLegacyFallback(seedToCreate)) || {};
        const createdSeedId = normalizeSeedId(
          finalSeedData?.id ??
            finalSeedData?.pk ??
            finalSeedData?.seed_id ??
            finalSeedData?.uuid ??
            null
        );

        if (file && createdSeedId) {
          try {
            const uploadMeta = await uploadWorkspaceFile({
              file,
              workspaceId: createdSeedId,
              workspaceField: 'workspace_id'
            });
            const uploadedPhotoUrl = uploadMeta?.url || '';
            const uploadedFileId = uploadMeta?.id ?? null;

            const mediaUpdates: Record<string, any> = {};
            if (uploadedPhotoUrl) {
              finalSeedData = {
                ...finalSeedData,
                photo_url: uploadedPhotoUrl
              };
              mediaUpdates.photo_url = uploadedPhotoUrl;
            }
            if (uploadedFileId !== null && uploadedFileId !== undefined) {
              const existingMultimedia = Array.isArray(finalSeedData.multimedia)
                ? finalSeedData.multimedia
                : [];
              if (!existingMultimedia.includes(uploadedFileId)) {
                const nextMultimedia = [...existingMultimedia, uploadedFileId];
                finalSeedData = {
                  ...finalSeedData,
                  multimedia: nextMultimedia
                };
                mediaUpdates.multimedia = nextMultimedia;
              }
            }

            if (Object.keys(mediaUpdates).length) {
              try {
                await updateSeedDetails(createdSeedId, mediaUpdates, {
                  suppressSuccessToast: true,
                  suppressErrorToast: true
                });
              } catch (_) {}
            }
          } catch (_) {
            if (typeof addToast === 'function') {
              addToast({ message: 'Error Uploading Image', error: true });
            }
          }
        }

        dispatch({ type: CREATE_SEED, payload: finalSeedData });
        if (createdSeedId) {
          try {
            await getSeed(createdSeedId, { force: true });
          } catch (_) {}
        }
        if (typeof addToast === 'function') {
          addToast({ message: 'Seed Created!', error: false });
        }
        return { data: finalSeedData };
      } catch (error) {
        showServerErrorToast(addToast, error);
        return null;
      }
    },
    [addToast, dispatch, getSeed, updateSeedDetails]
  );

  const createChild = useCallback(
    async (child, image) => {
      dispatch({
        type: CREATE_CHILD_LOADING
      });

      const payloadArray = Array.isArray(child) ? child : [child];
      const firstChild = payloadArray[0] ? { ...payloadArray[0] } : null;

      if (!firstChild) {
        dispatch({
          type: CREATE_CHILD_ERROR
        });
        if (typeof addToast === 'function') {
          addToast({
            message: 'Unable to add beneficiary. Missing child data.',
            error: true
          });
        }
        throw new Error('createChild requires a valid child payload.');
      }

      const resolvedWorkspaceId = resolveWorkspaceForRecipient(firstChild);

      if (!resolvedWorkspaceId) {
        dispatch({
          type: CREATE_CHILD_ERROR
        });
        if (typeof addToast === 'function') {
          addToast({
            message:
              'Unable to determine workspace for this recipient. Refresh and try again.',
            error: true
          });
        }
        throw new Error('Missing workspace context for recipient creation.');
      }

      // Stable storage key (e.g. ``uploads/<uuid>/photo.jpg``) — what
      // we store on ``Recipient.photo_url``. The backend
      // ``AbsolutePhotoURLField.to_representation`` signs the key on
      // every read so the URL stays fresh forever. Storing a signed
      // URL here was the original bug — it expired in 15 min.
      let uploadedPhotoKey = '';
      let uploadedFileId = null;

      if (image) {
        try {
          // Presigned PUT: bytes go browser → S3 directly, no Django
          // proxying. Falls back to the multipart endpoint when the
          // backend signals 503 (local dev without S3 configured).
          const uploadMeta = await uploadFileViaPresignedPut({
            file: image,
            workspaceId: resolvedWorkspaceId
          });
          uploadedPhotoKey = uploadMeta?.key || '';
          uploadedFileId = uploadMeta?.id ?? null;
        } catch (error) {
          dispatch({
            type: CREATE_CHILD_ERROR
          });
          showServerErrorToast(addToast, error);
          throw error;
        }
      }

      const multimediaList = Array.isArray(firstChild.multimedia)
        ? [...firstChild.multimedia]
        : [];
      if (uploadedFileId !== null && uploadedFileId !== undefined) {
        multimediaList.push(uploadedFileId);
      }

      const payload = {
        ...firstChild,
        ...(uploadedPhotoKey ? { photo_url: uploadedPhotoKey } : {})
      };

      payload.workspace = resolvedWorkspaceId;
      if (payload.workspace_id === undefined) {
        payload.workspace_id = resolvedWorkspaceId;
      }
      if (payload.seed === undefined) {
        payload.seed = resolvedWorkspaceId;
      }

      if (multimediaList.length) {
        payload.multimedia = Array.from(new Set(multimediaList));
      }

      if (!payload.photo_url) {
        payload.photo_url = PLACEHOLDER_IMAGE_URL;
      }

      try {
        const response = await createSponsorshipRecipients([payload]);

        const createdChild =
          (Array.isArray(response?.data) ? response.data[0] : null) ||
          (Array.isArray(response) ? response[0] : null) ||
          null;
        if (createdChild) {
          const normalizedChild = {
            ...createdChild,
            photo_url: createdChild.photo_url || payload.photo_url || '',
            multimedia: Array.isArray(createdChild.multimedia)
              ? createdChild.multimedia
              : []
          };
          if (
            uploadedFileId !== null &&
            uploadedFileId !== undefined &&
            !normalizedChild.multimedia.includes(uploadedFileId)
          ) {
            normalizedChild.multimedia = [
              ...normalizedChild.multimedia,
              uploadedFileId
            ];
          }
          setKids((previousKids) => [normalizedChild, ...previousKids]);
        }

        dispatch({
          type: CREATE_CHILD_SUCCESS
        });
        if (typeof addToast === 'function') {
          addToast({ message: 'Child added!', error: false });
        }
        return response;
      } catch (error) {
        dispatch({
          type: CREATE_CHILD_ERROR
        });
        showServerErrorToast(addToast, error);
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const getChild = useCallback(
    async (seed, id) => {
      if (!seed || id === null || id === undefined) {
        return null;
      }

      dispatch({
        type: GET_CHILD_LOADING
      });
      try {
        const child = await fetchSponsorshipChildDetails(seed, id);

        dispatch({
          type: GET_CHILD,
          payload: child
        });
        dispatch({
          type: GET_CHILD_SUCCESS
        });

        return child;
      } catch (error) {
        dispatch({
          type: GET_CHILD_ERROR
        });
        showServerErrorToast(addToast, error);
        throw error;
      }
    },
    [addToast, dispatch]
  );

  const getChildren = useCallback(
    async (seed, page = 1, { append = false, force = false } = {}) => {
      const seedId = normalizeSeedId(seed);
      if (!seedId) {
        return [];
      }

      const currentPage = Number.isNaN(Number(page)) ? 1 : Number(page);
      const requestType = append && currentPage > 1 ? 'append' : 'replace';
      const requestKey = `${seedId}-${currentPage}-${requestType}`;
      const shouldRefreshLedger = Boolean(force);

      if (
        !force &&
        requestType === 'replace' &&
        currentPage === 1 &&
        kidsSeedRef.current === seedId &&
        Array.isArray(kidsRef.current)
      ) {
        const cachedKids = kidsRef.current || [];
        return cachedKids;
      }

      if (!force) {
        const inFlight = childrenRequestsRef.current[requestKey];
        if (inFlight) {
          return inFlight;
        }
      }

      dispatch({
        type: GET_CHILD_LOADING
      });

      const requestPromise = (async () => {
        try {
          const results = await listSponsorshipChildren(seedId, {
            page: currentPage,
            pageSize: 12
          });
          const fetchedKids = results?.results || [];
          // The list serializer now includes aggregate financial fields
          // (total_raised, total_expenses, balance, sponsor_count, etc.)
          // directly, so there is no need for a separate summary fetch.
          const fetchedKidsWithLoading = fetchedKids.map((kid) => ({
            ...kid,
            childLedgerLoading: false
          }));
          const totalChildren = results?.totalChildren || 0;
          const totalSponsored = results?.totalSponsored || 0;
          const totalPending = results?.totalPending || 0;

          setChildrenTotal(totalChildren);
          setChildrenSponsored(totalSponsored);
          setChildrenPending(totalPending);

          setKids((prevKids) => {
            if (append && currentPage > 1) {
              const merged = [...prevKids, ...fetchedKidsWithLoading];
              const seen = new Set();
              return merged.filter((item) => {
                const key = item?.id || item?.pk;
                if (!key) return true;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            }
            return fetchedKidsWithLoading;
          });

          kidsSeedRef.current = seedId;

          dispatch({
            type: GET_CHILD_SUCCESS
          });

          return fetchedKids;
        } catch (error) {
          dispatch({
            type: GET_CHILD_ERROR
          });
          showServerErrorToast(addToast, error);
          throw error;
        } finally {
          delete childrenRequestsRef.current[requestKey];
        }
      })();

      childrenRequestsRef.current[requestKey] = requestPromise;
      return requestPromise;
    },
    [addToast, dispatch]
  );

  const toggleChildVisibility = useCallback(
    async ({ childId, seedId, hidden }) => {
      const normalizedChildId = normalizeSeedId(childId);
      if (!normalizedChildId) {
        return null;
      }

      const resolvedSeedId =
        normalizeSeedId(seedId) ||
        normalizeSeedId(activeSeed?.id) ||
        normalizeSeedId(activeSeed?.seed_id);

      try {
        const payload = {
          hidden,
          ...(resolvedSeedId ? { seed: resolvedSeedId } : {})
        };
        const updatedChild =
          (await updateSponsorshipChild({
            seedId: resolvedSeedId,
            childId: normalizedChildId,
            payload
          })) || {};

        setKids((prevKids) => {
          if (!Array.isArray(prevKids)) return prevKids;
          return prevKids.map((kid) => {
            const kidId = normalizeChildRecordId(kid);
            if (kidId && kidId === normalizedChildId) {
              return {
                ...kid,
                ...updatedChild,
                hidden,
                is_hidden: hidden
              };
            }
            return kid;
          });
        });

        const currentChildId = normalizeChildRecordId(selectedChild);
        if (currentChildId && currentChildId === normalizedChildId) {
          const mergedChild = {
            ...selectedChild,
            ...updatedChild,
            hidden,
            is_hidden: hidden
          };
          dispatch({
            type: GET_CHILD,
            payload: mergedChild
          });
          dispatch({ type: GET_CHILD_SUCCESS });
        }

        if (typeof addToast === 'function') {
          addToast({
            message: hidden
              ? 'Recipient hidden from sponsorship.'
              : 'Recipient visible for sponsorship.',
            error: false
          });
        }

        return updatedChild;
      } catch (error) {
        if (typeof addToast === 'function') {
          const message =
            error?.response?.data?.message ||
            'Unable to update child visibility.';
          addToast({ message, error: true });
        }
        throw error;
      }
    },
    [activeSeed, addToast, dispatch, selectedChild]
  );

  const updateChildPhoto = useCallback(
    async ({ childId, seedId, file }) => {
      const normalizedChildId = normalizeSeedId(childId);
      if (!normalizedChildId) {
        throw new Error('updateChildPhoto requires a valid child id.');
      }
      if (!file) {
        throw new Error('updateChildPhoto requires an image file.');
      }

      const resolvedSeedId =
        normalizeSeedId(seedId) ||
        normalizeSeedId(activeSeed?.id) ||
        normalizeSeedId(activeSeed?.seed_id);

      // Snapshot the current photo_url so we can roll back if the
      // upload or PATCH fails after we paint the optimistic preview.
      let previousKidPhotoUrl: string | undefined;
      setKids((prevKids) => {
        if (!Array.isArray(prevKids)) return prevKids;
        const target = prevKids.find(
          (kid) =>
            String(normalizeChildRecordId(kid) || '') ===
            String(normalizedChildId)
        );
        if (target && typeof target.photo_url === 'string') {
          previousKidPhotoUrl = target.photo_url;
        }
        return prevKids;
      });

      const selectedChildId = normalizeChildRecordId(selectedChild);
      const isSelected =
        selectedChildId !== null && selectedChildId === normalizedChildId;
      const previousSelectedPhotoUrl: string | undefined = isSelected
        ? selectedChild?.photo_url
        : undefined;

      // Optimistic preview: paint the local data URL on both the
      // card (kids list) and the detail modal (selectedChild) before
      // the network round-trip. Replaced with the server-signed URL
      // once the PATCH returns, rolled back on failure.
      let optimisticDataUrl = '';
      try {
        optimisticDataUrl = await readFileAsDataUrl(file);
      } catch (readError) {
        // FileReader failures are rare (huge files, revoked perms);
        // we still proceed with the upload, just without the preview.
        optimisticDataUrl = '';
      }

      if (optimisticDataUrl) {
        setKids((prevKids) => {
          if (!Array.isArray(prevKids)) return prevKids;
          return prevKids.map((kid) => {
            if (
              String(normalizeChildRecordId(kid) || '') ===
              String(normalizedChildId)
            ) {
              return { ...kid, photo_url: optimisticDataUrl };
            }
            return kid;
          });
        });

        if (isSelected) {
          dispatch({
            type: GET_CHILD,
            payload: { ...selectedChild, photo_url: optimisticDataUrl }
          });
          dispatch({ type: GET_CHILD_SUCCESS });
        }
      }

      const rollbackOptimistic = () => {
        setKids((prevKids) => {
          if (!Array.isArray(prevKids)) return prevKids;
          return prevKids.map((kid) => {
            if (
              String(normalizeChildRecordId(kid) || '') ===
              String(normalizedChildId)
            ) {
              return { ...kid, photo_url: previousKidPhotoUrl || '' };
            }
            return kid;
          });
        });
        if (isSelected) {
          dispatch({
            type: GET_CHILD,
            payload: {
              ...selectedChild,
              photo_url: previousSelectedPhotoUrl || ''
            }
          });
        }
      };

      // ``RecipientSerializer.photo_url`` is ``CharField(max_length=120)``
      // and stores a stable storage key, not a URL. The backend re-signs
      // it on every read via ``AbsolutePhotoURLField.to_representation``,
      // which is what keeps S3 SigV4 URLs from expiring. Sending a full
      // signed URL (~200+ chars in prod) blows the column length and
      // 400s the PATCH — that was the reason the "Updating…" overlay
      // would clear without the photo ever changing. Use the same
      // presigned-PUT path the create flow uses so we get a ~60-char
      // key back and store that.
      let uploadedKey = '';
      let uploadedFileId = null;

      try {
        const uploadMeta = await uploadFileViaPresignedPut({
          file,
          workspaceId: resolvedSeedId
        });
        uploadedKey = uploadMeta?.key || '';
        uploadedFileId = uploadMeta?.id ?? null;
      } catch (error) {
        rollbackOptimistic();
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to upload photo.';
        if (typeof addToast === 'function') {
          addToast({ message, error: true });
        }
        throw error;
      }

      if (!uploadedKey) {
        rollbackOptimistic();
        const message = 'Upload succeeded but no storage key was returned.';
        if (typeof addToast === 'function') {
          addToast({ message, error: true });
        }
        throw new Error(message);
      }

      const payload: any = { photo_url: uploadedKey };
      if (uploadedFileId !== null && uploadedFileId !== undefined) {
        payload.multimedia = [uploadedFileId];
      }

      try {
        const updatedChild =
          (await updateSponsorshipChild({
            seedId: resolvedSeedId,
            childId: normalizedChildId,
            payload
          })) || {};

        setKids((prevKids) => {
          if (!Array.isArray(prevKids)) return prevKids;
          return prevKids.map((kid) => {
            const kidId = normalizeChildRecordId(kid);
            if (kidId && kidId === normalizedChildId) {
              const existingMultimedia = Array.isArray(kid?.multimedia)
                ? kid.multimedia
                : [];
              const nextMultimedia = [...existingMultimedia];
              if (
                uploadedFileId !== null &&
                uploadedFileId !== undefined &&
                !nextMultimedia.includes(uploadedFileId)
              ) {
                nextMultimedia.push(uploadedFileId);
              }
              return {
                ...kid,
                ...updatedChild,
                // Prefer the backend's signed URL; only fall back to
                // the local data URL if the response somehow omits it.
                photo_url:
                  updatedChild.photo_url || optimisticDataUrl || kid.photo_url,
                multimedia: nextMultimedia
              };
            }
            return kid;
          });
        });

        if (isSelected) {
          const existingMultimedia = Array.isArray(selectedChild?.multimedia)
            ? selectedChild.multimedia
            : [];
          const nextMultimedia = [...existingMultimedia];
          if (
            uploadedFileId !== null &&
            uploadedFileId !== undefined &&
            !nextMultimedia.includes(uploadedFileId)
          ) {
            nextMultimedia.push(uploadedFileId);
          }
          const mergedChild = {
            ...selectedChild,
            ...updatedChild,
            photo_url:
              updatedChild.photo_url ||
              optimisticDataUrl ||
              selectedChild.photo_url,
            multimedia: nextMultimedia
          };
          dispatch({
            type: GET_CHILD,
            payload: mergedChild
          });
          dispatch({ type: GET_CHILD_SUCCESS });
        }

        if (typeof addToast === 'function') {
          addToast({ message: 'Photo updated.', error: false });
        }
        return updatedChild;
      } catch (error) {
        rollbackOptimistic();
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to update child photo.';
        if (typeof addToast === 'function') {
          addToast({ message, error: true });
        }
        throw error;
      }
    },
    [activeSeed, addToast, dispatch, selectedChild]
  );

  // Optimistic local mutations of the `kids` list. These do NOT touch
  // the backend — they just patch the in-memory store so the UI updates
  // immediately. The actual backend call happens elsewhere; on failure
  // the caller restores via the snapshot returned by removeChildLocally
  // (or by replaying upsertChildLocally with the original record).
  const removeChildLocally = useCallback((childId: any) => {
    const normalizedId = normalizeSeedId(childId);
    if (!normalizedId) return null;
    let removed: any = null;
    let removedIndex = -1;
    setKids((prevKids) => {
      if (!Array.isArray(prevKids)) return prevKids;
      const next: any[] = [];
      prevKids.forEach((kid, idx) => {
        const kidId = normalizeChildRecordId(kid);
        if (kidId && kidId === normalizedId && removed === null) {
          removed = kid;
          removedIndex = idx;
        } else {
          next.push(kid);
        }
      });
      return removed ? next : prevKids;
    });
    if (removed && removedIndex >= 0) {
      setChildrenTotal((prev) => Math.max(0, (prev || 0) - 1));
    }
    return removed ? { record: removed, index: removedIndex } : null;
  }, []);

  const upsertChildLocally = useCallback(
    (childOrPatch: any, options: { index?: number } = {}) => {
      const normalizedId = normalizeChildRecordId(childOrPatch);
      if (!normalizedId) return;
      setKids((prevKids) => {
        if (!Array.isArray(prevKids)) return prevKids;
        let matched = false;
        const merged = prevKids.map((kid) => {
          const kidId = normalizeChildRecordId(kid);
          if (kidId && kidId === normalizedId) {
            matched = true;
            return { ...kid, ...childOrPatch };
          }
          return kid;
        });
        if (matched) return merged;
        // Not in the list (likely a restored row). Insert at the
        // original index if provided, otherwise at the top.
        const next = [...prevKids];
        const targetIndex =
          typeof options.index === 'number' && options.index >= 0
            ? Math.min(options.index, next.length)
            : 0;
        next.splice(targetIndex, 0, childOrPatch);
        return next;
      });
    },
    []
  );

  return {
    createSeed,
    createChild,
    getChild,
    getChildren,
    kids,
    childrenTotal,
    childrenSponsored,
    childrenPending,
    toggleChildVisibility,
    updateChildPhoto,
    removeChildLocally,
    upsertChildLocally
  };
};
