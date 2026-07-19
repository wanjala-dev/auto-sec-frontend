import {
  readLocalJsonState,
  readLocalStringState,
  writeLocalJsonState,
  writeLocalStringState
} from '../../../infrastructure/session/browserLocalStateStore';

export const readBrowserLocalJsonState = <T>(key: string): T | null =>
  readLocalJsonState<T>(key);

export const writeBrowserLocalJsonState = (key: string, value: unknown) =>
  writeLocalJsonState(key, value);

export const readBrowserLocalStringState = (key: string): string | null =>
  readLocalStringState(key);

export const writeBrowserLocalStringState = (key: string, value: string) =>
  writeLocalStringState(key, value);
