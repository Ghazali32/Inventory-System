import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing, shadows } from '../theme';
import { Product } from '../api/product.api';

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
}) => {
  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    const lower = category.toLowerCase();
    if (lower.includes('phone') || lower.includes('mobile')) return 'phone-portrait-outline';
    if (lower.includes('laptop') || lower.includes('computer')) return 'laptop-outline';
    if (lower.includes('tablet')) return 'tablet-portrait-outline';
    if (lower.includes('watch')) return 'watch-outline';
    if (lower.includes('audio') || lower.includes('headphone')) return 'headset-outline';
    if (lower.includes('tv') || lower.includes('television')) return 'tv-outline';
    if (lower.includes('camera')) return 'camera-outline';
    return 'cube-outline';
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(product)}
      activeOpacity={0.7}
    >
      {/* Product Icon */}
      <View style={styles.iconContainer}>
        <Ionicons
          name={getCategoryIcon(product.category)}
          size={28}
          color={colors.primary}
        />
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand}
        </Text>
        <Text style={styles.model} numberOfLines={1}>
          {product.model}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
          {product.barcode && (
            <Text style={styles.barcode} numberOfLines={1}>
              {product.barcode}
            </Text>
          )}
        </View>
      </View>

      {/* Quantity Badge */}
      <View style={styles.quantityContainer}>
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>{product.quantity}</Text>
        </View>
        <Text style={styles.quantityLabel}>Qty</Text>
      </View>

      {/* Chevron */}
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textTertiary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLightest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  brand: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  model: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '500',
  },
  barcode: {
    ...typography.small,
    color: colors.textTertiary,
    flex: 1,
  },
  quantityContainer: {
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  quantityBadge: {
    backgroundColor: colors.accent,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '700',
  },
  quantityLabel: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: 2,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
});
