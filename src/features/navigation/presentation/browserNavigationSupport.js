import {
  assignBrowserLocation,
  buildBrowserPathWithoutSearchParams,
  getBrowserHref,
  getBrowserHostname,
  getBrowserOrigin,
  getBrowserPathname,
  getBrowserSearch,
  replaceBrowserHistoryState,
  replaceBrowserLocation
} from '../../../infrastructure/navigation/browserNavigation';

export const openBrowserLocation = (nextLocation) => {
  if (!nextLocation) return;
  assignBrowserLocation(nextLocation);
};

export const replaceBrowserRoute = (nextLocation) => {
  if (!nextLocation) return;
  replaceBrowserLocation(nextLocation);
};

export const replaceBrowserHistoryRoute = (nextLocation) => {
  if (!nextLocation) return;
  replaceBrowserHistoryState(nextLocation);
};

export const buildBrowserPathWithoutParams = (
  searchParams,
  params = [],
  pathname,
  hash
) => buildBrowserPathWithoutSearchParams(searchParams, params, pathname, hash);

export const readBrowserCurrentHref = () => getBrowserHref() || '';

export const readBrowserOrigin = () => getBrowserOrigin() || '';

export const readBrowserHostname = () => getBrowserHostname() || '';

export const readBrowserPathname = () => getBrowserPathname() || '';

export const readBrowserSearch = () => getBrowserSearch() || '';
