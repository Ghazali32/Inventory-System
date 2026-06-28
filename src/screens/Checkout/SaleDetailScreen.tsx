import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { SoldItemHistory } from '../../api/product.api';
import { useProductStore } from '../../store/product.store';
import { toast } from '../../store/toast.store';

interface SaleDetailScreenProps {
  navigation: any;
  route: any;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (dateStr: string | null): string => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatCurrency = (value: string | null): string => {
  if (!value) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

const getPaymentIcon = (mode: string): keyof typeof Ionicons.glyphMap => {
  switch (mode?.toLowerCase()) {
    case 'card': return 'card-outline';
    case 'upi': return 'phone-portrait-outline';
    case 'cheque': return 'document-text-outline';
    case 'emi': return 'calendar-outline';
    default: return 'cash-outline';
  }
};

export const SaleDetailScreen: React.FC<SaleDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const sale = route.params?.sale as SoldItemHistory;

  if (!sale) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Sale details not found</Text>
      </SafeAreaView>
    );
  }

  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const getInvoice = useProductStore((s) => s.getInvoice);

  const handleViewInvoice = async () => {
    if (!sale.invoice_number) {
      toast.error('Invoice number is not available for this sale.');
      return;
    }

    setLoadingInvoice(true);
    try {
      console.log('Fetching invoice details for:', sale.invoice_number);
      const billingDetails = await getInvoice(sale.invoice_number);
      console.log('Successfully fetched invoice. Navigating to InvoiceScreen.');
      navigation.navigate('Invoice', {
        billingDetails,
        invoiceNumber: sale.invoice_number,
        isViewOnly: true,
      });
    } catch (err: any) {
      console.error('Error fetching invoice:', err);
      toast.error(err.message || 'Failed to fetch invoice details.');
    } finally {
      setLoadingInvoice(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sale Details</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Sale Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusIconWrap}>
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
          </View>
          <Text style={styles.statusTitle}>Sale Completed</Text>
          <Text style={styles.statusDate}>
            {formatDate(sale.selling_datetime)} · {formatTime(sale.selling_datetime)}
          </Text>
          {sale.invoice_number && (
            <View style={styles.invoiceBadge}>
              <Ionicons name="receipt-outline" size={12} color={colors.primary} />
              <Text style={styles.invoiceBadgeText}>#{sale.invoice_number}</Text>
            </View>
          )}
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(sale.total_amount)}</Text>
          <View style={styles.amountMeta}>
            <View style={[styles.paymentChip, { backgroundColor: getPaymentColor(sale.payment_mode) + '18' }]}>
              <Ionicons
                name={getPaymentIcon(sale.payment_mode)}
                size={14}
                color={getPaymentColor(sale.payment_mode)}
              />
              <Text style={[styles.paymentChipText, { color: getPaymentColor(sale.payment_mode) }]}>
                {sale.payment_mode?.toUpperCase() || 'CASH'}
              </Text>
            </View>
            <Text style={styles.qtyText}>Qty: {sale.quantity}</Text>
          </View>
        </View>

        {/* Product Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Product</Text>
          </View>

          <DetailRow label="Brand" value={sale.product_brand} />
          <DetailRow label="Model" value={sale.product_model} />
          <DetailRow label="SKU" value={sale.product_sku} />
          <DetailRow label="Barcode" value={sale.product_barcode || '-'} mono />

          {sale.imei_no_1 && (
            <DetailRow label="IMEI 1" value={sale.imei_no_1} mono />
          )}
          {sale.imei_no_2 && (
            <DetailRow label="IMEI 2" value={sale.imei_no_2} mono />
          )}
        </View>

        {/* Customer Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: colors.successLight }]}>
              <Ionicons name="person-outline" size={18} color={colors.success} />
            </View>
            <Text style={styles.cardTitle}>Customer</Text>
          </View>

          <DetailRow label="Name" value={sale.customer_name || 'Walk-in Customer'} />
          <DetailRow label="Contact" value={sale.customer_contact || '-'} />
          {sale.customer_id && (
            <DetailRow label="Customer ID" value={sale.customer_id} mono small />
          )}
        </View>

        {/* Sale Meta */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            </View>
            <Text style={styles.cardTitle}>Sale Info</Text>
          </View>

          <DetailRow label="Sale ID" value={`#${sale.id}`} />
          {sale.invoice_number && (
            <DetailRow label="Invoice" value={sale.invoice_number} />
          )}
          {sale.invoice_date && (
            <DetailRow label="Invoice Date" value={formatDate(sale.invoice_date)} />
          )}
          <DetailRow label="Sold On" value={`${formatDate(sale.selling_datetime)} ${formatTime(sale.selling_datetime)}`} />
          {sale.inventory_id && (
            <DetailRow label="Inventory ID" value={`#${sale.inventory_id}`} />
          )}
          <DetailRow label="Created" value={formatDate(sale.created_at)} />
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.viewInvoiceBtn}
          onPress={handleViewInvoice}
          disabled={loadingInvoice}
        >
          {loadingInvoice ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          )}
          <Text style={styles.viewInvoiceBtnText}>
            {loadingInvoice ? 'Loading Invoice...' : 'View Invoice'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Helper component
const DetailRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}> = ({ label, value, mono, small }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text
      style={[
        styles.detailValue,
        mono && styles.mono,
        small && { fontSize: 11 },
      ]}
      numberOfLines={1}
    >
      {value}
    </Text>
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

  // Status Banner
  statusBanner: {
    alignItems: 'center', paddingVertical: spacing.xl,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
  },
  statusIconWrap: { marginBottom: spacing.sm },
  statusTitle: { ...typography.heading3, color: colors.text, marginBottom: 4 },
  statusDate: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  invoiceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryLightest, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs, borderRadius: borderRadius.full,
  },
  invoiceBadgeText: {
    ...typography.captionMedium, color: colors.primary, fontFamily: 'monospace',
  },

  // Amount Card
  amountCard: {
    alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg,
    backgroundColor: colors.primaryDark, borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  amountLabel: {
    ...typography.caption, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase',
    letterSpacing: 1.5, fontWeight: '600', marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: 32, fontWeight: '700', color: colors.textInverse,
    letterSpacing: -0.5, marginBottom: spacing.md,
  },
  amountMeta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
  },
  paymentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  paymentChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  qtyText: { ...typography.body, color: 'rgba(255,255,255,0.7)' },

  // Cards
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  cardIconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLightest,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { ...typography.subtitle, color: colors.text, fontSize: 15 },

  // Detail Row
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  detailLabel: { ...typography.body, color: colors.textSecondary, flex: 0.4 },
  detailValue: { ...typography.bodyMedium, color: colors.text, flex: 0.6, textAlign: 'right' },
  mono: { fontFamily: 'monospace', letterSpacing: 0.5 },

  // Action Bar
  actionBar: {
    padding: spacing.lg, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  viewInvoiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.button,
    backgroundColor: colors.primaryLightest, borderWidth: 1.5, borderColor: colors.primary,
  },
  viewInvoiceBtnText: { ...typography.bodyMedium, color: colors.primary, fontWeight: '600' },
});
