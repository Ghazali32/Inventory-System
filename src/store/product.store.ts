import { create } from 'zustand';
import {
  productAPI,
  Product,
  ScanIngestResponse,
  CreateProductPayload,
  VoiceDraftResponse,
  ScanForSellingResponse,
  CheckoutPreviewPayload,
  CheckoutPreviewResponse,
  CheckoutCompletePayload,
  CheckoutCompleteResponse,
  SoldItemHistory,
  CheckoutHistoryResponse,
  BillingDetails,
  SearchCustomerResult,
  CustomerListResponse,
} from '../api/product.api';

const normalizeProduct = (product: Product): Product => ({
  ...product,
  quantity: product.quantity ?? (product.sold ? 0 : 1),
});

interface ProductState {
  products: Product[];
  salesHistory: SoldItemHistory[];
  isLoading: boolean;
  error: string | null;
  lastScanResult: ScanIngestResponse | null;

  fetchProducts: () => Promise<void>;
  fetchProductDetail: (productId: number) => Promise<Product>;
  addProduct: (product: Product) => void;
  updateProductQuantity: (productId: string, newQuantity: number) => void;
  ingestScan: (
    productBarcode: string,
    imeiPrimary?: string,
    imeiSecondary?: string
  ) => Promise<ScanIngestResponse>;
  voiceDraft: (
    text: string,
    productBarcode?: string,
    imeiPrimary?: string,
    imeiSecondary?: string,
    language?: string
  ) => Promise<VoiceDraftResponse>;
  createProduct: (
    payload: CreateProductPayload
  ) => Promise<Product>;
  updateProduct: (
    productId: number,
    payload: CreateProductPayload
  ) => Promise<Product>;
  deleteProduct: (productId: number) => Promise<void>;
  scanForSelling: (
    productBarcode: string,
    imei1?: string,
    imei2?: string
  ) => Promise<ScanForSellingResponse>;
  checkoutPreview: (payload: CheckoutPreviewPayload) => Promise<CheckoutPreviewResponse>;
  checkoutComplete: (payload: CheckoutCompletePayload) => Promise<CheckoutCompleteResponse>;
  fetchSalesHistory: (limit?: number, customerId?: string) => Promise<void>;
  getInvoice: (invoiceNumber: string) => Promise<BillingDetails>;
  searchCustomers: (search?: string, limit?: number) => Promise<CustomerListResponse>;
  clearScanResult: () => void;
  clearError: () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  salesHistory: [],
  isLoading: false,
  error: null,
  lastScanResult: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] fetchProducts - Starting');
    try {
      console.log('📤 [STORE] Calling productAPI.getProducts()');
      const products = (await productAPI.getProducts()).map(normalizeProduct);
      console.log('✅ [STORE] fetchProducts Success');
      console.log('📦 Products count:', products.length);
      set({ products, isLoading: false });
    } catch (error: any) {
      console.error('❌ [STORE] fetchProducts Error');
      console.error('Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Failed to fetch products';
      set({ error: message, isLoading: false });
    }
  },

  fetchProductDetail: async (productId: number) => {
    // Don't set global loading/error for background detail fetches
    console.log('🔵 [STORE] fetchProductDetail - Starting, ID:', productId);
    try {
      console.log('📤 [STORE] Calling productAPI.getProduct()');
      const product = await productAPI.getProduct(productId);
      const normalized = normalizeProduct(product);
      
      // Update or add in local state
      set((state) => {
        const exists = state.products.some((p) => p.id === productId);
        const newProducts = exists
          ? state.products.map((p) => (p.id === productId ? normalized : p))
          : [normalized, ...state.products];
        return { products: newProducts };
      });
      
      console.log('✅ [STORE] fetchProductDetail Success');
      return normalized;
    } catch (error: any) {
      console.warn('⚠️ [STORE] fetchProductDetail failed (404 or no detail endpoint), falling back to list fetch');
      // If 404, the detail endpoint doesn't exist — fall back to list
      if (error.response?.status === 404 || error.response?.status === undefined) {
        try {
          const products = (await productAPI.getProducts()).map(normalizeProduct);
          set({ products });
          const found = products.find((p) => p.id === productId);
          if (found) return found;
        } catch (fallbackErr) {
          console.warn('⚠️ [STORE] Fallback list fetch also failed');
        }
      }
      throw new Error('Product not found');
    }
  },

  addProduct: (product: Product) => {
    set((state) => ({
      products: [normalizeProduct(product), ...state.products],
    }));
  },

  updateProductQuantity: (productId: string, newQuantity: number) => {
    set((state) => ({
      products: state.products.map((p) =>
        String(p.id) === productId ? { ...p, quantity: newQuantity } : p
      ),
    }));
  },

  /**
  * Scan ingest — POST /api/scans/ingest/
   * Uses product_barcode, imei_primary, imei_secondary, source
   */
  ingestScan: async (
    productBarcode: string,
    imeiPrimary?: string,
    imeiSecondary?: string
  ) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] ingestScan - Starting');
    console.log('📋 [STORE] Input:', { productBarcode, imeiPrimary, imeiSecondary });
    
    try {
      const payload = {
        product_barcode: productBarcode,
        imei1: imeiPrimary || '',
        imei2: imeiSecondary || '',
        source: 'fe-image-processing',
      };
      
      console.log('📤 [STORE] Calling ingestScan with payload:', payload);
      const result = await productAPI.ingestScan(payload);
      
      console.log('✅ [STORE] ingestScan Success');
      console.log('📦 [STORE] Result:', result);

      set({ lastScanResult: result, isLoading: false });

      // If product found, update quantity in local state
      if (result.product_found && result.product) {
        console.log('✅ [STORE] Product found, updating local state');
        const existing = get().products.find(
          (p) => p.id === result.product!.id
        );
        if (existing) {
          console.log('🔄 [STORE] Product exists, updating quantity');
          get().updateProductQuantity(
            String(result.product.id),
            result.product.quantity ?? existing.quantity ?? 1
          );
        } else {
          console.log('➕ [STORE] New product, adding to state');
          get().addProduct(result.product);
        }
      } else {
        console.log('❓ [STORE] Product not found, form_required:', result.form_required);
      }

      return result;
    } catch (error: any) {
      console.error('❌ [STORE] ingestScan Error');
      console.error('Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        fullError: error,
      });
      
      const message =
        error.response?.status === 409
          ? 'Duplicate product detected. Please check your inventory.'
          : error.response?.status === 404
            ? 'Product not found.'
            : error.response?.status === 500
              ? `Server Error (500): ${error.response?.data?.detail || error.response?.data?.message || 'Internal server error'}`
              : error.response?.data?.detail ||
              error.response?.data?.message ||
              error.message ||
              'Scan failed. Please try again.';
      
      console.log('📍 [STORE] Error message:', message);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Voice draft — POST /api/products/voice-draft/
   * Uses text field (supports any language), plus optional barcode/imei context
   */
  voiceDraft: async (
    text: string,
    productBarcode?: string,
    imeiPrimary?: string,
    imeiSecondary?: string,
    language?: string
  ) => {
    console.log('🔵 [STORE] voiceDraft - Starting');
    console.log('📋 [STORE] Input:', { text, productBarcode, imeiPrimary, imeiSecondary, language });
    
    try {
      const payload = {
        text,
        language: language || 'en',
        product_barcode: productBarcode,
        imei_primary: imeiPrimary,
        imei_secondary: imeiSecondary,
      };
      
      console.log('📤 [STORE] Calling voiceDraft with payload:', payload);
      const result = await productAPI.voiceDraft(payload);
      
      console.log('✅ [STORE] voiceDraft Success');
      console.log('📦 [STORE] Result:', result);
      return result;
    } catch (error: any) {
      console.error('❌ [STORE] voiceDraft Error');
      console.error('Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Voice draft failed';
      throw new Error(message);
    }
  },

  /**
   * Create product — POST /api/products/create-from-form/
   * If product_id already exists for this customer, quantity is increased
   */
  createProduct: async (
    payload: CreateProductPayload
  ) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] createProduct - Starting');
    console.log('📋 [STORE] Payload:', payload);
    
    try {
      console.log('📤 [STORE] Calling createProduct with payload');
      const result = await productAPI.createProduct(payload);
      
      console.log('✅ [STORE] createProduct Success');
      console.log('📦 [STORE] Result:', result);

      // result.action is 'created' or 'quantity_increased'
      const product = result.product;

      if (result.action === 'quantity_increased') {
        console.log('🔄 [STORE] Quantity increased, updating local state');
        const existing = get().products.find((p) => p.id === product.id);
        if (existing) {
          get().updateProductQuantity(String(product.id), product.quantity ?? existing.quantity ?? 1);
        } else {
          get().addProduct(product);
        }
      } else {
        console.log('➕ [STORE] Product created, adding to state');
        get().addProduct(product);
      }

      set({ isLoading: false });
      return product;
    } catch (error: any) {
      console.error('❌ [STORE] createProduct Error');
      console.error('Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      const message =
        error.response?.status === 409
          ? 'A product with this barcode already exists.'
          : error.response?.status === 500
            ? `Server Error (500): ${error.response?.data?.detail || error.response?.data?.message || 'Internal server error'}`
            : error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          'Failed to create product';
      
      console.log('📝 [STORE] Error message:', message);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Update product — PUT /api/products/{id}/update-from-form/
   */
  updateProduct: async (
    productId: number,
    payload: CreateProductPayload
  ) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] updateProduct - Starting');
    console.log('📋 [STORE] Product ID:', productId);
    console.log('📋 [STORE] Payload:', payload);

    try {
      console.log('📤 [STORE] Calling updateProduct with payload');
      const result = await productAPI.updateProduct(productId, payload);

      console.log('✅ [STORE] updateProduct Success');
      console.log('📦 [STORE] Result:', result);

      const updated = result.product;
      set((state) => ({
        products: state.products.map((p) => (p.id === updated.id ? normalizeProduct(updated) : p)),
        isLoading: false,
      }));

      return updated;
    } catch (error: any) {
      console.error('❌ [STORE] updateProduct Error');
      console.error('Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to update product';

      console.log('📝 [STORE] Error message:', message);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Delete product — DELETE /api/products/{id}/
   */
  deleteProduct: async (productId: number) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] deleteProduct - Starting');
    console.log('📋 [STORE] Product ID:', productId);
    
    try {
      console.log('📤 [STORE] Calling deleteProduct API');
      await productAPI.deleteProduct(productId);
      
      console.log('✅ [STORE] deleteProduct Success');
      // Remove product from local state
      set((state) => ({
        products: state.products.filter((p) => p.id !== productId),
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('❌ [STORE] deleteProduct Error');
      console.error('Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to delete product';
      
      console.log('📝 [STORE] Error message:', message);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Scan for selling — POST /api/products/scan-for-selling/
   */
  scanForSelling: async (
    productBarcode: string,
    imei1?: string,
    imei2?: string
  ) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] scanForSelling - Starting');

    try {
      const payload = {
        product_barcode: productBarcode,
        ...(imei1 ? { imei1 } : {}),
        ...(imei2 ? { imei2 } : {}),
      };

      console.log('📤 [STORE] Calling scanForSelling with payload:', payload);
      const result = await productAPI.scanForSelling(payload);

      console.log('✅ [STORE] scanForSelling Success');
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('❌ [STORE] scanForSelling Error');
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Scan for selling failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Checkout preview — POST /api/checkout/preview/
   */
  checkoutPreview: async (payload: CheckoutPreviewPayload) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] checkoutPreview - Starting');

    try {
      console.log('📤 [STORE] Calling checkoutPreview with payload:', payload);
      const result = await productAPI.checkoutPreview(payload);

      console.log('✅ [STORE] checkoutPreview Success');
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('❌ [STORE] checkoutPreview Error');
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Checkout preview failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Checkout complete — POST /api/checkout/complete/
   * Finalizes the sale, marks inventory as sold
   */
  checkoutComplete: async (payload: CheckoutCompletePayload) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] checkoutComplete - Starting');

    try {
      console.log('📤 [STORE] Calling checkoutComplete with payload:', payload);
      const result = await productAPI.checkoutComplete(payload);

      console.log('✅ [STORE] checkoutComplete Success');
      console.log('🧾 Invoice Number:', result.invoice_number);

      // Mark the product as sold in local state
      if (result.inventory_id) {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === result.inventory_id ? { ...p, sold: true, sold_datetime: new Date().toISOString() } : p
          ),
        }));
      }

      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('❌ [STORE] checkoutComplete Error');
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Checkout failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Fetch sales history — GET /api/checkout/history/
   */
  fetchSalesHistory: async (limit?: number, customerId?: string) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] fetchSalesHistory - Starting');

    try {
      const result = await productAPI.getCheckoutHistory(limit, customerId);

      console.log('✅ [STORE] fetchSalesHistory Success, count:', result.count);
      set({ salesHistory: result.results, isLoading: false });
    } catch (error: any) {
      console.error('❌ [STORE] fetchSalesHistory Error');
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch sales history';
      set({ error: message, isLoading: false });
    }
  },

  /**
   * Fetch invoice details — GET /api/checkout/invoices/<invoice_number>/
   */
  getInvoice: async (invoiceNumber: string) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] getInvoice - Starting, Invoice Number:', invoiceNumber);

    try {
      const billingDetails = await productAPI.getInvoice(invoiceNumber);
      console.log('✅ [STORE] getInvoice Success');
      set({ isLoading: false });
      return billingDetails;
    } catch (error: any) {
      console.error('❌ [STORE] getInvoice Error');
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch invoice details';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  /**
   * Search customers — GET /api/checkout/customers/
   */
  searchCustomers: async (search?: string, limit?: number) => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] searchCustomers - Starting, Search Query:', search);

    try {
      const result = await productAPI.searchCustomers(search, limit);
      console.log('✅ [STORE] searchCustomers Success, count:', result.count);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('❌ [STORE] searchCustomers Error');
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to search customers';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  clearScanResult: () => set({ lastScanResult: null }),
  clearError: () => set({ error: null }),
}));
