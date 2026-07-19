import { themeApi } from '../../infrastructure/landing/themeApi';

export const fetchTenantTheme = async ({
  tenant,
  signal
}: {
  tenant: string;
  signal?: AbortSignal;
}) => {
  if (!tenant) {
    return null;
  }

  try {
    const response = await themeApi.getTenantTheme(tenant, signal);
    return response?.data ?? null;
  } catch {
    // Theme is non-critical — silently return null on any error
    // (404 = no theme, 500 = unknown tenant like CloudFront hostname)
    return null;
  }
};
