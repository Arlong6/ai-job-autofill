import { STORAGE_KEYS } from './constants';
import type { UserProfile, Settings, TrackedApplication } from './types';

type StorageMap = {
  [STORAGE_KEYS.PROFILE]: UserProfile;
  [STORAGE_KEYS.SETTINGS]: Settings;
  [STORAGE_KEYS.APPLICATIONS]: TrackedApplication[];
};

export async function getStorage<K extends keyof StorageMap>(
  key: K
): Promise<StorageMap[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as StorageMap[K] | undefined;
}

export async function setStorage<K extends keyof StorageMap>(
  key: K,
  value: StorageMap[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
