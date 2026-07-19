import { normalizeWorkspaceId } from '../workspace/workspaceId';

const USER_SEED_COLLECTION_KEYS = [
  'seed_memberships',
  'seedMemberships',
  'seed_members',
  'seeds',
  'org_access_seeds',
  'orgAccessSeeds'
];

const USER_SEED_SINGLE_KEYS = ['active_seed', 'activeSeed'];
const USER_SEED_ID_KEYS = ['active_seed_id', 'activeSeedId'];

const normalizeSeedCollection = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

export const normalizeUserSeedRecord = (candidate) => {
  if (candidate === null || candidate === undefined) {
    return null;
  }

  let seedDetails = candidate;
  let membershipMeta = null;

  if (typeof candidate === 'object' && candidate?.seed) {
    const { seed, id: membershipId, ...rest } = candidate;
    seedDetails = seed;
    membershipMeta = {
      ...rest,
      ...(membershipId !== undefined && membershipId !== null
        ? { membership_id: membershipId }
        : {})
    };
  }

  const normalizedId = normalizeWorkspaceId(
    (typeof seedDetails === 'object'
      ? seedDetails?.id ??
        seedDetails?.seed_id ??
        seedDetails?.seedId ??
        seedDetails?.pk ??
        seedDetails?.uuid
      : seedDetails) ??
      (typeof candidate === 'object'
        ? candidate?.seed_id ??
          candidate?.seedId ??
          candidate?.id ??
          candidate?.pk ??
          candidate?.uuid
        : candidate)
  );

  if (!normalizedId) {
    return null;
  }

  const baseSeed =
    typeof seedDetails === 'object'
      ? { ...seedDetails }
      : typeof candidate === 'object'
      ? { ...candidate }
      : { id: normalizedId };

  const normalizedSeed = {
    ...(membershipMeta || {}),
    ...baseSeed,
    id: normalizedId
  };

  if (!normalizedSeed.seed_name) {
    const fallbackName =
      baseSeed?.seed_name ||
      baseSeed?.name ||
      baseSeed?.title ||
      (typeof candidate === 'object'
        ? candidate?.seed_name || candidate?.name || candidate?.title
        : '');
    if (fallbackName) {
      normalizedSeed.seed_name = fallbackName;
    }
  }

  if (
    typeof candidate === 'object' &&
    !normalizedSeed.photo_url &&
    (candidate?.photo_url || candidate?.seed?.photo_url)
  ) {
    normalizedSeed.photo_url =
      candidate?.photo_url || candidate?.seed?.photo_url;
  }

  return normalizedSeed;
};

export const extractUserSeedsFromPayload = (userPayload) => {
  if (!userPayload) {
    return [];
  }

  const seen = new Set();
  const seeds = [];

  const pushSeed = (candidate) => {
    const normalized = normalizeUserSeedRecord(candidate);
    if (!normalized) return;
    if (seen.has(normalized.id)) return;
    seen.add(normalized.id);
    seeds.push(normalized);
  };

  const inspectNode = (node) => {
    if (!node || typeof node !== 'object') return;
    USER_SEED_COLLECTION_KEYS.forEach((key) => {
      normalizeSeedCollection(node[key]).forEach(pushSeed);
    });
    USER_SEED_SINGLE_KEYS.forEach((key) => {
      if (node[key]) {
        pushSeed(node[key]);
      }
    });
    USER_SEED_ID_KEYS.forEach((key) => {
      if (node[key]) {
        pushSeed({ id: node[key] });
      }
    });
  };

  [
    userPayload,
    userPayload?.data,
    userPayload?.user,
    userPayload?.profile,
    userPayload?.user?.profile,
    userPayload?.data?.user,
    userPayload?.data?.profile
  ].forEach(inspectNode);

  return seeds;
};
