import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useProductStore } from '../../store/product.store';
import { SoldItemHistory } from '../../api/product.api';

interface SalesHistoryScreenProps {
  navigation: any;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatCurrency = (value: string | null): string => {
  if (!value) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const getPaymentIcon = (mode: string): keyof typeof Ionicons.glyphMap => {
  switch (mode?.toLowerCase()) {
    case 'card': return 'card-outline';
    case 'upi': return 'phone-portrait-outline';
    case 'cheque': return 'document-text-outline';
    case 'emi': return 'calendar-outline';
    default: return 'cash-outline';
  }
};

const getPaymentColor = (mode: string): string => {
  switch (mode?.toLowerCase()) {
    case 'card': return colors.info;
    case 'upi': return '#7C3AED';
    case 'cheque': return colors.warning;
    case 'emi': return '#EC4899';
    default: return colors.success;
  }
};

export const SalesHistoryScreen: React.FC<SalesHistoryScreenProps> = ({ navigation }) => {
  const { salesHistory, isLoading, fetchSalesHistory } = useProductStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSalesHistory(100);
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSalesHistory(100);
    setRefreshing(false);
  }, []);

  // Compute summary stats
  const totalSales = salesHistory.length;
  const totalRevenue = salesHistory.reduce((sum, item) => {
    return sum + (item.total_amount ? Number(item.total_amount) : 0);
  }, 0);
  const todaySales = salesHistory.filter((item) => {
    const today = new Date().toDateString();
    return new Date(item.selling_datetime).toDateString() === today;
  }).length;

  const renderSoldItem = ({ item, index }: { item: SoldItemHistory; index: number }) => (
    <TouchableOpacity
      style={styles.saleCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('SaleDetail', { sale: item })}
    >
      {/* Top Row: Product + Amount */}
      <View style={styles.saleTopRow}>
        <View style={styles.saleProductInfo}>
          <View style={styles.saleIconWrap}>
            <Ionicons name="bag-check-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.saleProductText}>
            <Text style={styles.saleProductName} numberOfLines={1}>
              {item.product_brand} {item.product_model}
            </Text>
            <Text style={styles.saleSku} numberOfLines={1}>
              {item.product_barcode || item.product_sku}
            </Text>
          </View>
        </View>
        <View style={styles.saleAmountWrap}>
          <Text style={styles.saleAmount}>{formatCurrency(item.total_amount)}</Text>
          <Text style={styles.saleQty}>Qty: {item.quantity}</Text>
        </View>
      </View>

      {/* IMEI Row */}
      {(item.imei_no_1 || item.imei_no_2) && (
        <View style={styles.imeiRow}>
          {item.imei_no_1 ? (
            <View style={styles.imeiChip}>
              <Text style={styles.imeiLabel}>IMEI 1</Text>
              <Text style={styles.imeiValue}>{item.imei_no_1}</Text>
            </View>
          ) : null}
          {item.imei_no_2 ? (
            <View style={styles.imeiChip}>
              <Text style={styles.imeiLabel}>IMEI 2</Text>
              <Text style={styles.imeiValue}>{item.imei_no_2}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Bottom Row: Customer + Date + Payment */}
      <View style={styles.saleBottomRow}>
        {/* Customer */}
        <View style={styles.saleCustomer}>
          <Ionicons name="person-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.saleCustomerName} numberOfLines={1}>
            {item.customer_name || 'Walk-in'}
          </Text>
        </View>

        {/* Date */}
        <View style={styles.saleDate}>
          <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.saleDateText}>
            {formatDate(item.selling_datetime)}
          </Text>
        </View>

        {/* Payment Badge */}
        <View style={[styles.paymentBadge, { backgroundColor: getPaymentColor(item.payment_mode) + '18' }]}>
          <Ionicons
            name={getPaymentIcon(item.payment_mode)}
            size={12}
            color={getPaymentColor(item.payment_mode)}
          />
          <Text style={[styles.paymentText, { color: getPaymentColor(item.payment_mode) }]}>
            {item.payment_mode?.toUpperCase() || 'CASH'}
          </Text>
        </View>
      </View>

      {/* Invoice Number */}
      {item.invoice_number && (
        <View style={styles.invoiceRow}>
          <Ionicons name="receipt-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.invoiceText}>#{item.invoice_number}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
          <View style={styles.statIconWrap}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{totalSales}</Text>
          <Text style={styles.statLabel}>Total Sales</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.successLight }]}>
            <Ionicons name="cash-outline" size={18} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(String(totalRevenue))}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: colors.info }]}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.infoLight }]}>
            <Ionicons name="today-outline" size={18} color={colors.info} />
          </View>
          <Text style={styles.statValue}>{todaySales}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Sales History</Text>
        <Text style={styles.listCount}>{totalSales} items</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Sales Yet</Text>
      <Text style={styles.emptySub}>
        Your sold items will appear here once you complete a checkout.
      </Text>
      <TouchableOpacity
        style={styles.emptyCta}
        onPress={() => navigation.navigate('SellScan')}
      >
        <Ionicons name="cart-outline" size={18} color={colors.textInverse} />
        <Text style={styles.emptyCtaText}>Start Selling</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="analytics-outline" size={18} color={colors.primary} />
          <Text style={styles.headerTitle}>Sales History</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading && salesHistory.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading sales history...</Text>
        </View>
      ) : (
        <FlatList
          data={salesHistory}
          renderItem={renderSoldItem}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            salesHistory.length === 0 ? styles.emptyList : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56, paddingHorizontal: spacing.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.subtitle, color: colors.text },

  // Loading
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md,
  },
  loadingText: { ...typography.body, color: colors.textSecondary },

  // Stats
  statsContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  statsRow: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, borderLeftWidth: 3, ...shadows.sm,
    alignItems: 'center', gap: 4,
  },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLightest,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  statValue: {
    ...typography.bodyMedium, color: colors.text, fontWeight: '700', fontSize: 14,
  },
  statLabel: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },

  // List Header
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md,
  },
  listTitle: { ...typography.subtitle, color: colors.text },
  listCount: { ...typography.caption, color: colors.textSecondary },

  // List
  listContent: { paddingBottom: spacing['3xl'] },
  emptyList: { flexGrow: 1 },

  // Sale Card
  saleCard: {
    backgroundColor: colors.surface, marginHorizontal: spacing.lg,
    marginBottom: spacing.md, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.sm,
  },
  saleTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  saleProductInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md },
  saleIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLightest,
    alignItems: 'center', justifyContent: 'center',
  },
  saleProductText: { flex: 1 },
  saleProductName: { ...typography.bodyMedium, color: colors.text, fontWeight: '600' },
  saleSku: { ...typography.caption, color: colors.textTertiary, fontSize: 11, marginTop: 1 },
  saleAmountWrap: { alignItems: 'flex-end', marginLeft: spacing.md },
  saleAmount: { ...typography.subtitle, color: colors.primary, fontSize: 16 },
  saleQty: { ...typography.caption, color: colors.textTertiary, fontSize: 10, marginTop: 2 },

  // IMEI
  imeiRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    marginBottom: spacing.sm, paddingLeft: 48,
  },
  imeiChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  imeiLabel: {
    ...typography.caption, color: colors.textTertiary, fontSize: 9,
    fontWeight: '600', textTransform: 'uppercase',
  },
  imeiValue: {
    ...typography.caption, color: colors.textSecondary, fontSize: 10, fontFamily: 'monospace',
  },

  // Bottom Row
  saleBottomRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  saleCustomer: {
    flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1,
  },
  saleCustomerName: { ...typography.caption, color: colors.textSecondary, fontSize: 11 },
  saleDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  saleDateText: { ...typography.caption, color: colors.textTertiary, fontSize: 10 },
  paymentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  paymentText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // Invoice
  invoiceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: spacing.sm, paddingTop: spacing.xs,
  },
  invoiceText: { ...typography.caption, color: colors.textTertiary, fontSize: 10, fontFamily: 'monospace' },

  // Empty State
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing['3xl'], gap: spacing.md,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.heading3, color: colors.text },
  emptySub: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.success, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: borderRadius.button, marginTop: spacing.lg,
  },
  emptyCtaText: { ...typography.bodyMedium, color: colors.textInverse, fontWeight: '600' },
});
