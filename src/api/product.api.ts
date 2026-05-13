import apiClient from './client';

// ---------- Types (matching backend response shapes) ----------

export interface Product {
  id: number;
  customer_id?: number;
  account_id?: string;
  product_id: string;
  sku?: string;
  category: string;
  brand: string;
  model: string;
  specs: Record<string, string>;
  quantity?: number;
  product_barcode: string;
  imei1?: string | null;
  imei2?: string | null;
  imei_primary?: string;
  imei_secondary?: string;
  buying_price?: number | null;
  mrp?: number | null;
  msp?: number | null;
  gst?: number | null;
  color?: string;
  sold?: boolean;
  sold_datetime?: string | null;
  inventory_entry_datetime?: string;
  created_at: string;
  updated_at: string;
}

export interface ScanIngestPayload {
  product_barcode: string;
  imei1?: string | null;
  imei2?: string | null;
  source?: string;
}

export interface ScanIngestResponse {
  action: 'created' | 'quantity_increased' | 'not_found';
  product_found: boolean;
  product?: Product;
  message?: string;
  form_required?: boolean;
  prefill?: {
    product_barcode: string;
    imei1?: string | null;
    imei2?: string | null;
    quantity: number;
  };
}

export interface VoiceDraftPayload {
  text: string;
  language?: string;
  product_barcode?: string;
  imei_primary?: string;
  imei_secondary?: string;
}

export interface VoiceDraftResponse {
  prefill: {
    category?: string;
    brand?: string;
    model?: string;
    specs?: Record<string, string>;
    missing_fields?: string[];
  };
  confirm_required: boolean;
}

export interface CreateProductPayload {
  product_barcode: string;
  sku: string;
  category: string;
  brand: string;
  model: string;
  imei1?: string | null;
  imei2?: string | null;
  color?: string;
  barcode_type?: string;
  specs?: Record<string, string | number>;
  buying_price?: number | null;
  msp?: number | null;
  mrp?: number | null;
  gst?: number | null;
}

export interface CreateProductResponse {
  action: 'created' | 'quantity_increased';
  product: Product;
}

export interface UpdateProductResponse {
  action: 'updated';
  product: Product;
}

// ---------- API ----------

export const productAPI = {
  /**
   * Fetch all products for a customer
   * GET /api/products/
   */
  async getProducts(): Promise<Product[]> {
    try {
      console.log('🔵 [API] GET /api/products/');
      console.log('📤 Request: No payload (GET request)');
      
      const response = await apiClient.get<Product[]>(
        '/api/products/'
      );
      
      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', response.data);
      
      // Backend returns array directly
      return Array.isArray(response.data)
        ? response.data
        : (response.data as any).results ?? [];
    } catch (error: any) {
      console.error('❌ [API] Error in getProducts');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Scan lookup and quantity update or prefill form
   * POST /api/scans/ingest/
   */
  async ingestScan(payload: ScanIngestPayload): Promise<ScanIngestResponse> {
    try {
      console.log('🔵 [API] POST /api/scans/ingest/');
      console.log('📤 Request Payload:', JSON.stringify(payload, null, 2));
      
      const response = await apiClient.post<ScanIngestResponse>(
        '/api/scans/ingest/',
        payload
      );
      
      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in ingestScan');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Draft product prefill from text/prompt (any language)
   * POST /api/products/voice-draft/
   */
  async voiceDraft(payload: VoiceDraftPayload): Promise<VoiceDraftResponse> {
    try {
      console.log('🔵 [API] POST /api/products/voice-draft/');
      console.log('📤 Request Payload:', JSON.stringify(payload, null, 2));
      
      const response = await apiClient.post<VoiceDraftResponse>(
        '/api/products/voice-draft/',
        payload
      );
      
      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in voiceDraft');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Create new product manually (or increase quantity if product_id exists)
   * POST /api/products/create-from-form/
   */
  async createProduct(payload: CreateProductPayload): Promise<CreateProductResponse> {
    try {
      console.log('🔵 [API] POST /api/products/create-from-form/');
      console.log('📤 Request Payload:', JSON.stringify(payload, null, 2));
      
      const response = await apiClient.post<CreateProductResponse>(
        '/api/products/create-from-form/',
        payload
      );
      
      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in createProduct');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Update an existing product
   * PUT /api/products/{inventory_id}/update-from-form/
   */
  async updateProduct(productId: number, payload: CreateProductPayload): Promise<UpdateProductResponse> {
    try {
      console.log('🔵 [API] PUT /api/products/' + productId + '/update-from-form/');
      console.log('📤 Request Payload:', JSON.stringify(payload, null, 2));

      const response = await apiClient.put<UpdateProductResponse>(
        `/api/products/${productId}/update-from-form/`,
        payload
      );

      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in updateProduct');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Delete a product
   * DELETE /api/products/{id}/delete/
   */
  async deleteProduct(productId: number): Promise<void> {
    try {
      console.log('🔵 [API] DELETE /api/products/' + productId + '/delete/');
      
      await apiClient.delete(`/api/products/${productId}/delete/`);
      
      console.log('✅ [API] Delete request completed');
      console.log('📥 Product deleted successfully');
    } catch (error: any) {
      console.error('❌ [API] Error in deleteProduct');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },
};
