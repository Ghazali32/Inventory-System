import apiClient from './client';

// ---------- Signup ----------

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
  account_name: string;
  phone_number: string;
  device_id: string;
  device_name: string;
}

// ---------- Signin ----------

export interface LoginPayload {
  username: string;
  password: string;
  device_id: string;
  device_name: string;
}

// ---------- Response shapes (matching backend exactly) ----------

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  mode: string;
  user: AuthUser;
  customer: {
    id: number;
    business_name?: string;
  };
  tokens: {
    access: string;
    refresh: string;
  };
  device_policy: {
    single_active_device: boolean;
    active_device_id: string;
  };
  security?: {
    suspicious_location_detected: boolean;
  };
}

export interface SignupResponse {
  mode: string;
  status: string;
  summary: {
    username: string;
    account_name: string;
    phone_number: string;
  };
  message: string;
  user: AuthUser;
  customer: {
    id: number;
    account_name?: string;
  };
  device_policy: {
    single_active_device: boolean;
    active_device_id: string;
  };
}

export interface RefreshResponse {
  access: string;
  refresh: string;
}

// ---------- API ----------

export const authAPI = {
  /**
   * Demo signup — creates user + customer + device registration
   * POST /api/auth/signup_temp/
   */
  async signup(payload: SignupPayload): Promise<SignupResponse> {
    const response = await apiClient.post<SignupResponse>(
      '/api/auth/signup_temp/',
      payload
    );
    return response.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      '/api/auth/signin_temp/',
      payload
    );
    console.log("Login Response", response.data);
    return response.data;
  },

  /**
   * Refresh access token (returns new access + refresh pair)
   * POST /api/auth/refresh/
   */
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>(
      '/api/auth/refresh/',
      { refresh: refreshToken }
    );
    return response.data;
  },

  /**
   * Logout by blacklisting refresh token
   * POST /api/auth/logout/
   * Requires Authorization: Bearer <access>
   */
  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/api/auth/logout/', {
      refresh: refreshToken,
    });
  },
};
