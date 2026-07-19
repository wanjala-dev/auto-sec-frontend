import { normalizeWorkspaceId as normalizeSeedId } from '../../domain/workspace/workspaceId';

const DEFAULT_RECOMMENDATION_PRIORITY = 200;

export const normalizeBannerSeverity = (value: any) => {
  const normalized = String(value || '').toLowerCase();
  if (['info', 'success', 'warning', 'danger'].includes(normalized)) {
    return normalized;
  }
  if (normalized === 'error' || normalized === 'critical') {
    return 'danger';
  }
  if (normalized === 'alert') {
    return 'warning';
  }
  return 'info';
};

export const normalizeApiBanner = (banner: any, seedId: any) => {
  if (!banner) return null;
  const normalizedSeedId = normalizeSeedId(seedId);
  const isActive = banner?.is_active_now ?? banner?.is_active ?? true;
  if (!isActive) {
    return null;
  }

  const rawId =
    banner?.id ?? banner?.pk ?? banner?.uuid ?? banner?.slug ?? null;

  const identifierParts = ['banner'];
  if (normalizedSeedId) {
    identifierParts.push(String(normalizedSeedId));
  }
  if (rawId !== null && rawId !== undefined) {
    identifierParts.push(String(rawId));
  } else if (banner?.code) {
    identifierParts.push(String(banner.code));
  } else if (banner?.title) {
    identifierParts.push(
      String(banner.title).trim().toLowerCase().replace(/\s+/g, '-')
    );
  } else {
    identifierParts.push(String(Date.now()));
  }

  return {
    id: identifierParts.join(':'),
    bannerId: rawId ?? null,
    seedId: normalizedSeedId ?? null,
    title: banner?.title?.trim() || banner?.severity_display || 'Notice',
    message: banner?.message ?? '',
    severity: normalizeBannerSeverity(banner?.severity),
    scope: banner?.scope ?? null,
    scopeDisplay:
      banner?.scope_display ??
      (banner?.scope
        ? banner.scope.charAt(0).toUpperCase() + banner.scope.slice(1)
        : null),
    dismissible: banner?.dismissible !== false,
    priority: Number.isFinite(Number(banner?.priority))
      ? Number(banner.priority)
      : null,
    createdAt: banner?.created_at ?? banner?.updated_at ?? null,
    updatedAt: banner?.updated_at ?? banner?.created_at ?? null,
    isActive: true,
    source: 'api',
    raw: banner
  };
};

export const normalizeSetupRecommendation = (
  recommendation: any,
  seedId: any,
  labelMap = new Map()
) => {
  if (!recommendation) return null;
  const code =
    recommendation?.code ?? recommendation?.id ?? recommendation?.slug ?? null;
  if (!code) return null;
  const normalizedSeedId = normalizeSeedId(seedId);
  const identifierParts = ['setup'];
  if (normalizedSeedId) {
    identifierParts.push(String(normalizedSeedId));
  }
  identifierParts.push(String(code));

  const labelFromChecks = labelMap.get(String(code));
  const derivedLabel =
    labelFromChecks ||
    recommendation?.label ||
    recommendation?.title ||
    'Seed setup recommendation';

  return {
    id: identifierParts.join(':'),
    code: String(code),
    seedId: normalizedSeedId ?? null,
    title: derivedLabel,
    message: recommendation?.message ?? '',
    severity: normalizeBannerSeverity(recommendation?.severity),
    scope: recommendation?.scope ?? 'seed',
    scopeDisplay:
      recommendation?.scope_display ??
      (recommendation?.scope
        ? recommendation.scope.charAt(0).toUpperCase() +
          recommendation.scope.slice(1)
        : 'Seed'),
    dismissible: true,
    priority: DEFAULT_RECOMMENDATION_PRIORITY,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'setup',
    raw: recommendation
  };
};

export const normalizeApiBannerCollection = (payload: any, seedId: any) => {
  const rawResults = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
    ? payload
    : [];

  return rawResults
    .map((entry) => normalizeApiBanner(entry, seedId))
    .filter(Boolean);
};

export const normalizeSetupStatusResult = (payload: any, seedId: any) => {
  const setupStatus =
    payload?.data !== undefined && payload?.data !== null
      ? payload.data
      : payload;

  const labelMap = new Map();
  if (Array.isArray(setupStatus?.checks)) {
    setupStatus.checks.forEach((check: any) => {
      if (check?.code) {
        labelMap.set(String(check.code), check.label || check.code);
      }
    });
  }

  const recommendationBanners = Array.isArray(setupStatus?.recommendations)
    ? setupStatus.recommendations
        .map((item: any) =>
          normalizeSetupRecommendation(item, seedId, labelMap)
        )
        .filter(Boolean)
    : [];

  return {
    setupStatus,
    recommendationBanners
  };
};
