import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Product } from '../../api/product.api';
import { useProductStore } from '../../store/product.store';
import { toast } from '../../store/toast.store';

interface ProductDetailsScreenProps {
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
  return `Rs ${num.toFixed(2)}`;
};

const hasFullInventoryShape = (product: Partial<Product> | null | undefined): boolean => {
  if (!product) return false;
  return Boolean(product.brand && product.model && product.category && product.product_barcode);
};

const toDateTime = (value: unknown): string => {
  if (!value || typeof value !== 'string') return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ProductDetailsScreen: React.FC<ProductDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const routeProduct = route.params?.product as Product | undefined;
  const { products, fetchProducts } = useProductStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedProduct, setResolvedProduct] = useState<Product | null>(routeProduct ?? null);
  const { deleteProduct } = useProductStore();
  const lookupStartedRef = useRef(false);

  useEffect(() => {
    setResolvedProduct(routeProduct ?? null);
    lookupStartedRef.current = false;
  }, [routeProduct?.id, routeProduct?.brand, routeProduct?.model, routeProduct?.category, routeProduct?.product_barcode]);

  useEffect(() => {
    if (!routeProduct?.id) {
      return;
    }

    const localMatch = products.find((item) => item.id === routeProduct.id);
    if (hasFullInventoryShape(localMatch)) {
      setResolvedProduct(localMatch ?? null);
      setIsResolving(false);
      return;
    }

    if (!hasFullInventoryShape(routeProduct) && !lookupStartedRef.current) {
      lookupStartedRef.current = true;
      setIsResolving(true);
      
      const store = useProductStore.getState() as any;
      if (store.fetchProductDetail) {
        store.fetchProductDetail(routeProduct.id)
          .then((detail: Product) => {
            setResolvedProduct(detail);
          })
          .catch((err: any) => {
            console.log('Failed to fetch single product detail, falling back to all products:', err);
            fetchProducts()
              .then(() => {
                const refreshed = useProductStore.getState().products.find((item) => item.id === routeProduct.id);
                setResolvedProduct(refreshed ?? routeProduct ?? null);
              });
          })
          .finally(() => setIsResolving(false));
      } else {
        fetchProducts()
          .then(() => {
            const refreshed = useProductStore.getState().products.find((item) => item.id === routeProduct.id);
            setResolvedProduct(refreshed ?? routeProduct ?? null);
          })
          .finally(() => setIsResolving(false));
      }
    }
  }, [routeProduct?.id, fetchProducts, products, routeProduct]);

  const product = resolvedProduct;

  const specsEntries = useMemo(
    () => Object.entries(product?.specs || {}),
    [product?.specs]
  );

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Product not found</Text>
      </SafeAreaView>
    );
  }

  const priceBreakdown = product.price_breakdown || {};
  const displayPrice = product.mop_including_gst ?? product.mrp ?? product.msp ?? product.buying_price;
  const displayBasePrice = product.mop_excluding_gst ?? priceBreakdown.base_amount ?? product.msp ?? product.buying_price;
  const displayGst = product.gst_label || (product.gst != null ? `including ${product.gst}% GST` : '-');

  const handleEdit = () => {
    navigation.navigate('ProductForm', { product, mode: 'edit' });
  };

  const handleSell = () => {
    navigation.navigate('CheckoutPreview', { product });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.brand} ${product.model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteProduct(product.id);
              toast.success('Product deleted successfully');
              navigation.goBack();
            } catch (error: any) {
              toast.error(error.message || 'Failed to delete product');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {isResolving ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading full inventory details...</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="cube-outline" size={26} color={colors.primaryDark} />
            </View>
            <View style={styles.statusPillWrap}>
              <View
                style={[
                  styles.statusPill,
                  product.sold ? styles.statusSold : styles.statusInStock,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: product.sold ? colors.danger : colors.success },
                  ]}
                >
                  {product.sold ? 'Sold' : 'In Stock'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.heroBrand}>{toDisplay(product.brand)}</Text>
          <Text style={styles.heroModel}>{toDisplay(product.model)}</Text>

          <View style={styles.heroTagsRow}>
            <Tag text={`SKU ${toDisplay(product.sku || product.product_id)}`} />
            <Tag text={toDisplay(product.category)} />
            <Tag text={`Color ${toDisplay(product.color)}`} />
          </View>
        </View>

        <SectionCard title="Identity">
          <DetailRow label="Inventory ID" value={toDisplay(product.id)} />
          <DetailRow label="Account ID" value={toDisplay(product.account_id)} />
          <DetailRow label="SKU" value={toDisplay(product.sku || product.product_id)} />
          <DetailRow label="Barcode" value={toDisplay(product.product_barcode)} />
          <DetailRow label="Brand" value={toDisplay(product.brand)} />
          <DetailRow label="Model" value={toDisplay(product.model)} />
          <DetailRow label="Category" value={toDisplay(product.category)} />
          <DetailRow label="Color" value={toDisplay(product.color)} />
        </SectionCard>

        <SectionCard title="Tracking">
          <DetailRow label="IMEI 1" value={toDisplay(product.imei1 || product.imei_primary)} />
          <DetailRow label="IMEI 2" value={toDisplay(product.imei2 || product.imei_secondary)} />
          <DetailRow label="Sold" value={product.sold ? 'Yes' : 'No'} />
          <DetailRow label="Sold At" value={toDateTime(product.sold_datetime)} />
        </SectionCard>

        <SectionCard title="Pricing">
          <DetailRow label="MOP" value={toCurrency(displayPrice)} />
          <DetailRow label="Base Price" value={toCurrency(displayBasePrice)} />
          <DetailRow label="Buying Price" value={toCurrency(product.buying_price)} />
          <DetailRow label="MSP" value={toCurrency(product.msp)} />
          <DetailRow label="MRP" value={toCurrency(product.mrp)} />
          <DetailRow label="GST" value={displayGst} />
          {priceBreakdown.gst_amount != null && (
            <DetailRow label="GST Amount" value={toCurrency(priceBreakdown.gst_amount)} />
          )}
          {priceBreakdown.cgst_amount != null && (
            <DetailRow label="CGST" value={`${priceBreakdown.cgst_percent ?? '-'}% · ${toCurrency(priceBreakdown.cgst_amount)}`} />
          )}
          {priceBreakdown.sgst_amount != null && (
            <DetailRow label="SGST" value={`${priceBreakdown.sgst_percent ?? '-'}% · ${toCurrency(priceBreakdown.sgst_amount)}`} />
          )}
        </SectionCard>

        <SectionCard title="Specifications">
          {specsEntries.length > 0 ? (
            specsEntries.map(([key, value]) => (
              <DetailRow
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={toDisplay(value)}
              />
            ))
          ) : (
            <Text style={styles.emptySectionText}>No specifications available.</Text>
          )}
        </SectionCard>

        <SectionCard title="Timestamps">
          <DetailRow label="Inventory Entry" value={toDateTime(product.inventory_entry_datetime)} />
          <DetailRow label="Created" value={toDateTime(product.created_at)} />
          <DetailRow label="Updated" value={toDateTime(product.updated_at)} />
        </SectionCard>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={handleEdit}
          disabled={isDeleting || product.sold}
        >
          <Ionicons name="create-outline" size={18} color={product.sold ? colors.textTertiary : colors.primary} />
          <Text style={[styles.actionButtonText, { color: product.sold ? colors.textTertiary : colors.primary }]}>Edit</Text>
        </TouchableOpacity>

        {!product.sold ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.sellButton]}
            onPress={handleSell}
            disabled={isDeleting}
          >
            <Ionicons name="cart-outline" size={18} color={colors.success} />
            <Text style={[styles.actionButtonText, { color: colors.success }]}>Sell</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.actionButton, styles.soldBadgeButton]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textTertiary} />
            <Text style={[styles.actionButtonText, { color: colors.textTertiary }]}>Sold</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          )}
          <Text style={[styles.actionButtonText, { color: colors.danger }]}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const Tag: React.FC<{ text: string }> = ({ text }) => {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
};

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
    gap: spacing.lg,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  heroCard: {
    backgroundColor: colors.primaryLightest,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    ...shadows.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillWrap: {
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusInStock: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  statusSold: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  heroBrand: {
    ...typography.heading3,
    color: colors.text,
  },
  heroModel: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  heroTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 0.45,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 0.55,
    textAlign: 'right',
  },
  emptySectionText: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  actionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  soldBadgeButton: {
    backgroundColor: colors.divider,
    borderColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  editButton: {
    backgroundColor: colors.primaryLightest,
    borderColor: colors.primary,
  },
  sellButton: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  deleteButton: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  actionButtonText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
