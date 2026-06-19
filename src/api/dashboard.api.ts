import apiClient from './client';

// ---------- Dashboard Types ----------

export type DashboardPeriod = '7d' | '30d' | '90d';

export interface DashboardInventory {
  total_products: number;
  total_quantity: number;
  total_categories: number;
  total_buying_price: string;
  total_msp: string;
  total_mrp: string;
  in_stock_count: number;
  sold_count: number;
}

export interface DashboardSales {
  total_revenue: string;
  total_sales_count: number;
  today_revenue: string;
  today_sales_count: number;
  average_order_value: string;
  revenue_change_percent: number;
  sales_count_change_percent: number;
}

export interface SalesChartPoint {
  date: string;
  revenue: string;
  count: number;
}

export interface TopSellingProduct {
  product_id: number;
  brand: string;
  model: string;
  category: string;
  total_sold: number;
  total_revenue: string;
}

export interface LowStockProduct {
  product_id: number;
  brand: string;
  model: string;
  category: string;
  quantity: number;
  product_barcode: string;
}

export interface RecentActivity {
  type: 'sale' | 'restock';
  description: string;
  amount: string | null;
  timestamp: string;
  reference_id: string | null;
}

export interface DashboardSummary {
  inventory: DashboardInventory;
  sales: DashboardSales;
  sales_chart: SalesChartPoint[];
  top_selling: TopSellingProduct[];
  low_stock: LowStockProduct[];
  recent_activity: RecentActivity[];
}

// ---------- API ----------

export const dashboardAPI = {
  /**
   * Get dashboard summary
   * GET /api/dashboard/summary/?period=<period>
   */
  async getSummary(period: DashboardPeriod = '7d'): Promise<DashboardSummary> {
    try {
      console.log('🔵 [API] GET /api/dashboard/summary/?period=' + period);
      const response = await apiClient.get<DashboardSummary>(
        `/api/dashboard/summary/?period=${period}`
      );
      console.log('✅ [API] Dashboard summary fetched');
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Error in getSummary');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      throw error;
    }
  },
};
