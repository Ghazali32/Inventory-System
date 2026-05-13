import * as SecureStore from 'expo-secure-store';

const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
} as const;

export const tokenManager = {
  // Save tokens
  async saveTokens(params: {
    access: string;
    refresh: string;
  }): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, params.access);
    await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, params.refresh);
  },

  // Get individual tokens
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
  },

  // Get all tokens at once
  async getAllTokens(): Promise<{
    access: string | null;
    refresh: string | null;
  }> {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEYS.ACCESS),
      SecureStore.getItemAsync(TOKEN_KEYS.REFRESH),
    ]);
    return { access, refresh };
  },

  // Update only the access token (used during refresh)
  async updateAccessToken(access: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, access);
  },

  // Check if tokens exist
  async hasValidTokens(): Promise<boolean> {
    const access = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
    const refresh = await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
    return !!(access && refresh);
  },

  // Clear all tokens (logout)
  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS),
      SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH),
    ]);
  },
};
