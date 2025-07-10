import { invoke } from '@tauri-apps/api/tauri';

const isTauri = () => typeof window !== 'undefined' && !!window.__TAURI__;

export class SafeStorage {
  private static instance: SafeStorage;
  private isTauriEnv: boolean;

  private constructor() {
    this.isTauriEnv = isTauri();
  }

  public static getInstance(): SafeStorage {
    if (!SafeStorage.instance) {
      SafeStorage.instance = new SafeStorage();
    }
    return SafeStorage.instance;
  }

  async set(key: string, value: any): Promise<void> {
    if (this.isTauriEnv) {
      await invoke('set_storage', { key, value: JSON.stringify(value) });
    }
  }

  async get(key: string): Promise<any> {
    if (this.isTauriEnv) {
      const result = await invoke('get_storage', { key });
      return result ? JSON.parse(result as string) : null;
    }
    return null;
  }

  async remove(key: string): Promise<void> {
    if (this.isTauriEnv) {
      await invoke('remove_storage', { key });
    }
  }

  async clear(): Promise<void> {
    if (this.isTauriEnv) {
      await invoke('clear_storage');
    }
  }

  async keys(): Promise<string[]> {
    if (this.isTauriEnv) {
      return await invoke('get_storage_keys') as string[];
    }
    return [];
  }

  async has(key: string): Promise<boolean> {
    if (this.isTauriEnv) {
      const result = await invoke('has_storage', { key });
      return result as boolean;
    }
    return false;
  }
}

export const safeStorage = SafeStorage.getInstance();
export const setStorage = (key: string, value: any) => safeStorage.set(key, value);
export const getStorage = (key: string) => safeStorage.get(key);
export const removeStorage = (key: string) => safeStorage.remove(key);
export const clearStorage = () => safeStorage.clear();
export const hasStorage = (key: string) => safeStorage.has(key);
export const getStorageKeys = () => safeStorage.keys();

export const BUSINESS_STORAGE_KEYS = {
  PARTIES: 'devease_parties',
  ITEMS: 'devease_items',
  SALES: 'devease_sales',
  PURCHASES: 'devease_purchases',
  SETTINGS: 'devease_settings',
  USER_DATA: 'devease_user_data',
} as const;

export const businessStorage = {
  setParties: (parties: any[]) => setStorage(BUSINESS_STORAGE_KEYS.PARTIES, parties),
  getParties: () => getStorage(BUSINESS_STORAGE_KEYS.PARTIES),
  setItems: (items: any[]) => setStorage(BUSINESS_STORAGE_KEYS.ITEMS, items),
  getItems: () => getStorage(BUSINESS_STORAGE_KEYS.ITEMS),
  setSales: (sales: any[]) => setStorage(BUSINESS_STORAGE_KEYS.SALES, sales),
  getSales: () => getStorage(BUSINESS_STORAGE_KEYS.SALES),
  setPurchases: (purchases: any[]) => setStorage(BUSINESS_STORAGE_KEYS.PURCHASES, purchases),
  getPurchases: () => getStorage(BUSINESS_STORAGE_KEYS.PURCHASES),
  setSettings: (settings: any) => setStorage(BUSINESS_STORAGE_KEYS.SETTINGS, settings),
  getSettings: () => getStorage(BUSINESS_STORAGE_KEYS.SETTINGS),
  setUserData: (userData: any) => setStorage(BUSINESS_STORAGE_KEYS.USER_DATA, userData),
  getUserData: () => getStorage(BUSINESS_STORAGE_KEYS.USER_DATA),
  exportAllData: async () => {
    const data = {
      parties: await getStorage(BUSINESS_STORAGE_KEYS.PARTIES) || [],
      items: await getStorage(BUSINESS_STORAGE_KEYS.ITEMS) || [],
      sales: await getStorage(BUSINESS_STORAGE_KEYS.SALES) || [],
      purchases: await getStorage(BUSINESS_STORAGE_KEYS.PURCHASES) || [],
      settings: await getStorage(BUSINESS_STORAGE_KEYS.SETTINGS) || {},
      userData: await getStorage(BUSINESS_STORAGE_KEYS.USER_DATA) || {},
      exportedAt: new Date().toISOString(),
    };
    return data;
  },
  importAllData: async (data: any) => {
    if (data.parties) await setStorage(BUSINESS_STORAGE_KEYS.PARTIES, data.parties);
    if (data.items) await setStorage(BUSINESS_STORAGE_KEYS.ITEMS, data.items);
    if (data.sales) await setStorage(BUSINESS_STORAGE_KEYS.SALES, data.sales);
    if (data.purchases) await setStorage(BUSINESS_STORAGE_KEYS.PURCHASES, data.purchases);
    if (data.settings) await setStorage(BUSINESS_STORAGE_KEYS.SETTINGS, data.settings);
    if (data.userData) await setStorage(BUSINESS_STORAGE_KEYS.USER_DATA, data.userData);
  },
  clearAllData: async () => {
    await removeStorage(BUSINESS_STORAGE_KEYS.PARTIES);
    await removeStorage(BUSINESS_STORAGE_KEYS.ITEMS);
    await removeStorage(BUSINESS_STORAGE_KEYS.SALES);
    await removeStorage(BUSINESS_STORAGE_KEYS.PURCHASES);
    await removeStorage(BUSINESS_STORAGE_KEYS.SETTINGS);
    await removeStorage(BUSINESS_STORAGE_KEYS.USER_DATA);
  },
}; 