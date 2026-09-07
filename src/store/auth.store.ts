import { Platform } from 'react-native';
import { create } from 'zustand';
import { authAPI, AuthResponse, BusinessProfile } from '../api/auth.api';
import { tokenManager } from '../utils/tokenManager';
import { getDeviceId } from '../utils/device';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  profile: BusinessProfile | null;
  isProfileComplete: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasSignature: boolean;
  signatureImage: string | null;

  login: (username: string, password: string) => Promise<void>;
  signup: (params: {
    username: string;
    email: string;
    password: string;
    account_name: string;
    phone_number: string;
  }) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  fetchProfile: () => Promise<boolean>;
  fetchSignature: () => Promise<string | null>;
  uploadSignature: (base64: string) => Promise<boolean>;
  deleteSignature: () => Promise<boolean>;
  clearError: () => void;
}

/**
 * Helper to extract and persist tokens + user from the nested AuthResponse
 */
async function processAuthResponse(response: AuthResponse) {
  await tokenManager.saveTokens({
    access: response.tokens.access,
    refresh: response.tokens.refresh,
  });

  return {
    user: response.user,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isProfileComplete: false,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  hasSignature: false,
  signatureImage: null,

  /**
   * Signin — POST /api/auth/signin_temp/
   * Requires: username, password, device_id, device_name
   */
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getDeviceId();
      const payload = {
        username,
        password,
        device_id: deviceId,
        device_name: `${Platform.OS} device`,
      };

      console.log('--- SIGNIN REQUEST ---');
      console.log('Payload:', JSON.stringify(payload, null, 2));

      const response = await authAPI.login(payload);

      console.log('--- SIGNIN RESPONSE ---');
      console.log('Response:', JSON.stringify(response, null, 2));

      const { user } = await processAuthResponse(response);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Fetch profile after login
      await get().fetchProfile();
    } catch (error: any) {
      console.log('--- SIGNIN ERROR ---');
      console.log('Error:', error);
      if (error.response) {
        console.log('Error Status:', error.response.status);
        console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
      }

      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Login failed. Please check your credentials.';
      console.log('Final Error Message:', message);
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  /**
   * Signup — POST /api/auth/signup_temp/
   * Auto-attaches device_id and device_name
   * Payload: { username, email, password, account_name, phone_number, device_id, device_name }
   */
  signup: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getDeviceId();
      const payload = {
        username: params.username,
        email: params.email,
        password: params.password,
        account_name: params.account_name,
        phone_number: params.phone_number,
        device_id: deviceId,
        device_name: `${Platform.OS} device`,
      };
      
      console.log('--- SIGNUP REQUEST ---');
      console.log('Payload:', JSON.stringify(payload, null, 2));

      const response = await authAPI.signup(payload);

      console.log('--- SIGNUP RESPONSE ---');
      console.log('Response:', JSON.stringify(response, null, 2));

      set({ isLoading: false, error: null });
      return response;
    } catch (error: any) {
      console.log('--- SIGNUP ERROR ---');
      console.log('Error:', error);
      if (error.response) {
        console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
      }

      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.response?.data ? JSON.stringify(error.response.data) : 'Signup failed. Please try again.');
      
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  /**
   * Logout — POST /api/auth/logout/
   * Blacklists the refresh token on backend, clears local tokens
   */
  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = await tokenManager.getRefreshToken();
      if (refreshToken) {
        await authAPI.logout(refreshToken).catch(() => {
          // Silent fail — we still want to clear local state
        });
      }
    } finally {
      await tokenManager.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  /**
   * Check if tokens exist in SecureStore (for splash screen)
   */
  checkAuth: async () => {
    try {
      const hasTokens = await tokenManager.hasValidTokens();
      if (hasTokens) {
        set({ isAuthenticated: true });
        await get().fetchProfile();
        
        // If fetchProfile triggered a 401 and the interceptor cleared the tokens,
        // we should reflect that the user is no longer authenticated.
        const stillHasTokens = await tokenManager.hasValidTokens();
        if (!stillHasTokens) {
          set({ isAuthenticated: false, isProfileComplete: false, profile: null });
          return false;
        }
        
        return true;
      }
      set({ isAuthenticated: false, isProfileComplete: false, profile: null });
      return false;
    } catch {
      set({ isAuthenticated: false, isProfileComplete: false, profile: null });
      return false;
    }
  },

  /**
   * Fetch user's business profile
   */
  fetchProfile: async () => {
    try {
      const profile = await authAPI.getProfile();
      // Check required fields
      const isComplete = !!(
        profile.shop_name &&
        profile.owner_name &&
        profile.shop_address &&
        profile.shop_city &&
        profile.shop_state &&
        profile.shop_pincode &&
        profile.shop_phone
      );
      const hasSig = profile.has_signature !== undefined
        ? profile.has_signature
        : (profile.signature_image_base64 ? true : get().hasSignature);
      const sigImg = profile.signature_image_base64 || get().signatureImage;
      set({
        profile,
        isProfileComplete: isComplete,
        hasSignature: hasSig,
        signatureImage: sigImg,
      });
      return isComplete;
    } catch (error: any) {
      console.log('--- FETCH PROFILE ERROR ---');
      console.log('Error:', error);
      set({ profile: null, isProfileComplete: false });
      return false;
    }
  },

  /**
   * Fetch retailer's digital signature
   */
  fetchSignature: async () => {
    try {
      const data = await authAPI.getSignature();
      set({
        hasSignature: data.has_signature,
        signatureImage: data.has_signature && data.signature_image_base64 ? data.signature_image_base64 : null,
      });
      return data.signature_image_base64 || null;
    } catch (error: any) {
      console.log('--- FETCH SIGNATURE ERROR ---', error?.message);
      return null;
    }
  },

  /**
   * Upload or update retailer's digital signature
   */
  uploadSignature: async (base64: string) => {
    try {
      set({ isLoading: true });
      const res = await authAPI.uploadSignature(base64);
      set({
        hasSignature: res.has_signature,
        signatureImage: base64,
        isLoading: false,
      });
      return true;
    } catch (error: any) {
      console.log('--- UPLOAD SIGNATURE ERROR ---', error?.message);
      set({ isLoading: false, error: error.message || 'Failed to upload signature' });
      return false;
    }
  },

  /**
   * Delete retailer's digital signature
   */
  deleteSignature: async () => {
    try {
      set({ isLoading: true });
      const res = await authAPI.deleteSignature();
      set({
        hasSignature: false,
        signatureImage: null,
        isLoading: false,
      });
      return true;
    } catch (error: any) {
      console.log('--- DELETE SIGNATURE ERROR ---', error?.message);
      set({ isLoading: false, error: error.message || 'Failed to delete signature' });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
