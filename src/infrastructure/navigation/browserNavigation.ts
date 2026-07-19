const hasWindowLocation = () =>
  typeof window !== 'undefined' && typeof window.location !== 'undefined';

const hasWindowHistory = () =>
  typeof window !== 'undefined' && typeof window.history !== 'undefined';

export const getBrowserPathname = (): string => {
  if (!hasWindowLocation()) return '';
  return window.location.pathname || '';
};

export const getBrowserOrigin = (): string => {
  if (!hasWindowLocation()) return '';
  return window.location.origin || '';
};

export const getBrowserHostname = (): string => {
  if (!hasWindowLocation()) return '';
  return window.location.hostname || '';
};

export const getBrowserSearch = (): string => {
  if (!hasWindowLocation()) return '';
  return window.location.search || '';
};

export const getBrowserHash = (): string => {
  if (!hasWindowLocation()) return '';
  return window.location.hash || '';
};

export const getBrowserHref = (): string => {
  if (!hasWindowLocation()) return '';
  return window.location.href || '';
};

export const buildBrowserPathWithoutSearchParams = (
  searchInput: string | URLSearchParams,
  keysToRemove: string[],
  pathname = getBrowserPathname(),
  hash = getBrowserHash()
): string => {
  const params = new URLSearchParams(searchInput);
  keysToRemove.forEach((key) => params.delete(key));
  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ''}${hash}`;
};

export const assignBrowserLocation = (path: string) => {
  if (!hasWindowLocation()) return;
  window.location.assign(path);
};

export const replaceBrowserLocation = (path: string) => {
  if (!hasWindowLocation()) return;
  window.location.replace(path);
};

export const replaceBrowserHistoryState = (path: string) => {
  if (!hasWindowHistory()) return;
  const title = typeof document !== 'undefined' ? document.title : '';
  window.history.replaceState({}, title, path);
};
