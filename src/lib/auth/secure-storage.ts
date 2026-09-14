import * as SecureStore from 'expo-secure-store';

/**
 * Storage adapter for authentication session data.
 * Keep credentials out of AsyncStorage, SQLite, and feature code.
 */
export const secureStorage = {
  getItem(key: string) {
    return SecureStore.getItemAsync(key);
  },
  setItem(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};
