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
  mop_including_gst?: string | number | null;
  mop_excluding_gst?: string | number | null;
  gst_label?: string | null;
  price_breakdown?: PriceBreakdown | null;
  color?: string;
  sold?: boolean;
  sold_datetime?: string | null;
  inventory_entry_datetime?: string;
  created_at: string;
  updated_at: string;
}

export interface PriceBreakdown {
  base_amount?: string | number | null;
  gst_amount?: string | number | null;
  gst_percent?: string | number | null;
  cgst_percent?: string | number | null;
  cgst_amount?: string | number | null;
  sgst_percent?: string | number | null;
  sgst_amount?: string | number | null;
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
    color?: string;
    buying_price?: string | number;
    msp?: string | number;
    mrp?: string | number;
    description?: string;
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
   * Fetch single product details
   * GET /api/products/{id}/
   */
  async getProduct(productId: number): Promise<Product> {
    try {
      console.log('🔵 [API] GET /api/products/' + productId + '/');
      const response = await apiClient.get<Product>(
        `/api/products/${productId}/`
      );
      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in getProduct');
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

  // ---------- Selling / Checkout ----------

  /**
   * Scan for selling — POST /api/products/scan-for-selling/
   */
  async scanForSelling(payload: ScanForSellingPayload): Promise<ScanForSellingResponse> {
    try {
      console.log('🔵 [API] POST /api/products/scan-for-selling/');
      console.log('📤 Request Payload:', JSON.stringify(payload, null, 2));

      const response = await apiClient.post<ScanForSellingResponse>(
        '/api/products/scan-for-selling/',
        payload
      );

      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in scanForSelling');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Checkout preview — POST /api/checkout/preview/
   */
  async checkoutPreview(payload: CheckoutPreviewPayload): Promise<CheckoutPreviewResponse> {
    try {
      console.log('🔵 [API] POST /api/checkout/preview/');
      console.log('📤 Request Payload:', JSON.stringify(payload, null, 2));

      const response = await apiClient.post<CheckoutPreviewResponse>(
        '/api/checkout/preview/',
        payload
      );

      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in checkoutPreview');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Fetch sold customer — GET /api/checkout/customers/<uuid>/
   */
  async getCustomer(customerId: string): Promise<SoldCustomer> {
    try {
      console.log('🔵 [API] GET /api/checkout/customers/' + customerId + '/');

      const response = await apiClient.get<SoldCustomer>(
        `/api/checkout/customers/${customerId}/`
      );

      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in getCustomer');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Search customers — GET /api/checkout/customers/
   */
  async searchCustomers(search?: string, limit?: number): Promise<CustomerListResponse> {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (limit) params.limit = String(limit);

      const queryStr = Object.keys(params).length
        ? '?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
        : '';

      console.log('🔵 [API] GET /api/checkout/customers/' + queryStr);
      const response = await apiClient.get<CustomerListResponse>(
        `/api/checkout/customers/${queryStr}`
      );
      console.log('✅ [API] Response Status:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in searchCustomers');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Checkout complete — POST /api/checkout/complete/
   * Finalizes the sale: creates SoldItem, SoldCustomer, marks inventory as sold
   */
  async checkoutComplete(payload: CheckoutCompletePayload): Promise<CheckoutCompleteResponse> {
    try {
      console.log('🔵 [API] POST /api/checkout/complete/');
      console.log('📤 Request Payload:', JSON.stringify(payload, null, 2));

      const response = await apiClient.post<CheckoutCompleteResponse>(
        '/api/checkout/complete/',
        payload
      );

      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in checkoutComplete');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Checkout history — GET /api/checkout/history/
   * Returns sold-items history for the current account
   */
  async getCheckoutHistory(limit?: number, customerId?: string): Promise<CheckoutHistoryResponse> {
    try {
      const params: Record<string, string> = {};
      if (limit) params.limit = String(limit);
      if (customerId) params.customer_id = customerId;

      const queryStr = Object.keys(params).length
        ? '?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
        : '';

      console.log('🔵 [API] GET /api/checkout/history/' + queryStr);

      const response = await apiClient.get<CheckoutHistoryResponse>(
        `/api/checkout/history/${queryStr}`
      );

      console.log('✅ [API] Response Status:', response.status);
      console.log('📥 History count:', response.data.count);

      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in getCheckoutHistory');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },

  /**
   * Fetch invoice details — GET /api/checkout/invoices/<invoice_number>/
   */
  async getInvoice(invoiceNumber: string): Promise<BillingDetails> {
    try {
      console.log('🔵 [API] GET /api/checkout/invoices/' + invoiceNumber + '/');
      const response = await apiClient.get<BillingDetails>(
        `/api/checkout/invoices/${invoiceNumber}/`
      );
      console.log('✅ [API] Response Status:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in getInvoice');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      throw error;
    }
  },
};

// ---------- Selling / Checkout Types ----------

export interface ScanForSellingPayload {
  product_barcode: string;
  imei1?: string | null;
  imei2?: string | null;
}

export interface ScanForSellingResponse {
  action: 'found' | 'not_found';
  product_found: boolean;
  product?: Product;
  message?: string;
}

export interface CheckoutPreviewPayload {
  inventory_id?: number;
  product_barcode?: string;
  imei1?: string;
  imei2?: string;
  customer_id?: string;
}

export interface CheckoutCompletePayload {
  inventory_id?: number;
  product_barcode?: string;
  imei1?: string;
  imei2?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_pincode?: string;
  payment_mode?: string;
}

export interface CheckoutCompleteResponse {
  sale_completed: boolean;
  invoice_number: string;
  sold_item_id: number;
  inventory_id: number;
  customer: SoldCustomer;
  message: string;
}

export interface BillingDetails {
  shop_name: string;
  invoice_number: string | null;
  invoice_date: string;
  customer_name: string;
  customer_address: string;
  customer_contact: string;
  customer_gst: string;
  state_code: string;
  product_name: string;
  brand_name: string;
  model_number: string;
  imei_no_1: string;
  imei_no_2: string;
  serial_number: string;
  hsn_sac: string;
  quantity: number;
  rate: string;
  amount: string;
  base_amount: string;
  gst_percent: string;
  gst_amount: string;
  cgst_percent: string;
  cgst_amount: string;
  sgst_percent: string;
  sgst_amount: string;
  total_amount: string;
  payment_mode: string;
  cheque_number: string;
}

export interface CheckoutPreviewResponse {
  checkout_ready: boolean;
  inventory: Product;
  customer: SoldCustomer | null;
  billing_details: BillingDetails;
  next_step: 'customer_selection' | 'checkout';
}

export interface SoldCustomer {
  customer_id: string;
  account: string;
  name: string;
  phone_number: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Sales History Types ----------

export interface SoldItemHistory {
  id: number;
  invoice_number: string | null;
  invoice_date: string | null;
  payment_mode: string;
  total_amount: string | null;
  selling_datetime: string;
  quantity: number;
  customer_id: string | null;
  customer_name: string | null;
  customer_contact: string | null;
  product_sku: string;
  product_barcode: string | null;
  product_brand: string;
  product_model: string;
  imei_no_1: string | null;
  imei_no_2: string | null;
  inventory_id: number | null;
  created_at: string;
}

export interface CheckoutHistoryResponse {
  count: number;
  limit: number;
  results: SoldItemHistory[];
}

export interface SearchCustomerResult {
  customer_id: string;
  name: string;
  phone_number: string;
  email: string;
  city: string | null;
  state: string | null;
  purchase_count: number;
  total_spent: string;
  last_purchase_at: string | null;
}

export interface CustomerListResponse {
  count: number;
  limit: number;
  results: SearchCustomerResult[];
}
