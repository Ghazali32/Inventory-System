import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Product } from '../../api/product.api';

interface CheckoutPreviewScreenProps {
  navigation: any;
  route: any;
}

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' && value.trim().length === 0) return '-';
  return String(value);
};

const toCurrency = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const CheckoutPreviewScreen: React.FC<CheckoutPreviewScreenProps> = ({
  navigation,
  route,
}) => {
  const product = route.params?.product as Product;

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Product not found</Text>
      </SafeAreaView>
    );
  }

  const handleEdit = () => {
    navigation.navigate('ProductForm', { product, mode: 'edit' });
  };

  const handleCheckout = () => {
    navigation.navigate('CustomerSelect', { product });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout Preview</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Product Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="cart-outline" size={26} color={colors.success} />
            </View>
            <View style={styles.sellBadge}>
              <Ionicons name="pricetag" size={12} color={colors.textInverse} />
              <Text style={styles.sellBadgeText}>Ready to Sell</Text>
            </View>
          </View>

          <Text style={styles.heroBrand}>{toDisplay(product.brand)}</Text>
          <Text style={styles.heroModel}>{toDisplay(product.model)}</Text>

          <View style={styles.heroTagsRow}>
            {product.category && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{product.category}</Text>
              </View>
            )}
            {product.color && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{product.color}</Text>
              </View>
            )}
            {product.sku && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>SKU {product.sku}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Price Highlight */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>MRP</Text>
              <Text style={styles.priceValue}>{toCurrency(product.mrp)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>MSP</Text>
              <Text style={styles.priceValue}>{toCurrency(product.msp)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Cost</Text>
              <Text style={[styles.priceValue, { color: colors.textSecondary }]}>
                {toCurrency(product.buying_price)}
              </Text>
            </View>
          </View>
          {product.gst != null && (
            <View style={styles.gstRow}>
              <Ionicons name="document-text-outline" size={14} color={colors.info} />
              <Text style={styles.gstText}>GST: {product.gst}%</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <DetailRow label="Barcode" value={toDisplay(product.product_barcode)} />
          <DetailRow label="IMEI 1" value={toDisplay(product.imei1)} />
          <DetailRow label="IMEI 2" value={toDisplay(product.imei2)} />
          <DetailRow label="Brand" value={toDisplay(product.brand)} />
          <DetailRow label="Model" value={toDisplay(product.model)} />
          <DetailRow label="Category" value={toDisplay(product.category)} />
          <DetailRow label="Color" value={toDisplay(product.color)} />
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
          <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56, paddingHorizontal: spacing.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerIconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.subtitle, color: colors.text },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.lg },
  errorText: { ...typography.body, color: colors.danger, textAlign: 'center', marginTop: spacing.xl },

  // Hero
  heroCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.md,
  },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  heroIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  sellBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  sellBadgeText: { ...typography.caption, color: colors.textInverse, fontWeight: '600' },
  heroBrand: { ...typography.heading3, color: colors.text },
  heroModel: { ...typography.body, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
  heroTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    backgroundColor: colors.primaryLightest, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: { ...typography.caption, color: colors.primary, fontWeight: '500' },

  // Price Card
  priceCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceItem: { flex: 1, alignItems: 'center' },
  priceLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  priceValue: { ...typography.heading3, color: colors.primary },
  priceDivider: { width: 1, height: 40, backgroundColor: colors.borderLight },
  gstRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
    justifyContent: 'center',
  },
  gstText: { ...typography.caption, color: colors.info },

  // Details
  sectionCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
  },
  sectionTitle: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing.md,
  },
  detailLabel: { ...typography.body, color: colors.textSecondary, flex: 0.4 },
  detailValue: { ...typography.bodyMedium, color: colors.text, flex: 0.6, textAlign: 'right' },

  // Action Bar
  actionBar: {
    flexDirection: 'row', gap: spacing.md, padding: spacing.lg,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  editBtn: {
    flex: 0.35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.button,
    backgroundColor: colors.primaryLightest, borderWidth: 1.5, borderColor: colors.primary,
  },
  editBtnText: { ...typography.bodyMedium, color: colors.primary, fontWeight: '600' },
  checkoutBtn: {
    flex: 0.65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.button, backgroundColor: colors.success,
  },
  checkoutBtnText: { ...typography.bodyMedium, color: colors.textInverse, fontWeight: '600' },
});
