import { useEffect } from 'react';
import { fetchTenantTheme } from '../../../application/landing/themeService';
import { readBrowserHostname } from '../../../features/navigation/presentation/browserNavigationSupport';

const SKIP_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const SKIP_SUFFIXES = ['.cloudfront.net', '.amazonaws.com'];

const resolveTenantFromHost = () => {
  const tenantURL = readBrowserHostname();
  if (!tenantURL || SKIP_HOSTNAMES.has(tenantURL)) return '';
  if (SKIP_SUFFIXES.some((suffix) => tenantURL.endsWith(suffix))) return '';
  return tenantURL.split('.')[0];
};

export const useThemeBootstrapPresentation = ({ dispatch, actions }) => {
  useEffect(() => {
    const getThemeData = async () => {
      try {
        const tenant = resolveTenantFromHost();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const data = await fetchTenantTheme({
          tenant,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!data) {
          return;
        }
        dispatch({ type: actions.SET_THEME, payload: data });
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Theme load skipped/failed:', err?.message || err);
        }
      }
    };

    getThemeData();
  }, [actions.SET_THEME, dispatch]);
};
