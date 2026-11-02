export interface OfficeDetails {
  address?: string;
  telephone?: string;
  email?: string;
}

export interface CompanyBranch {
  id: string;
  name: string;
  address?: string;
  telephone?: string;
  email?: string;
  active: boolean;
  isHeadOffice?: boolean;
}

export interface CompanyConfig {
  version: number;
  lastUpdated?: string;
  company: {
    name: string;
    website?: string;
    registeredOffice?: OfficeDetails;
  };
  branches: CompanyBranch[];
}

const CONFIG_URL = `${import.meta.env.BASE_URL}company-config.json`;
const DB_NAME = 'kdb-levy-calculator-config';
const STORE_NAME = 'configuration';
const CONFIG_KEY = 'company-config';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateConfig(value: unknown): value is CompanyConfig {
  if (!isRecord(value) || !isRecord(value.company) || !Array.isArray(value.branches)) {
    return false;
  }

  if (
    typeof value.version !== 'number' ||
    typeof value.company.name !== 'string' ||
    value.company.name.trim().length === 0
  ) {
    return false;
  }

  return value.branches.every((branch) =>
    isRecord(branch) &&
    typeof branch.id === 'string' && branch.id.trim().length > 0 &&
    typeof branch.name === 'string' && branch.name.trim().length > 0 &&
    typeof branch.active === 'boolean' &&
    (branch.isHeadOffice === undefined || typeof branch.isHeadOffice === 'boolean')
  );
}

function openConfigDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open configuration storage'));
  });
}

async function saveLocalConfig(config: CompanyConfig): Promise<void> {
  const db = await openConfigDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(config, CONFIG_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save configuration'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Configuration save was interrupted'));
  });
  db.close();
}

async function readLocalConfig(): Promise<CompanyConfig | null> {
  const db = await openConfigDb();
  const result = await new Promise<unknown>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(CONFIG_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not read saved configuration'));
  });
  db.close();
  return validateConfig(result) ? result : null;
}

export interface LoadedCompanyConfig {
  config: CompanyConfig;
  source: 'network' | 'local';
}

/**
 * Fetch the published configuration first. Workbox precaches this JSON file,
 * so the request is also available offline. IndexedDB is a second fallback.
 */
export async function loadCompanyConfig(): Promise<LoadedCompanyConfig> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      const response = await fetch(CONFIG_URL, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Configuration request failed (${response.status})`);
      }

      const candidate: unknown = await response.json();
      if (!validateConfig(candidate)) {
        throw new Error('The published company configuration has an invalid format');
      }

      try {
        await saveLocalConfig(candidate);
      } catch {
        // The service-worker precache still provides offline access if IndexedDB is unavailable.
      }

      return { config: candidate, source: 'network' };
    } catch (networkError) {
      // Fallback to local storage if network request fails while nominally online
      try {
        const saved = await readLocalConfig();
        if (saved) return { config: saved, source: 'local' };
      } catch {
        // Report original error below
      }

      const message = networkError instanceof Error ? networkError.message : 'Unable to load company configuration';
      throw new Error(`${message}. Connect to the internet and reopen the application to download the configuration.`);
    }
  }

  // Explicitly offline mode: read from IndexedDB first, then fallback to fetch (for SW precache)
  try {
    const saved = await readLocalConfig();
    if (saved) return { config: saved, source: 'local' };
  } catch {
    // Continue to SW fetch attempt
  }

  try {
    const response = await fetch(CONFIG_URL);
    if (response.ok) {
      const candidate: unknown = await response.json();
      if (validateConfig(candidate)) {
        return { config: candidate, source: 'local' };
      }
    }
  } catch {
    // SW cache miss
  }

  throw new Error('Unable to load company configuration. Connect to the internet and reopen the application to download the configuration.');
}
