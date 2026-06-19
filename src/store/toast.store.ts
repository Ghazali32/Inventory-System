import { create } from 'zustand';
import * as Haptics from 'expo-haptics';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  message: string;
  title: string | null;
  type: ToastType;
  visible: boolean;
  
  show: (message: string, type?: ToastType, title?: string | null) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  title: null,
  type: 'info',
  visible: false,

  show: (message: string, type = 'info', title = null) => {
    set({
      message,
      type,
      title,
      visible: true,
    });

    // Trigger haptics feedback depending on toast type
    try {
      switch (type) {
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'info':
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
      }
    } catch (e) {
      // Ignore if haptics is not supported or fails (e.g., emulator/web)
    }
  },

  hide: () => set({ visible: false }),
}));

// Export a shorthand utility function to make calling it easier
export const toast = {
  success: (message: string, title?: string | null) => useToastStore.getState().show(message, 'success', title),
  error: (message: string, title?: string | null) => useToastStore.getState().show(message, 'error', title),
  warn: (message: string, title?: string | null) => useToastStore.getState().show(message, 'warning', title),
  info: (message: string, title?: string | null) => useToastStore.getState().show(message, 'info', title),
};
