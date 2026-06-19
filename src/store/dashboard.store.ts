import { create } from 'zustand';
import {
  dashboardAPI,
  DashboardSummary,
  DashboardPeriod,
} from '../api/dashboard.api';

interface DashboardState {
  summary: DashboardSummary | null;
  selectedPeriod: DashboardPeriod;
  isLoading: boolean;
  error: string | null;

  fetchSummary: (period?: DashboardPeriod) => Promise<void>;
  setPeriod: (period: DashboardPeriod) => void;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  summary: null,
  selectedPeriod: '7d',
  isLoading: false,
  error: null,

  fetchSummary: async (period?: DashboardPeriod) => {
    const p = period || get().selectedPeriod;
    set({ isLoading: true, error: null });
    console.log('🔵 [STORE] fetchSummary - Period:', p);

    try {
      const summary = await dashboardAPI.getSummary(p);
      console.log('✅ [STORE] fetchSummary Success');
      set({ summary, isLoading: false, selectedPeriod: p });
    } catch (error: any) {
      console.error('❌ [STORE] fetchSummary Error');
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Failed to fetch dashboard data';
      set({ error: message, isLoading: false });
    }
  },

  setPeriod: (period: DashboardPeriod) => {
    set({ selectedPeriod: period });
    get().fetchSummary(period);
  },

  clearError: () => set({ error: null }),
}));
