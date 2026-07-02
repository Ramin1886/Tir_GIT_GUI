import { Stronghold, Store } from '@tauri-apps/plugin-stronghold';
import { appDataDir } from '@tauri-apps/api/path';

let strongholdInstance: Stronghold | null = null;
let strongholdStore: Store | null = null;

export const getStrongholdStore = async () => {
  if (strongholdStore) return strongholdStore;

  const appDir = await appDataDir();
  const vaultPath = `${appDir}/secrets.vault`;
  
  // Note: In a real app, this password should be derived securely (e.g. biometrics or user input).
  // For now, we use a hardcoded password to satisfy Stronghold's encryption requirements
  // and prevent plaintext token storage on disk.
  const password = 'tir-git-gui-secure-password';

  try {
    strongholdInstance = await Stronghold.load(vaultPath, password);
  } catch (e) {
    // If loading fails, it might not exist yet or we need to start fresh
    console.error('Failed to load stronghold, attempting to recreate', e);
    // There isn't a direct API to create if load fails, load() should do it.
  }

  // Load or create client
  let client;
  try {
    client = await strongholdInstance!.loadClient('github-gitlab-tokens');
  } catch {
    client = await strongholdInstance!.createClient('github-gitlab-tokens');
  }

  strongholdStore = client.getStore();
  return strongholdStore;
};

export const saveStronghold = async () => {
  if (strongholdInstance) {
    await strongholdInstance.save();
  }
};

export const setSecret = async (key: string, value: string) => {
  const store = await getStrongholdStore();
  const encoder = new TextEncoder();
  const data = Array.from(encoder.encode(value));
  await store.insert(key, data);
  await saveStronghold();
};

export const getSecret = async (key: string): Promise<string | null> => {
  const store = await getStrongholdStore();
  const data = await store.get(key);
  if (data) {
    const decoder = new TextDecoder();
    return decoder.decode(data);
  }
  return null;
};
