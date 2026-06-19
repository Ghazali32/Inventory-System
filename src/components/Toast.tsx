import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore, ToastType } from '../store/toast.store';
import { colors, typography, spacing, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOAST_THEMES: Record<
  ToastType,
  {
    bg: string;
    border: string;
    text: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  success: {
    bg: colors.successLight,
    border: '#A7F3D0',
    text: '#065F46',
    icon: 'checkmark-circle-sharp',
  },
  error: {
    bg: colors.dangerLight,
    border: '#FCA5A5',
    text: '#991B1B',
    icon: 'alert-circle-sharp',
  },
  warning: {
    bg: colors.warningLight,
    border: '#FDE68A',
    text: '#92400E',
    icon: 'warning-sharp',
  },
  info: {
    bg: colors.infoLight,
    border: '#BFDBFE',
    text: '#1E40AF',
    icon: 'information-circle-sharp',
  },
};

export const Toast: React.FC = () => {
  const { visible, message, title, type, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  
  // Animation values
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animate in or out
  useEffect(() => {
    if (visible) {
      // Clear any existing timers
      if (timerRef.current) clearTimeout(timerRef.current);
      
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Set auto dismiss timer (4 seconds)
      timerRef.current = setTimeout(() => {
        dismissToast();
      }, 4000);
    } else {
      dismissToast(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const dismissToast = (updateStore = true) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (updateStore) {
        hide();
      }
    });
  };

  // Drag to dismiss gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical drag upwards
        return gestureState.dy < -5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30 || gestureState.vy < -0.5) {
          dismissToast();
        } else {
          // Snap back to position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const theme = TOAST_THEMES[type] || TOAST_THEMES.info;
  const topOffset = Math.max(insets.top, spacing.md);

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          top: topOffset,
          opacity: opacity,
          transform: [{ translateY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => dismissToast()}
        style={[
          styles.toastContainer,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={theme.icon} size={24} color={theme.text} />
        </View>
        <View style={styles.textContainer}>
          {title ? (
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          ) : null}
          <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
        </View>
        <TouchableOpacity
          onPress={() => dismissToast()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={18} color={theme.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 99999, // Ensure it sits on top of everything
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastContainer: {
    flexDirection: 'row',
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 5.5,
    elevation: 6,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.bodyMedium,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  closeButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
