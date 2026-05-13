import { create } from 'zustand';
import {
  productAPI,
  Product,
  ScanIngestResponse,
  CreateProductPayload,
  VoiceDraftResponse,
} from '../api/product.api';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  lastScanResult: ScanIngestResponse | null;

  fetchProducts: () => Promise<void>;
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
  clearScanResult: () => void;
  clearError: () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  lastScanResult: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] fetchProducts - Starting');
    try {
      console.log('📤 [STORE] Calling productAPI.getProducts()');
      const products = await productAPI.getProducts();
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

  addProduct: (product: Product) => {
    set((state) => ({
      products: [product, ...state.products],
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
        get().updateProductQuantity(String(product.id), product.quantity ?? 1);
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
        products: state.products.map((p) => (p.id === updated.id ? updated : p)),
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

  clearScanResult: () => set({ lastScanResult: null }),
  clearError: () => set({ error: null }),
}));
