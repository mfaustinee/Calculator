export interface CompanyConfig {
  version: number;
  lastUpdated?: string;
  company: {
    name: string;
    website?: string;
    registeredOffice?: { address?: string; telephone?: string; email?: string };
  };
  branch: {
    id: string;
    name: string;
    address?: string;
    telephone?: string;
    email?: string;
    active: boolean;
  };
}

export interface DeviceContext {
  installationId: string;
  credential: string;
  config: CompanyConfig | null;
}

export type ConfigSource = 'network' | 'local';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const DB_NAME = 'kdb-levy-calculator-config';
const STORE_NAME = 'configuration';
const DEVICE_CONTEXT_KEY = 'device-context';

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function openConfigDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not support the storage required for device activation.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open device storage.'));
  });
}

async function readDeviceContext(): Promise<DeviceContext | null> {
  const db = await openConfigDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(DEVICE_CONTEXT_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error('Could not read saved device details.'));
    });
  } finally {
    db.close();
  }
}

async function saveDeviceContext(context: DeviceContext): Promise<void> {
  const db = await openConfigDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(context, DEVICE_CONTEXT_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save device activation.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Saving device activation was interrupted.'));
    });
  } finally {
    db.close();
  }
}

function mapServerConfiguration(payload: any): CompanyConfig {
  const company = payload?.configuration?.company;
  const branch = payload?.configuration?.branch;
  if (!company || !branch || typeof branch.id !== 'string' || typeof branch.name !== 'string' || typeof company.company_name !== 'string') {
    throw new Error('The server returned an incomplete company or branch configuration.');
  }

  const branchVersion = Number(branch.config_version) || 0;
  const companyVersion = Number(company.config_version) || 0;

  return {
    version: Math.max(branchVersion, companyVersion),
    lastUpdated: company.updated_at,
    company: {
      name: company.company_name,
      website: company.website || undefined,
      registeredOffice: {
        address: company.registered_office || undefined,
        telephone: company.telephone || undefined,
        email: company.email || undefined,
      },
    },
    branch: {
      id: branch.id,
      name: branch.name,
      address: branch.address || undefined,
      telephone: branch.telephone || undefined,
      email: branch.email || undefined,
      active: true,
    },
  };
}

async function requestConfiguration(credential: string): Promise<CompanyConfig> {
  if (!API_BASE_URL) {
    throw new Error('The API address has not been configured for this application.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/device/config`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${credential}` },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Unable to reach the activation server. Check your internet connection.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || 'The device could not be authorised.', response.status);
  }
  return mapServerConfiguration(payload);
}

export async function activateDevice(activationCode: string): Promise<DeviceContext> {
  if (!API_BASE_URL) {
    throw new Error('The API address has not been configured for this application.');
  }
  if (!navigator.onLine) throw new Error('An internet connection is required for first-time activation.');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/device/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ activation_code: activationCode.trim() }),
    });
  } catch {
    throw new Error('Could not reach the activation server. Check your internet connection and try again.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || 'Activation failed. Check the code and try again.');

  if (payload.status !== 'ok' || typeof payload.device_credential !== 'string' || typeof payload.installation_id !== 'string') {
    throw new Error('The activation server returned an invalid activation response.');
  }

  // Save the credential immediately: the activation code is single-use. If the
  // following configuration request is interrupted, this device can retry it.
  const context: DeviceContext = {
    installationId: payload.installation_id,
    credential: payload.device_credential,
    config: null,
  };
  await saveDeviceContext(context);

  const fullConfig = await requestConfiguration(payload.device_credential);
  const activated = { ...context, config: fullConfig };
  await saveDeviceContext(activated);
  return activated;
}

export async function loadDeviceContext(): Promise<{ context: DeviceContext; source: ConfigSource }> {
  const saved = await readDeviceContext();
  if (!saved?.credential || !saved?.installationId) {
    throw new Error('This installation has not been activated. Enter an activation code to continue.');
  }

  if (!navigator.onLine) {
    if (saved.config) return { context: saved, source: 'local' };
    throw new Error('This device is activated but has not yet downloaded its configuration. Connect to the internet to finish setup.');
  }

  try {
    const freshConfig = await requestConfiguration(saved.credential);
    const updated = { ...saved, config: freshConfig };
    await saveDeviceContext(updated);
    return { context: updated, source: 'network' };
  } catch (error) {
    // Authentication or branch deactivation must not fall back to stale data.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      throw new Error(error.message);
    }
    if (saved.config) return { context: saved, source: 'local' };
    throw error;
  }
}

export async function refreshDeviceConfiguration(context: DeviceContext): Promise<DeviceContext> {
  const config = await requestConfiguration(context.credential);
  const updated = { ...context, config };
  await saveDeviceContext(updated);
  return updated;
}
