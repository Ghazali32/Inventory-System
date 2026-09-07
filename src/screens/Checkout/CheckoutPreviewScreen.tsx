import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Product } from '../../api/product.api';
import { useProductStore } from '../../store/product.store';
import { toast } from '../../store/toast.store';

interface CheckoutPreviewScreenProps {
  navigation: any;
  route: any;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' && value.trim().length === 0) return '-';
  return String(value);
};

const toCurrency = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '₹0.00';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getItemUnitPrice = (product: Product): number => {
  const p = product.mop_including_gst ?? product.mrp ?? product.msp ?? product.buying_price;
  const num = Number(p);
  return Number.isNaN(num) ? 0 : num;
};

export const CheckoutPreviewScreen: React.FC<CheckoutPreviewScreenProps> = ({
  navigation,
  route,
}) => {
  const { products: storeProducts, fetchProducts } = useProductStore();

  const initialItems: CartItem[] = useMemo(() => {
    if (route.params?.items && Array.isArray(route.params.items) && route.params.items.length > 0) {
      return route.params.items;
    }
    if (route.params?.product) {
      return [{ product: route.params.product, quantity: 1 }];
    }
    return [];
  }, [route.params]);

  const [cartItems, setCartItems] = useState<CartItem[]>(initialItems);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  useEffect(() => {
    if (storeProducts.length === 0) {
      fetchProducts().catch((err) => console.log('Failed to fetch products for cart:', err));
    }
  }, [storeProducts.length, fetchProducts]);

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout Preview</Text>
          <View style={styles.headerIconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Cart is empty</Text>
          <Text style={styles.emptySubtitle}>Please select at least one product to checkout</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={18} color={colors.textInverse} />
            <Text style={styles.emptyBtnText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleQuantityChange = (index: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const nextQty = item.quantity + delta;

      if (nextQty <= 0) {
        if (updated.length === 1) {
          toast.info('At least 1 item is required in the cart.');
          return prev;
        }
        // Remove item
        return prev.filter((_, i) => i !== index);
      }

      if (nextQty > 999) {
        toast.info('Maximum quantity limit reached (999).');
        return prev;
      }

      updated[index] = { ...item, quantity: nextQty };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (cartItems.length === 1) {
      toast.info('At least 1 product is required to proceed with checkout.');
      return;
    }
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProductToCart = (productToAdd: Product) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.product.id === productToAdd.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: Math.min(999, updated[existingIdx].quantity + 1),
        };
        toast.success(`Increased ${productToAdd.brand} ${productToAdd.model} quantity to ${updated[existingIdx].quantity}`);
        return updated;
      }
      toast.success(`Added ${productToAdd.brand} ${productToAdd.model} to cart`);
      return [...prev, { product: productToAdd, quantity: 1 }];
    });
    setShowAddModal(false);
  };

  // Calculations
  const totalUnits = cartItems.reduce((sum, it) => sum + it.quantity, 0);
  const totalGrandAmount = cartItems.reduce(
    (sum, it) => sum + getItemUnitPrice(it.product) * it.quantity,
    0
  );

  const availableProducts = useMemo(() => {
    const q = modalSearchQuery.trim().toLowerCase();
    return storeProducts.filter((p) => {
      if (p.sold) return false;
      if (!q) return true;
      const brand = (p.brand || '').toLowerCase();
      const model = (p.model || '').toLowerCase();
      const barcode = (p.product_barcode || '').toLowerCase();
      const imei1 = (p.imei1 || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return (
        brand.includes(q) ||
        model.includes(q) ||
        barcode.includes(q) ||
        imei1.includes(q) ||
        cat.includes(q)
      );
    });
  }, [storeProducts, modalSearchQuery]);

  const handleProceed = () => {
    if (cartItems.length === 0) return;
    navigation.navigate('CustomerSelect', {
      items: cartItems,
      product: cartItems[0].product,
    });
  };

  const isSingleItem = cartItems.length === 1;
  const singleProduct = cartItems[0].product;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Checkout Preview</Text>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>
              {cartItems.length} {cartItems.length === 1 ? 'Product' : 'Products'} ({totalUnits} {totalUnits === 1 ? 'unit' : 'units'})
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Cart Items List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Selected Products</Text>
          <TouchableOpacity
            style={styles.addMoreLink}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.addMoreLinkText}>Add Product</Text>
          </TouchableOpacity>
        </View>

        {cartItems.map((item, idx) => {
          const unitPrice = getItemUnitPrice(item.product);
          const lineTotal = unitPrice * item.quantity;
          const hasIMEI = !!(item.product.imei1 || item.product.imei2);

          return (
            <View key={`${item.product.id}-${idx}`} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <View style={styles.brandRow}>
                    <Text style={styles.itemBrand}>{toDisplay(item.product.brand)}</Text>
                    {item.product.category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{item.product.category}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemModel}>{toDisplay(item.product.model)}</Text>
                  {hasIMEI ? (
                    <View style={styles.imeiBadge}>
                      <Ionicons name="phone-portrait-outline" size={11} color={colors.info} />
                      <Text style={styles.imeiBadgeText}>
                        IMEI: {toDisplay(item.product.imei1)}
                      </Text>
                    </View>
                  ) : item.product.product_barcode ? (
                    <Text style={styles.barcodeText}>
                      Barcode: {item.product.product_barcode}
                    </Text>
                  ) : null}
                </View>

                {cartItems.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveItem(idx)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.itemDivider} />

              <View style={styles.itemFooter}>
                <View style={styles.itemPricing}>
                  <Text style={styles.itemUnitPriceLabel}>
                    {toCurrency(unitPrice)} / unit
                  </Text>
                  <Text style={styles.itemLineTotal}>
                    {toCurrency(lineTotal)}
                  </Text>
                </View>

                {/* Quantity Stepper */}
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleQuantityChange(idx, -1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.quantity === 1 && cartItems.length > 1 ? 'trash-outline' : 'remove'}
                      size={16}
                      color={item.quantity === 1 && cartItems.length > 1 ? colors.danger : colors.text}
                    />
                  </TouchableOpacity>
                  <View style={styles.stepperValueBox}>
                    <Text style={styles.stepperValueText}>{item.quantity}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleQuantityChange(idx, 1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* Total Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Bill Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Line Items</Text>
            <Text style={styles.summaryValue}>{cartItems.length}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Quantity / Units</Text>
            <Text style={styles.summaryValue}>{totalUnits} Units</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRowGrand}>
            <Text style={styles.grandLabel}>Grand Total (MOP)</Text>
            <Text style={styles.grandValue}>{toCurrency(totalGrandAmount)}</Text>
          </View>
          <Text style={styles.gstNote}>* Inclusive of applicable GST</Text>
        </View>

        {/* Single Item Details Expandable (if exactly 1 item) */}
        {isSingleItem && (
          <View style={styles.singleItemDetailsCard}>
            <Text style={styles.singleDetailsTitle}>Product Specifications</Text>
            <DetailRow label="Barcode" value={toDisplay(singleProduct.product_barcode)} />
            <DetailRow label="IMEI 1" value={toDisplay(singleProduct.imei1)} />
            <DetailRow label="IMEI 2" value={toDisplay(singleProduct.imei2)} />
            <DetailRow label="Color" value={toDisplay(singleProduct.color)} />
            <DetailRow label="Cost Price" value={toCurrency(singleProduct.buying_price)} />
          </View>
        )}
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        {isSingleItem ? (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('ProductForm', { product: singleProduct, mode: 'edit' })}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-outline" size={18} color={colors.primary} />
            <Text style={styles.editBtnText}>Add More</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleProceed}
          activeOpacity={0.8}
        >
          <View style={styles.checkoutBtnContent}>
            <View>
              <Text style={styles.checkoutBtnSubtext}>{totalUnits} Units • {toCurrency(totalGrandAmount)}</Text>
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Add Product Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Product to Cart</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowAddModal(false)}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.modalSearchSection}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search by brand, model, barcode..."
              value={modalSearchQuery}
              onChangeText={setModalSearchQuery}
              placeholderTextColor={colors.textTertiary}
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={availableProducts}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => {
              const inCart = cartItems.find((ci) => ci.product.id === item.id);
              const price = getItemUnitPrice(item);

              return (
                <TouchableOpacity
                  style={styles.modalItemCard}
                  onPress={() => handleAddProductToCart(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemBrand}>{item.brand}</Text>
                    <Text style={styles.modalItemModel}>{item.model}</Text>
                    <View style={styles.modalItemMetaRow}>
                      {item.category && (
                        <Text style={styles.modalItemCategory}>{item.category} • </Text>
                      )}
                      {item.imei1 ? (
                        <Text style={styles.modalItemImei}>IMEI: {item.imei1}</Text>
                      ) : (
                        <Text style={styles.modalItemBarcode}>Barcode: {item.product_barcode || '-'}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.modalItemRight}>
                    <Text style={styles.modalItemPrice}>{toCurrency(price)}</Text>
                    {inCart ? (
                      <View style={styles.inCartBadge}>
                        <Text style={styles.inCartBadgeText}>{inCart.quantity} in cart</Text>
                      </View>
                    ) : (
                      <View style={styles.addBtnSmall}>
                        <Ionicons name="add" size={16} color={colors.textInverse} />
                        <Text style={styles.addBtnSmallText}>Add</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.modalEmptyWrap}>
                <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.modalEmptyTitle}>No unsold inventory found</Text>
                <Text style={styles.modalEmptySubtitle}>
                  {modalSearchQuery ? 'Try another search query' : 'All your items are currently sold'}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
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
    height: 58,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerAddBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { ...typography.subtitle, color: colors.text, fontWeight: '700' },
  cartBadge: {
    backgroundColor: colors.primaryLightest,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 2,
  },
  cartBadgeText: { ...typography.caption, color: colors.primary, fontWeight: '600', fontSize: 11 },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.heading3, color: colors.text },
  emptySubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    marginTop: spacing.sm,
  },
  emptyBtnText: { ...typography.button, color: colors.textInverse },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionHeaderTitle: { ...typography.subtitle, color: colors.text, fontWeight: '700' },
  addMoreLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addMoreLinkText: { ...typography.bodyMedium, color: colors.primary, fontWeight: '600' },

  // Item Card
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: { flex: 1, marginRight: spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  itemBrand: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  categoryBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: { ...typography.caption, color: colors.textTertiary, fontSize: 10 },
  itemModel: { ...typography.subtitle, color: colors.text, fontWeight: '700', marginTop: 2 },
  imeiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  imeiBadgeText: { ...typography.caption, color: colors.info, fontSize: 11, fontWeight: '500' },
  barcodeText: { ...typography.caption, color: colors.textTertiary, marginTop: 4 },
  removeBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.dangerLight,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPricing: {},
  itemUnitPriceLabel: { ...typography.caption, color: colors.textTertiary },
  itemLineTotal: { ...typography.subtitle, color: colors.primary, fontWeight: '700', marginTop: 1 },

  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  stepperValueBox: {
    minWidth: 36,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: { ...typography.bodyMedium, color: colors.text, fontWeight: '700' },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  summaryTitle: { ...typography.subtitle, color: colors.text, fontWeight: '700', marginBottom: spacing.sm },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: { ...typography.body, color: colors.textSecondary },
  summaryValue: { ...typography.bodyMedium, color: colors.text, fontWeight: '600' },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  summaryRowGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandLabel: { ...typography.subtitle, color: colors.text, fontWeight: '700' },
  grandValue: { ...typography.heading3, color: colors.primary, fontWeight: '800' },
  gstNote: { ...typography.caption, color: colors.textTertiary, marginTop: 4, textAlign: 'right' },

  // Single Item Details
  singleItemDetailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  singleDetailsTitle: { ...typography.subtitle, color: colors.text, fontWeight: '600', marginBottom: spacing.xs },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: { ...typography.caption, color: colors.textSecondary },
  detailValue: { ...typography.caption, color: colors.text, fontWeight: '600' },

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  editBtn: {
    flex: 0.32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primaryLightest,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  editBtnText: { ...typography.bodyMedium, color: colors.primary, fontWeight: '700' },
  checkoutBtn: {
    flex: 0.68,
    borderRadius: borderRadius.button,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  checkoutBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkoutBtnSubtext: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.9,
    fontSize: 11,
  },
  checkoutBtnText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontWeight: '700',
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    height: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: { ...typography.subtitle, color: colors.text, fontWeight: '700' },
  modalCloseBtn: { padding: spacing.xs },
  modalSearchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalSearchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  modalList: { padding: spacing.lg, paddingTop: spacing.xs, gap: spacing.sm },
  modalItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  modalItemInfo: { flex: 1, marginRight: spacing.sm },
  modalItemBrand: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  modalItemModel: { ...typography.bodyMedium, color: colors.text, fontWeight: '700' },
  modalItemMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  modalItemCategory: { ...typography.caption, color: colors.textTertiary },
  modalItemImei: { ...typography.caption, color: colors.info, fontWeight: '500' },
  modalItemBarcode: { ...typography.caption, color: colors.textTertiary },
  modalItemRight: { alignItems: 'flex-end', gap: spacing.xs },
  modalItemPrice: { ...typography.bodyMedium, color: colors.primary, fontWeight: '700' },
  inCartBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  inCartBadgeText: { ...typography.caption, color: colors.success, fontWeight: '600', fontSize: 11 },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.button,
  },
  addBtnSmallText: { ...typography.caption, color: colors.textInverse, fontWeight: '700' },
  modalEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.sm,
  },
  modalEmptyTitle: { ...typography.subtitle, color: colors.text },
  modalEmptySubtitle: { ...typography.caption, color: colors.textSecondary },
});
