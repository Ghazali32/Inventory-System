import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { BillingDetails, Product, UpdateInvoicePayload } from '../../api/product.api';
import { useAuthStore } from '../../store/auth.store';
import { useProductStore } from '../../store/product.store';
import { toast } from '../../store/toast.store';
import { numberToWords } from '../../utils/numberToWords';
import { getApiBaseUrl } from '../../api/client';

interface InvoiceScreenProps {
  navigation: any;
  route: any;
}

export const safeNumber = (val: any, fallback = 0): number => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val);
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
};

export interface ResolvedInvoicePricing {
  rate: number;
  amount: number;
  totalAmount: number;
  baseAmount: number;
  gstPercent: number;
  gstAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  items: Array<any>;
}

export const resolveInvoicePricing = (
  billing: BillingDetails,
  fallbackProduct?: Product
): ResolvedInvoicePricing => {
  const items = Array.isArray(billing.items) && billing.items.length > 0 ? billing.items : [];

  let rawRate = safeNumber(billing.rate);
  if (rawRate === 0 && items.length > 0) {
    rawRate = safeNumber(items[0].rate);
  }
  if (rawRate === 0 && safeNumber(billing.amount) > 0) {
    rawRate = safeNumber(billing.amount) / (safeNumber(billing.quantity) || 1);
  }
  if (rawRate === 0 && safeNumber(billing.total_amount) > 0) {
    rawRate = safeNumber(billing.total_amount) / (safeNumber(billing.quantity) || 1);
  }
  if (rawRate === 0 && fallbackProduct) {
    rawRate = safeNumber(fallbackProduct.msp) || safeNumber(fallbackProduct.buying_price) || safeNumber(fallbackProduct.mrp);
  }

  let totalAmount = safeNumber(billing.total_amount);
  if (totalAmount === 0 && safeNumber(billing.amount) > 0) {
    totalAmount = safeNumber(billing.amount);
  }
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, it) => {
      const itAmt = safeNumber(it.total_amount) || safeNumber(it.amount) || (safeNumber(it.rate) * (safeNumber(it.quantity) || 1));
      return sum + itAmt;
    }, 0);
  }
  if (totalAmount === 0) {
    const qty = safeNumber(billing.quantity) || 1;
    totalAmount = rawRate * qty;
  }
  if (rawRate === 0 && totalAmount > 0) {
    rawRate = totalAmount / (safeNumber(billing.quantity) || 1);
  }

  let gstPercent = safeNumber(billing.gst_percent);
  if (gstPercent === 0 && fallbackProduct && safeNumber(fallbackProduct.gst) > 0) {
    gstPercent = safeNumber(fallbackProduct.gst);
  }

  if (gstPercent === 0) {
    const combinedText = [
      billing.product_name,
      billing.brand_name,
      billing.model_number,
      fallbackProduct?.category,
      fallbackProduct?.brand,
      fallbackProduct?.model,
      ...(items.map((i) => `${i.brand_name || ''} ${i.product_name || ''} ${i.model_number || ''}`)),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const isExplicitlyNonGstOrGift =
      combinedText.includes('gift') ||
      combinedText.includes('local') ||
      combinedText.includes('non-gst') ||
      combinedText.includes('nongst') ||
      combinedText.includes('voucher') ||
      combinedText.includes('free');

    const isElectronicOrPhone =
      Boolean(billing.imei_no_1 || billing.imei_no_2 || fallbackProduct?.imei1 || fallbackProduct?.imei2) ||
      /phone|mobile|smart|laptop|tablet|electro|access|headphone|earphone|watch|charger|cable|gadget|device|iphone|samsung|nothing|realme|oppo|vivo|oneplus|xiaomi|redmi|poco|apple|motorola|nokia/i.test(
        combinedText
      );

    if (isElectronicOrPhone && !isExplicitlyNonGstOrGift) {
      gstPercent = 18;
    } else {
      gstPercent = 0;
    }
  }

  let baseAmount = safeNumber(billing.base_amount);
  if (gstPercent > 0) {
    if (baseAmount === 0 || baseAmount === totalAmount) {
      baseAmount = Math.round((totalAmount / (1 + gstPercent / 100)) * 100) / 100;
    }
  } else {
    baseAmount = totalAmount;
  }

  let gstAmount = safeNumber(billing.gst_amount);
  if (gstPercent > 0) {
    if (gstAmount === 0) {
      gstAmount = Math.round((totalAmount - baseAmount) * 100) / 100;
    }
  } else {
    gstAmount = 0;
  }

  const cgstPercent = gstPercent > 0 ? (safeNumber(billing.cgst_percent) || (gstPercent / 2)) : 0;
  const sgstPercent = gstPercent > 0 ? (safeNumber(billing.sgst_percent) || (gstPercent / 2)) : 0;

  let cgstAmount = 0;
  let sgstAmount = 0;
  if (gstPercent > 0) {
    cgstAmount = safeNumber(billing.cgst_amount) || Math.round((gstAmount / 2) * 100) / 100;
    sgstAmount = safeNumber(billing.sgst_amount) || Math.round((gstAmount / 2) * 100) / 100;
  }

  const resolvedItems = items.map((it) => {
    const itemRate = safeNumber(it.rate) || rawRate;
    const itemQty = safeNumber(it.quantity) || 1;
    const itemAmount = safeNumber(it.amount) || safeNumber(it.total_amount) || (itemRate * itemQty);
    return {
      ...it,
      rate: itemRate,
      quantity: itemQty,
      amount: itemAmount,
      total_amount: itemAmount,
    };
  });

  return {
    rate: rawRate,
    amount: totalAmount,
    totalAmount,
    baseAmount,
    gstPercent,
    gstAmount,
    cgstPercent,
    cgstAmount,
    sgstPercent,
    sgstAmount,
    items: resolvedItems,
  };
};

const generateInvoiceHTML = (
  billing: BillingDetails,
  profile: any,
  customer: any,
  signatureBase64?: string | null,
  product?: Product
): string => {
  const pricing = resolveInvoicePricing(billing, product);
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
        /* Summary */
        .summary-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 24px;
        }
        .words-box {
          flex: 1;
          padding: 12px 16px;
          background: #f8faf9;
          border-radius: 8px;
          border-left: 3px solid #2D6A4F;
        }
        .words-label {
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          display: block;
        }
        .words-value {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a2e;
          line-height: 1.4;
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

        /* Bottom Section with Signatory */
        .bottom-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 32px;
          padding-top: 16px;
        }
        .payment-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #D1FAE5;
          color: #065F46;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .signatory-box {
          text-align: center;
          width: 200px;
        }
        .signatory-signature-wrap {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
        }
        .signatory-signature-img {
          max-width: 160px;
          max-height: 55px;
          object-fit: contain;
        }
        .signatory-line {
          height: 1px;
          background: #9CA3AF;
          margin: 8px 0 4px 0;
        }
        .signatory-firm {
          font-size: 11px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .signatory-title {
          font-size: 10px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
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
              ${
                pricing.items && pricing.items.length > 0
                  ? pricing.items
                      .map(
                        (it, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>
                        <strong>${it.brand_name || ''} ${it.product_name || ''}</strong><br/>
                        <span style="font-size:11px;color:#6B7280">Model: ${it.model_number || ''}</span>
                        ${
                          it.imei_no_1 || it.imei_no_2
                            ? `<br/><span style="font-size:10px;font-family:monospace;color:#4B5563">IMEI: ${[it.imei_no_1, it.imei_no_2].filter(Boolean).join(', ')}</span>`
                            : ''
                        }
                      </td>
                      <td>${it.hsn_sac || '-'}</td>
                      <td>${it.quantity}</td>
                      <td>₹${safeNumber(it.rate).toLocaleString('en-IN')}</td>
                      <td><strong>₹${safeNumber(it.amount || it.total_amount).toLocaleString('en-IN')}</strong></td>
                    </tr>
                  `
                      )
                      .join('')
                  : `
                    <tr>
                      <td>1</td>
                      <td>
                        <strong>${billing.brand_name || ''} ${billing.product_name || ''}</strong><br/>
                        <span style="font-size:11px;color:#6B7280">Model: ${billing.model_number || ''}</span>
                      </td>
                      <td>${billing.hsn_sac || '-'}</td>
                      <td>${safeNumber(billing.quantity, 1)}</td>
                      <td>₹${pricing.rate.toLocaleString('en-IN')}</td>
                      <td><strong>₹${pricing.totalAmount.toLocaleString('en-IN')}</strong></td>
                    </tr>
                  `
              }
            </tbody>
          </table>
          ${
            !billing.items && (billing.imei_no_1 || billing.imei_no_2)
              ? `<div class="imei-row">
                  ${billing.imei_no_1 ? `<span><span class="imei-label">IMEI 1:</span> ${billing.imei_no_1}</span>` : ''}
                  ${billing.imei_no_2 ? `<span><span class="imei-label">IMEI 2:</span> ${billing.imei_no_2}</span>` : ''}
                </div>`
              : ''
          }
        </div>

        <!-- Summary & Words Section -->
        <div class="summary-section">
          <div class="words-box">
            <span class="words-label">Invoice Amount in Words</span>
            <div class="words-value">${numberToWords(pricing.totalAmount)}</div>
          </div>

          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Base Amount</span>
              <span class="summary-value">₹${pricing.baseAmount.toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">GST (${pricing.gstPercent}%)</span>
              <span class="summary-value">₹${pricing.gstAmount.toLocaleString('en-IN')}</span>
            </div>
            ${
              pricing.cgstAmount > 0
                ? `<div class="summary-row">
                    <span class="summary-label">CGST (${pricing.cgstPercent}%)</span>
                    <span class="summary-value">₹${pricing.cgstAmount.toLocaleString('en-IN')}</span>
                  </div>`
                : ''
            }
            ${
              pricing.sgstAmount > 0
                ? `<div class="summary-row">
                    <span class="summary-label">SGST (${pricing.sgstPercent}%)</span>
                    <span class="summary-value">₹${pricing.sgstAmount.toLocaleString('en-IN')}</span>
                  </div>`
                : ''
            }
            <div class="summary-total">
              <div class="summary-row" style="border:none;padding:0;background:transparent;">
                <span class="summary-label">Total</span>
                <span class="summary-value">₹${pricing.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Section with Payment Badge and Authorized Signatory -->
        <div class="bottom-section">
          <div class="payment-badge">
            ✓ Payment Mode: ${billing.payment_mode?.toUpperCase() || 'CASH'}
          </div>

          <div class="signatory-box">
            <div class="signatory-signature-wrap">
              ${
                signatureBase64 || billing.signature_image_base64
                  ? `<img src="${signatureBase64 || billing.signature_image_base64}" class="signatory-signature-img" alt="Authorized Signatory" />`
                  : `<div style="width: 140px; height: 1px; border-bottom: 1px dashed #9CA3AF; margin-top: 30px;"></div>`
              }
            </div>
            <div class="signatory-firm">For ${shopName}</div>
            <div class="signatory-title">Authorized Signatory</div>
          </div>
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
  const initialBillingDetails = route.params?.billingDetails as BillingDetails;
  const product = route.params?.product as Product;
  const customer = route.params?.customer;
  const invoiceNumber = route.params?.invoiceNumber as string | undefined;
  const profile = useAuthStore((s) => s.profile);
  const signatureImage = useAuthStore((s) => s.signatureImage);
  const updateInvoice = useProductStore((s) => s.updateInvoice);

  const [billingDetailsState, setBillingDetailsState] = useState<BillingDetails | null>(initialBillingDetails || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isUpdatingInvoice, setIsUpdatingInvoice] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit form state
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerContact, setEditCustomerContact] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editCustomerGst, setEditCustomerGst] = useState('');
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('');
  const [editShopName, setEditShopName] = useState('');
  const [editShopContact, setEditShopContact] = useState('');
  const [editShopAddress, setEditShopAddress] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editRate, setEditRate] = useState('');

  const isViewOnly = route.params?.isViewOnly as boolean | undefined;

  if (!billingDetailsState) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Invoice data not available</Text>
      </SafeAreaView>
    );
  }

  const finalBilling = invoiceNumber
    ? { ...billingDetailsState, invoice_number: invoiceNumber }
    : billingDetailsState;

  const pricing = resolveInvoicePricing(finalBilling, product);

  const effectiveSignature = finalBilling.signature_image_base64 || signatureImage;

  const handleOpenEditModal = () => {
    setEditCustomerName(finalBilling.customer_name || '');
    setEditCustomerContact(finalBilling.customer_contact || '');
    setEditCustomerAddress(finalBilling.customer_address || '');
    setEditCustomerGst(finalBilling.customer_gst || '');
    setEditInvoiceDate(finalBilling.invoice_date || new Date().toISOString().slice(0, 10));
    setEditPaymentMode(finalBilling.payment_mode || 'cash');
    setEditShopName(profile?.shop_name || finalBilling.shop_name || '');
    setEditShopContact(profile?.shop_phone || finalBilling.customer_contact || '');
    setEditShopAddress(profile ? [profile.shop_address, profile.shop_city, profile.shop_state].filter(Boolean).join(', ') : '');
    setEditGstin(profile?.gst_registration_number || '');
    setEditRate(String(pricing.rate || ''));
    setShowEditModal(true);
  };

  const handleSaveInvoiceEdit = async () => {
    const invNo = finalBilling.invoice_number;
    if (!invNo) {
      toast.error('Invoice number is not available to edit.');
      return;
    }

    setIsUpdatingInvoice(true);
    try {
      const payload: UpdateInvoicePayload = {
        customer_name: editCustomerName.trim() || undefined,
        customer_contact: editCustomerContact.trim() || undefined,
        customer_address: editCustomerAddress.trim() || undefined,
        customer_gst: editCustomerGst.trim() || undefined,
        invoice_date: editInvoiceDate.trim() || undefined,
        payment_mode: editPaymentMode.trim().toLowerCase() || undefined,
        shop_name: editShopName.trim() || undefined,
        shop_contact: editShopContact.trim() || undefined,
        shop_address: editShopAddress.trim() || undefined,
        gstin: editGstin.trim() || undefined,
      };

      const newRateNum = safeNumber(editRate);

      if (finalBilling.items && finalBilling.items.length > 0) {
        payload.items = finalBilling.items.map((item, idx) => {
          const itemQty = safeNumber(item.quantity, 1);
          const itemRate = idx === 0 && newRateNum > 0 ? newRateNum : safeNumber(item.rate, newRateNum);
          return {
            id: item.sold_item_id,
            product_name: item.product_name,
            quantity: itemQty,
            rate: itemRate,
            amount: itemRate * itemQty,
          };
        });
      } else {
        const itemQty = safeNumber(finalBilling.quantity, 1);
        const itemRate = newRateNum > 0 ? newRateNum : safeNumber(finalBilling.rate);
        payload.items = [
          {
            id: (finalBilling as any).sold_item_id || (finalBilling as any).id || 1,
            product_name: finalBilling.product_name || finalBilling.model_number || 'Product',
            quantity: itemQty,
            rate: itemRate,
            amount: itemRate * itemQty,
          },
        ];
      }

      const updated: any = await updateInvoice(invNo, payload);

      setBillingDetailsState((prev: any) => {
        const merged = { ...prev, ...updated };

        // Safe Response State Update
        const resRate = updated?.rate ?? updated?.items?.[0]?.rate ?? (newRateNum > 0 ? newRateNum : prev?.rate);
        const resAmount = updated?.amount ?? updated?.items?.[0]?.amount ?? (newRateNum > 0 ? newRateNum * safeNumber(merged.quantity, 1) : prev?.amount);
        const resTotal = updated?.total_amount ?? updated?.grand_total ?? updated?.items?.[0]?.total_amount ?? (newRateNum > 0 ? newRateNum * safeNumber(merged.quantity, 1) : prev?.total_amount);

        merged.rate = String(safeNumber(resRate));
        merged.amount = String(safeNumber(resAmount));
        merged.total_amount = String(safeNumber(resTotal));

        if (updated?.items && updated.items.length > 0) {
          merged.items = updated.items.map((it: any) => ({
            ...it,
            rate: safeNumber(it.rate ?? resRate),
            amount: safeNumber(it.amount ?? resAmount),
            total_amount: safeNumber(it.total_amount ?? it.amount ?? resTotal),
          }));
        }

        return merged as BillingDetails;
      });

      setShowEditModal(false);
      toast.success('Invoice updated successfully!', 'Bill Updated');
    } catch (err: any) {
      console.error('Failed to update invoice:', err);
      toast.error(err.message || 'Failed to edit invoice details.');
    } finally {
      setIsUpdatingInvoice(false);
    }
  };

  const handleOpenServerPDF = async () => {
    const invNo = finalBilling.invoice_number;
    if (!invNo) {
      toast.warn('Invoice number not generated yet.');
      return;
    }
    const baseUrl = getApiBaseUrl();
    const pdfUrl = `${baseUrl}/api/checkout/invoices/${encodeURIComponent(invNo)}/pdf/`;
    console.log('Opening server PDF endpoint URL:', pdfUrl);
    try {
      const supported = await Linking.canOpenURL(pdfUrl);
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        await Linking.openURL(pdfUrl);
      }
    } catch (err: any) {
      console.error('Failed to open PDF URL in browser:', err);
      toast.error(err.message || 'Unable to open PDF preview.');
    }
  };

  const handleSavePDF = async () => {
    setIsSaving(true);
    try {
      const html = generateInvoiceHTML(finalBilling, profile, customer, effectiveSignature, product);
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
      const html = generateInvoiceHTML(finalBilling, profile, customer, effectiveSignature, product);
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleOpenEditModal}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          {isViewOnly ? (
            <View style={styles.headerIconBtn} />
          ) : (
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleDone}>
              <Ionicons name="checkmark" size={22} color={colors.success} />
            </TouchableOpacity>
          )}
        </View>
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
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={styles.shopName}>
                {profile?.shop_name || finalBilling.shop_name}
              </Text>
              <Text style={styles.invoiceDate}>{finalBilling.invoice_date}</Text>
            </View>
            <TouchableOpacity
              style={styles.editInvoiceInlineBtn}
              onPress={handleOpenEditModal}
            >
              <Ionicons name="pencil" size={13} color={colors.primary} />
              <Text style={styles.editInvoiceInlineBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Customer Info */}
          <View style={styles.invoiceSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.invoiceSectionLabel}>BILL TO</Text>
              <TouchableOpacity onPress={handleOpenEditModal}>
                <Ionicons name="create-outline" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.customerName}>{finalBilling.customer_name}</Text>
            {finalBilling.customer_address ? (
              <Text style={styles.customerDetail}>{finalBilling.customer_address}</Text>
            ) : null}
            {finalBilling.customer_contact ? (
              <Text style={styles.customerDetail}>📞 {finalBilling.customer_contact}</Text>
            ) : null}
            {finalBilling.customer_gst ? (
              <Text style={styles.customerDetail}>GST: {finalBilling.customer_gst}</Text>
            ) : null}
          </View>

          <View style={styles.cardDivider} />

          {/* Products */}
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionLabel}>
              {finalBilling.items && finalBilling.items.length > 1
                ? `PRODUCTS (${finalBilling.items.length})`
                : 'PRODUCT'}
            </Text>
            {finalBilling.items && finalBilling.items.length > 0 ? (
              finalBilling.items.map((it, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.productRow,
                    idx > 0 && {
                      marginTop: spacing.md,
                      paddingTop: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.borderLight,
                    },
                  ]}
                >
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>
                      {it.brand_name} {it.product_name}
                    </Text>
                    <Text style={styles.productSub}>Model: {it.model_number}</Text>
                    {it.imei_no_1 ? (
                      <Text style={styles.imeiText}>IMEI 1: {it.imei_no_1}</Text>
                    ) : null}
                    {it.imei_no_2 ? (
                      <Text style={styles.imeiText}>IMEI 2: {it.imei_no_2}</Text>
                    ) : null}
                    <Text style={styles.productSub}>
                      Rate: ₹{safeNumber(it.rate).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.productQty}>x{it.quantity}</Text>
                    <Text style={[styles.productName, { marginTop: 4, color: colors.primary }]}>
                      ₹{safeNumber(it.amount || it.total_amount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
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
                  <Text style={styles.productSub}>
                    Rate: ₹{pricing.rate.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.productQty}>x{finalBilling.quantity || 1}</Text>
                  <Text style={[styles.productName, { marginTop: 4, color: colors.primary }]}>
                    ₹{pricing.totalAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.cardDivider} />

          {/* Pricing */}
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionLabel}>PRICING</Text>
            <PriceRow label="Rate" value={`₹${pricing.rate.toLocaleString('en-IN')}`} />
            <PriceRow label="Base Amount" value={`₹${pricing.baseAmount.toLocaleString('en-IN')}`} />
            <PriceRow label={`GST (${pricing.gstPercent}%)`} value={`₹${pricing.gstAmount.toLocaleString('en-IN')}`} />
            {pricing.cgstAmount > 0 && (
              <PriceRow
                label={`CGST (${pricing.cgstPercent}%)`}
                value={`₹${pricing.cgstAmount.toLocaleString('en-IN')}`}
              />
            )}
            {pricing.sgstAmount > 0 && (
              <PriceRow
                label={`SGST (${pricing.sgstPercent}%)`}
                value={`₹${pricing.sgstAmount.toLocaleString('en-IN')}`}
              />
            )}
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              ₹{pricing.totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Amount in Words */}
          <View style={styles.wordsBoxOnScreen}>
            <Text style={styles.wordsLabelOnScreen}>Invoice Amount in Words</Text>
            <Text style={styles.wordsTextOnScreen}>{numberToWords(pricing.totalAmount)}</Text>
          </View>

          {pricing.gstPercent > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>GST Breakdown</Text>
              <PriceRow label="Base Amount" value={`₹${pricing.baseAmount.toLocaleString('en-IN')}`} />
              <PriceRow label={`GST (${pricing.gstPercent}%)`} value={`₹${pricing.gstAmount.toLocaleString('en-IN')}`} />
              {pricing.cgstAmount > 0 && (
                <PriceRow
                  label={`CGST (${pricing.cgstPercent}%)`}
                  value={`₹${pricing.cgstAmount.toLocaleString('en-IN')}`}
                />
              )}
              {pricing.sgstAmount > 0 && (
                <PriceRow
                  label={`SGST (${pricing.sgstPercent}%)`}
                  value={`₹${pricing.sgstAmount.toLocaleString('en-IN')}`}
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

          <View style={styles.cardDivider} />

          {/* Authorized Signatory */}
          <View style={styles.signatoryCardOnScreen}>
            <Text style={styles.signatoryCardLabel}>Authorized Signatory</Text>
            {effectiveSignature ? (
              <View style={styles.signatoryImgContainer}>
                <Image
                  source={{ uri: effectiveSignature }}
                  style={styles.onScreenSignatureImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.signatoryPlaceholder}>
                <Text style={styles.signatoryPlaceholderText}>No signature on file</Text>
              </View>
            )}
            <Text style={styles.signatoryShopText}>
              For {profile?.shop_name || finalBilling.shop_name}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.serverPdfBtn} onPress={handleOpenServerPDF}>
          <Ionicons name="print-outline" size={18} color={colors.primary} />
          <Text style={styles.serverPdfBtnText}>Print / PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editBillBtn} onPress={handleOpenEditModal}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.editBillBtnText}>Edit Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={isSharing}>
          {isSharing ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Ionicons name="share-outline" size={18} color={colors.textInverse} />
          )}
          <Text style={styles.shareBtnText}>{isSharing ? 'Sharing...' : 'Share'}</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Invoice Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Invoice Details</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.editModalContent}>
            <Text style={styles.editSectionTitle}>Customer Details</Text>
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Customer Name</Text>
              <TextInput
                style={styles.editInput}
                value={editCustomerName}
                onChangeText={setEditCustomerName}
                placeholder="Customer Name"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Customer Contact</Text>
              <TextInput
                style={styles.editInput}
                value={editCustomerContact}
                onChangeText={setEditCustomerContact}
                keyboardType="phone-pad"
                placeholder="Customer Contact"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Customer Address</Text>
              <TextInput
                style={styles.editInput}
                value={editCustomerAddress}
                onChangeText={setEditCustomerAddress}
                placeholder="Customer Address"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Customer GST Number</Text>
              <TextInput
                style={styles.editInput}
                value={editCustomerGst}
                onChangeText={setEditCustomerGst}
                placeholder="Customer GSTIN"
                autoCapitalize="characters"
              />
            </View>

            <Text style={[styles.editSectionTitle, { marginTop: spacing.md }]}>Invoice Meta</Text>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Invoice Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.editInput}
                value={editInvoiceDate}
                onChangeText={setEditInvoiceDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Payment Mode</Text>
              <View style={styles.paymentModeRow}>
                {['cash', 'card', 'upi', 'cheque', 'emi'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.paymentModeChip,
                      editPaymentMode.toLowerCase() === mode && styles.paymentModeChipActive,
                    ]}
                    onPress={() => setEditPaymentMode(mode)}
                  >
                    <Text
                      style={[
                        styles.paymentModeChipText,
                        editPaymentMode.toLowerCase() === mode && styles.paymentModeChipTextActive,
                      ]}
                    >
                      {mode.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Unit Selling Price (Rate)</Text>
              <TextInput
                style={styles.editInput}
                value={editRate}
                onChangeText={setEditRate}
                keyboardType="numeric"
                placeholder="Custom Rate / Unit Price"
              />
            </View>

            <Text style={[styles.editSectionTitle, { marginTop: spacing.md }]}>Business / Shop Info</Text>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Shop Name</Text>
              <TextInput
                style={styles.editInput}
                value={editShopName}
                onChangeText={setEditShopName}
                placeholder="Business Name"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Shop Address</Text>
              <TextInput
                style={styles.editInput}
                value={editShopAddress}
                onChangeText={setEditShopAddress}
                placeholder="Business Address"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>Shop Contact Phone</Text>
              <TextInput
                style={styles.editInput}
                value={editShopContact}
                onChangeText={setEditShopContact}
                keyboardType="phone-pad"
                placeholder="Business Phone"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.editLabel}>GSTIN</Text>
              <TextInput
                style={styles.editInput}
                value={editGstin}
                onChangeText={setEditGstin}
                placeholder="Retailer GSTIN"
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={styles.saveEditSubmitBtn}
              onPress={handleSaveInvoiceEdit}
              disabled={isUpdatingInvoice}
            >
              {isUpdatingInvoice ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.textInverse} />
              )}
              <Text style={styles.saveEditSubmitBtnText}>
                {isUpdatingInvoice ? 'Saving Changes...' : 'Update Invoice Details'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    flexDirection: 'row', gap: spacing.sm, padding: spacing.md,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: spacing.md, borderRadius: borderRadius.button,
    backgroundColor: colors.primaryLightest, borderWidth: 1.5, borderColor: colors.primary,
  },
  saveBtnText: { ...typography.captionMedium, color: colors.primary, fontWeight: '600' },
  serverPdfBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: spacing.md, borderRadius: borderRadius.button,
    backgroundColor: colors.primaryLightest, borderWidth: 1.5, borderColor: colors.primary,
  },
  serverPdfBtnText: { ...typography.captionMedium, color: colors.primary, fontWeight: '700' },
  editBillBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: spacing.md, borderRadius: borderRadius.button,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  editBillBtnText: { ...typography.captionMedium, color: colors.text, fontWeight: '600' },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: spacing.md, borderRadius: borderRadius.button, backgroundColor: colors.success,
  },
  shareBtnText: { ...typography.captionMedium, color: colors.textInverse, fontWeight: '600' },

  editInvoiceInlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryLightest, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.primary,
  },
  editInvoiceInlineBtnText: { ...typography.caption, color: colors.primary, fontWeight: '700', fontSize: 11 },

  // Edit Modal Styles
  editModalContainer: { flex: 1, backgroundColor: colors.background },
  editModalHeader: {
    height: 56, paddingHorizontal: spacing.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  editModalTitle: { ...typography.subtitle, color: colors.text, fontWeight: '700' },
  editModalContent: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  editSectionTitle: { ...typography.subtitle, color: colors.primary, fontWeight: '700', fontSize: 14, marginBottom: spacing.sm },
  editField: { marginBottom: spacing.md },
  editLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  editInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.body, color: colors.text,
  },
  paymentModeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  paymentModeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight,
  },
  paymentModeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentModeChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', fontSize: 11 },
  paymentModeChipTextActive: { color: colors.textInverse },
  saveEditSubmitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: borderRadius.button,
    marginTop: spacing.xl, ...shadows.md,
  },
  saveEditSubmitBtnText: { ...typography.bodyMedium, color: colors.textInverse, fontWeight: '700' },

  // Words Box
  wordsBoxOnScreen: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  wordsLabelOnScreen: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  wordsTextOnScreen: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },

  // Authorized Signatory
  signatoryCardOnScreen: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  signatoryCardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  signatoryImgContainer: {
    width: 160,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    marginBottom: spacing.xs,
  },
  onScreenSignatureImage: {
    width: '100%',
    height: '100%',
  },
  signatoryPlaceholder: {
    width: 140,
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  signatoryPlaceholderText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
  },
  signatoryShopText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
});
