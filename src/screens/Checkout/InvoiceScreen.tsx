import React, { useState, useRef } from 'react';
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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { BillingDetails, Product } from '../../api/product.api';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/toast.store';

interface InvoiceScreenProps {
  navigation: any;
  route: any;
}

const generateInvoiceHTML = (
  billing: BillingDetails,
  profile: any,
  customer: any
): string => {
  const shopName = profile?.shop_name || billing.shop_name || 'Your Business';
  const shopAddress = profile
    ? [profile.shop_address, profile.shop_city, profile.shop_state, profile.shop_pincode]
      .filter(Boolean)
      .join(', ')
    : '';
  const shopPhone = profile?.shop_phone || '';
  const shopGST = profile?.gst_registration_number || '';
  const invoiceDate = billing.invoice_date
    ? new Date(billing.invoice_date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const invoiceNumber = billing.invoice_number || `INV-${Date.now().toString().slice(-8)}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1a1a2e;
          background: #fff;
          padding: 0;
          font-size: 13px;
          line-height: 1.5;
        }

        .invoice {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 3px solid #2D6A4F;
        }
        .brand-name {
          font-size: 24px;
          font-weight: 700;
          color: #2D6A4F;
          letter-spacing: -0.5px;
        }
        .brand-sub {
          color: #6B7280;
          font-size: 12px;
          margin-top: 4px;
        }
        .invoice-label {
          text-align: right;
        }
        .invoice-label h2 {
          font-size: 28px;
          font-weight: 300;
          color: #2D6A4F;
          letter-spacing: 4px;
          text-transform: uppercase;
        }
        .invoice-meta {
          font-size: 12px;
          color: #6B7280;
          margin-top: 8px;
          text-align: right;
        }
        .invoice-meta strong {
          color: #1a1a2e;
        }

        /* Info Grid */
        .info-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 32px;
          gap: 24px;
        }
        .info-box {
          flex: 1;
          background: #f8faf9;
          border-radius: 8px;
          padding: 16px 20px;
          border-left: 3px solid #2D6A4F;
        }
        .info-box.customer {
          border-left-color: #10B981;
        }
        .info-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #6B7280;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .info-name {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 4px;
        }
        .info-detail {
          font-size: 12px;
          color: #4B5563;
          line-height: 1.6;
        }

        /* Product Table */
        .table-container {
          margin-bottom: 24px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #E5E7EB;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead th {
          background: #2D6A4F;
          color: #fff;
          padding: 12px 16px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        thead th:last-child, thead th:nth-child(n+4) {
          text-align: right;
        }
        tbody td {
          padding: 14px 16px;
          border-bottom: 1px solid #F3F4F6;
          font-size: 13px;
        }
        tbody td:last-child, tbody td:nth-child(n+4) {
          text-align: right;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }

        /* IMEI Row */
        .imei-row {
          background: #f8faf9;
          padding: 10px 16px;
          font-size: 11px;
          color: #6B7280;
          border-bottom: 1px solid #F3F4F6;
        }
        .imei-row span {
          margin-right: 24px;
          font-family: monospace;
          letter-spacing: 0.5px;
        }
        .imei-label {
          font-weight: 600;
          color: #4B5563;
        }

        /* Summary */
        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }
        .summary-box {
          width: 320px;
          background: #f8faf9;
          border-radius: 8px;
          overflow: hidden;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 20px;
          font-size: 13px;
          border-bottom: 1px solid #E5E7EB;
        }
        .summary-row:last-child {
          border-bottom: none;
        }
        .summary-label {
          color: #6B7280;
        }
        .summary-value {
          font-weight: 500;
          color: #1a1a2e;
        }
        .summary-total {
          background: #2D6A4F;
          padding: 14px 20px;
        }
        .summary-total .summary-label,
        .summary-total .summary-value {
          color: #fff;
          font-weight: 700;
          font-size: 16px;
        }

        /* Payment */
        .payment-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #D1FAE5;
          color: #065F46;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 32px;
        }

        /* Footer */
        .footer {
          border-top: 2px solid #F3F4F6;
          padding-top: 24px;
          text-align: center;
        }
        .footer-thanks {
          font-size: 16px;
          font-weight: 600;
          color: #2D6A4F;
          margin-bottom: 4px;
        }
        .footer-sub {
          font-size: 11px;
          color: #9CA3AF;
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        <!-- Header -->
        <div class="header">
          <div>
            <div class="brand-name">${shopName}</div>
            ${shopAddress ? `<div class="brand-sub">${shopAddress}</div>` : ''}
            ${shopPhone ? `<div class="brand-sub">📞 ${shopPhone}</div>` : ''}
            ${shopGST ? `<div class="brand-sub">GSTIN: ${shopGST}</div>` : ''}
          </div>
          <div class="invoice-label">
            <h2>Invoice</h2>
            <div class="invoice-meta">
              <strong>${invoiceNumber}</strong><br/>
              ${invoiceDate}
            </div>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="info-grid">
          <div class="info-box">
            <div class="info-title">From</div>
            <div class="info-name">${shopName}</div>
            ${shopAddress ? `<div class="info-detail">${shopAddress}</div>` : ''}
            ${shopPhone ? `<div class="info-detail">${shopPhone}</div>` : ''}
          </div>
          <div class="info-box customer">
            <div class="info-title">Bill To</div>
            <div class="info-name">${billing.customer_name || 'Walk-in Customer'}</div>
            ${billing.customer_address ? `<div class="info-detail">${billing.customer_address}</div>` : ''}
            ${billing.customer_contact ? `<div class="info-detail">${billing.customer_contact}</div>` : ''}
          </div>
        </div>

        <!-- Product Table -->
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>
                  <strong>${billing.brand_name} ${billing.product_name}</strong><br/>
                  <span style="font-size:11px;color:#6B7280">Model: ${billing.model_number}</span>
                </td>
                <td>${billing.hsn_sac || '-'}</td>
                <td>${billing.quantity}</td>
                <td>₹${Number(billing.rate).toLocaleString('en-IN')}</td>
                <td><strong>₹${Number(billing.amount).toLocaleString('en-IN')}</strong></td>
              </tr>
            </tbody>
          </table>
          ${billing.imei_no_1 || billing.imei_no_2
      ? `<div class="imei-row">
                  ${billing.imei_no_1 ? `<span><span class="imei-label">IMEI 1:</span> ${billing.imei_no_1}</span>` : ''}
                  ${billing.imei_no_2 ? `<span><span class="imei-label">IMEI 2:</span> ${billing.imei_no_2}</span>` : ''}
                </div>`
      : ''
    }
        </div>

        <!-- Summary -->
        <div class="summary-section">
          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Base Amount</span>
              <span class="summary-value">₹${Number(billing.base_amount || billing.amount).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">GST (${billing.gst_percent || '0'}%)</span>
              <span class="summary-value">₹${Number(billing.gst_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            ${Number(billing.cgst_amount) > 0
      ? `<div class="summary-row">
                    <span class="summary-label">CGST (${billing.cgst_percent}%)</span>
                    <span class="summary-value">₹${Number(billing.cgst_amount).toLocaleString('en-IN')}</span>
                  </div>`
      : ''
    }
            ${Number(billing.sgst_amount) > 0
      ? `<div class="summary-row">
                    <span class="summary-label">SGST (${billing.sgst_percent}%)</span>
                    <span class="summary-value">₹${Number(billing.sgst_amount).toLocaleString('en-IN')}</span>
                  </div>`
      : ''
    }
            <div class="summary-total">
              <div class="summary-row" style="border:none;padding:0;background:transparent;">
                <span class="summary-label">Total</span>
                <span class="summary-value">₹${Number(billing.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment -->
        <div class="payment-badge">
          ✓ Payment Mode: ${billing.payment_mode?.toUpperCase() || 'CASH'}
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-thanks">Thank you for your purchase!</div>
          <div class="footer-sub">This is a computer-generated invoice.</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const InvoiceScreen: React.FC<InvoiceScreenProps> = ({
  navigation,
  route,
}) => {
  const billingDetails = route.params?.billingDetails as BillingDetails;
  const product = route.params?.product as Product;
  const customer = route.params?.customer;
  const invoiceNumber = route.params?.invoiceNumber as string | undefined;
  const profile = useAuthStore((s) => s.profile);

  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const isViewOnly = route.params?.isViewOnly as boolean | undefined;

  if (!billingDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Invoice data not available</Text>
      </SafeAreaView>
    );
  }

  // Use real invoice number from checkout/complete if available
  const finalBilling = invoiceNumber
    ? { ...billingDetails, invoice_number: invoiceNumber }
    : billingDetails;

  const handleSavePDF = async () => {
    setIsSaving(true);
    try {
      const html = generateInvoiceHTML(finalBilling, profile, customer);
      const { uri } = await Print.printToFileAsync({ html });
      toast.success('Invoice PDF saved successfully.', 'PDF Saved');
    } catch (error: any) {
      toast.error('Failed to save PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const html = generateInvoiceHTML(finalBilling, profile, customer);
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Invoice',
          UTI: 'com.adobe.pdf',
        });
      } else {
        toast.warn('Sharing is not available on this device.', 'Not Available');
      }
    } catch (error: any) {
      toast.error('Failed to share invoice.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDone = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Details</Text>
        {isViewOnly ? (
          <View style={styles.headerIconBtn} />
        ) : (
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleDone}>
            <Ionicons name="checkmark" size={22} color={colors.success} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, isViewOnly && { paddingTop: spacing.md }]}
      >
        {/* Success Banner - only shown during active checkout completion */}
        {!isViewOnly && (
          <View style={styles.successBanner}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Sale Confirmed!</Text>
            <Text style={styles.successSub}>
              {invoiceNumber ? `Invoice ${invoiceNumber}` : 'Your invoice is ready to save or share.'}
            </Text>
          </View>
        )}

        {/* Invoice Preview Card */}
        <View style={styles.invoiceCard}>
          {/* Invoice Header */}
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.shopName}>
                {profile?.shop_name || finalBilling.shop_name}
              </Text>
              <Text style={styles.invoiceDate}>{finalBilling.invoice_date}</Text>
            </View>
            <View style={styles.invoiceBadge}>
              <Text style={styles.invoiceBadgeText}>INVOICE</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Customer Info */}
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionLabel}>BILL TO</Text>
            <Text style={styles.customerName}>{finalBilling.customer_name}</Text>
            {finalBilling.customer_address ? (
              <Text style={styles.customerDetail}>{finalBilling.customer_address}</Text>
            ) : null}
            {finalBilling.customer_contact ? (
              <Text style={styles.customerDetail}>📞 {finalBilling.customer_contact}</Text>
            ) : null}
          </View>

          <View style={styles.cardDivider} />

          {/* Product */}
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionLabel}>PRODUCT</Text>
            <View style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>
                  {finalBilling.brand_name} {finalBilling.product_name}
                </Text>
                <Text style={styles.productSub}>Model: {finalBilling.model_number}</Text>
                {finalBilling.imei_no_1 ? (
                  <Text style={styles.imeiText}>IMEI 1: {finalBilling.imei_no_1}</Text>
                ) : null}
                {finalBilling.imei_no_2 ? (
                  <Text style={styles.imeiText}>IMEI 2: {finalBilling.imei_no_2}</Text>
                ) : null}
              </View>
              <Text style={styles.productQty}>x{finalBilling.quantity}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Pricing */}
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionLabel}>PRICING</Text>
            <PriceRow label="Rate" value={`₹${Number(finalBilling.rate).toLocaleString('en-IN')}`} />
            <PriceRow label="Base Amount" value={`₹${Number(finalBilling.base_amount || finalBilling.amount).toLocaleString('en-IN')}`} />
            <PriceRow label={`GST (${finalBilling.gst_percent || '0'}%)`} value={`₹${Number(finalBilling.gst_amount || 0).toLocaleString('en-IN')}`} />
            {Number(finalBilling.cgst_amount) > 0 && (
              <PriceRow
                label={`CGST (${finalBilling.cgst_percent}%)`}
                value={`₹${Number(finalBilling.cgst_amount).toLocaleString('en-IN')}`}
              />
            )}
            {Number(finalBilling.sgst_amount) > 0 && (
              <PriceRow
                label={`SGST (${finalBilling.sgst_percent}%)`}
                value={`₹${Number(finalBilling.sgst_amount).toLocaleString('en-IN')}`}
              />
            )}
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              ₹{Number(finalBilling.total_amount).toLocaleString('en-IN')}
            </Text>
          </View>

          {Number(finalBilling.gst_percent) > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>GST Breakdown</Text>
              <PriceRow label="Base Amount" value={`₹${Number(finalBilling.base_amount).toLocaleString('en-IN')}`} />
              <PriceRow label={`GST (${finalBilling.gst_percent}%)`} value={`₹${Number(finalBilling.gst_amount).toLocaleString('en-IN')}`} />
              {Number(finalBilling.cgst_amount) > 0 && (
                <PriceRow
                  label={`CGST (${finalBilling.cgst_percent}%)`}
                  value={`₹${Number(finalBilling.cgst_amount).toLocaleString('en-IN')}`}
                />
              )}
              {Number(finalBilling.sgst_amount) > 0 && (
                <PriceRow
                  label={`SGST (${finalBilling.sgst_percent}%)`}
                  value={`₹${Number(finalBilling.sgst_amount).toLocaleString('en-IN')}`}
                />
              )}
            </View>
          )}

          {/* Payment Mode */}
          <View style={styles.paymentRow}>
            <Ionicons name="wallet-outline" size={16} color={colors.success} />
            <Text style={styles.paymentText}>
              Payment: {finalBilling.payment_mode?.toUpperCase() || 'CASH'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSavePDF} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          )}
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save PDF'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={isSharing}>
          {isSharing ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Ionicons name="share-outline" size={20} color={colors.textInverse} />
          )}
          <Text style={styles.shareBtnText}>{isSharing ? 'Sharing...' : 'Share'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const PriceRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.priceRow}>
    <Text style={styles.priceLabel}>{label}</Text>
    <Text style={styles.priceValue}>{value}</Text>
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
  contentContainer: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  errorText: { ...typography.body, color: colors.danger, textAlign: 'center', marginTop: spacing.xl },

  // Success Banner
  successBanner: {
    alignItems: 'center', marginBottom: spacing.xl, paddingVertical: spacing.lg,
  },
  successIconWrap: { marginBottom: spacing.md },
  successTitle: { ...typography.heading3, color: colors.text, marginBottom: 4 },
  successSub: { ...typography.body, color: colors.textSecondary },

  // Invoice Card
  invoiceCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.md, overflow: 'hidden',
  },
  invoiceHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: spacing.xl,
  },
  shopName: { ...typography.subtitle, color: colors.primary, fontSize: 17 },
  invoiceDate: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  invoiceBadge: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  invoiceBadgeText: {
    ...typography.caption, color: colors.textInverse, fontWeight: '700', letterSpacing: 2,
  },
  cardDivider: { height: 1, backgroundColor: colors.borderLight },

  // Sections
  invoiceSection: { padding: spacing.xl },
  invoiceSectionLabel: {
    ...typography.caption, color: colors.textTertiary, fontWeight: '600',
    letterSpacing: 1.5, marginBottom: spacing.sm, fontSize: 10,
  },
  customerName: { ...typography.bodyMedium, color: colors.text, fontWeight: '600' },
  customerDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  // Product
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productInfo: { flex: 1 },
  productName: { ...typography.bodyMedium, color: colors.text, fontWeight: '600' },
  productSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  imeiText: {
    ...typography.caption, color: colors.textSecondary, fontFamily: 'monospace',
    marginTop: 4, fontSize: 11,
  },
  productQty: {
    ...typography.subtitle, color: colors.primary, marginLeft: spacing.md,
  },

  // Pricing
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
  },
  priceLabel: { ...typography.body, color: colors.textSecondary },
  priceValue: { ...typography.bodyMedium, color: colors.text },

  // Total
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.primaryLightest, padding: spacing.xl,
  },
  totalLabel: { ...typography.subtitle, color: colors.primaryDark },
  totalValue: { ...typography.heading3, color: colors.primary },

  // Payment
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.lg, justifyContent: 'center',
  },
  paymentText: { ...typography.captionMedium, color: colors.success, fontWeight: '600' },
  breakdownCard: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  breakdownTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  // Action Bar
  actionBar: {
    flexDirection: 'row', gap: spacing.md, padding: spacing.lg,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  saveBtn: {
    flex: 0.45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.button,
    backgroundColor: colors.primaryLightest, borderWidth: 1.5, borderColor: colors.primary,
  },
  saveBtnText: { ...typography.bodyMedium, color: colors.primary, fontWeight: '600' },
  shareBtn: {
    flex: 0.55, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: borderRadius.button, backgroundColor: colors.success,
  },
  shareBtnText: { ...typography.bodyMedium, color: colors.textInverse, fontWeight: '600' },
});
