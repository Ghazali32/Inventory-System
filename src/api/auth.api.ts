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

// ---------- Profile ----------

export interface BusinessProfile {
  shop_name: string;
  owner_name: string;
  shop_address: string;
  shop_city: string;
  shop_state: string;
  shop_pincode: string;
  shop_phone: string;
  gst_registration_number?: string;
  pan_number?: string;
  shop_license_number?: string;
  shop_license_expiry?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_holder_name?: string;
  aadhar_number?: string;
  created_at?: string;
  updated_at?: string;
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

  // ---------- Profile ----------

  /**
   * Get Business Profile
   * GET /api/accounts/profile/
   */
  async getProfile(): Promise<BusinessProfile> {
    const response = await apiClient.get<BusinessProfile>('/api/accounts/profile/');
    return response.data;
  },

  /**
   * Create Business Profile
   * POST /api/accounts/profile/
   */
  async createProfile(data: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const response = await apiClient.post<BusinessProfile>('/api/accounts/profile/', data);
    return response.data;
  },

  /**
   * Update Business Profile
   * PUT /api/accounts/profile/
   */
  async updateProfile(data: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const response = await apiClient.put<BusinessProfile>('/api/accounts/profile/', data);
    return response.data;
  }
};
