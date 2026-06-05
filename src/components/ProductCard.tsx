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
      style={[
        styles.card,
        product.sold && styles.cardSold
      ]}
      onPress={() => onPress?.(product)}
      activeOpacity={0.7}
    >
      {/* Product Icon */}
      <View style={[styles.iconContainer, product.sold && styles.iconContainerSold]}>
        <Ionicons
          name={getCategoryIcon(product.category)}
          size={28}
          color={product.sold ? colors.textTertiary : colors.primary}
        />
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text style={[styles.brand, product.sold && styles.textSoldDim]} numberOfLines={1}>
          {product.brand}
        </Text>
        <Text style={[styles.model, product.sold && styles.textSoldDim]} numberOfLines={1}>
          {product.model}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
          <View style={[styles.statusBadge, product.sold ? styles.statusBadgeSold : styles.statusBadgeInStock]}>
            <Text style={[styles.statusText, product.sold ? styles.statusTextSold : styles.statusTextInStock]}>
              {product.sold ? 'Sold' : 'In Stock'}
            </Text>
          </View>
          {product.product_barcode && (
            <Text style={styles.barcode} numberOfLines={1}>
              {product.product_barcode}
            </Text>
          )}
        </View>
      </View>

      {/* Quantity Badge */}
      <View style={styles.quantityContainer}>
        <View style={[styles.quantityBadge, product.sold && styles.quantityBadgeSold]}>
          <Text style={[styles.quantityText, product.sold && styles.quantityTextSold]}>
            {product.sold ? 0 : (product.quantity ?? 0)}
          </Text>
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
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardSold: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    opacity: 0.85,
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
  iconContainerSold: {
    backgroundColor: colors.divider,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  brand: {
    ...typography.bodyMedium,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  model: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 14,
  },
  textSoldDim: {
    color: colors.textSecondary,
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
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeInStock: {
    backgroundColor: colors.successLight,
  },
  statusBadgeSold: {
    backgroundColor: colors.dangerLight,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  statusTextInStock: {
    color: colors.success,
  },
  statusTextSold: {
    color: colors.danger,
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
  quantityBadgeSold: {
    backgroundColor: colors.divider,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  quantityTextSold: {
    color: colors.textSecondary,
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
