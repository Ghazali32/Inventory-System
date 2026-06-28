import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useProductStore } from '../../store/product.store';
import { Product } from '../../api/product.api';
import { toast } from '../../store/toast.store';

const resolveGSTFields = (product: Product, rateVal: number) => {
  const gstPercent = product.gst != null ? Number(product.gst) : 
    (product.category?.toLowerCase().includes('electro') ||
     product.category?.toLowerCase().includes('phone') ||
     product.category?.toLowerCase().includes('mobile') ||
     product.category?.toLowerCase().includes('laptop') ||
     product.category?.toLowerCase().includes('tablet') ||
     product.category?.toLowerCase().includes('smart') ||
     product.category?.toLowerCase().includes('access')) ? 18 : 0;
  
  if (gstPercent > 0) {
    const baseAmount = rateVal / (1 + gstPercent / 100);
    const gstAmount = rateVal - baseAmount;
    return {
      gst_percent: String(gstPercent),
      gst_amount: gstAmount.toFixed(2),
      base_amount: baseAmount.toFixed(2),
      cgst_percent: String(gstPercent / 2),
      cgst_amount: (gstAmount / 2).toFixed(2),
      sgst_percent: String(gstPercent / 2),
      sgst_amount: (gstAmount / 2).toFixed(2),
    };
  }
  
  return {
    gst_percent: '0',
    gst_amount: '0',
    base_amount: String(rateVal),
    cgst_percent: '0',
    cgst_amount: '0',
    sgst_percent: '0',
    sgst_amount: '0',
  };
};

interface CustomerFormScreenProps {
  navigation: any;
  route: any;
}

export const CustomerFormScreen: React.FC<CustomerFormScreenProps> = ({
  navigation,
  route,
}) => {
  const product = route.params?.product as Product;
  const { checkoutPreview, checkoutComplete, isLoading } = useProductStore();

  // Customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Existing customer lookup
  const [customerId, setCustomerId] = useState('');
  const [showLookup, setShowLookup] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Prefill customer details when passed via navigation route parameters
  const prefilledCustomer = route.params?.prefilledCustomer;
  useEffect(() => {
    if (prefilledCustomer) {
      console.log('Prefilling customer form with:', prefilledCustomer);
      setName(prefilledCustomer.name || '');
      setPhone(prefilledCustomer.phone_number || '');
      setEmail(prefilledCustomer.email || '');
      setAddress(prefilledCustomer.address || '');
      setCity(prefilledCustomer.city || '');
      setState(prefilledCustomer.state || '');
      setPincode(prefilledCustomer.pincode || '');
      if (prefilledCustomer.customer_id) {
        setCustomerId(prefilledCustomer.customer_id);
      }
    }
  }, [prefilledCustomer]);

  const handleLookupCustomer = async () => {
    if (!customerId.trim()) {
      toast.warn('Please enter a customer ID.', 'Missing ID');
      return;
    }

    setIsLookingUp(true);
    try {
      // Call checkout preview with the customer_id to see if it resolves
      const result = await checkoutPreview({
        inventory_id: product.id,
        customer_id: customerId.trim(),
      });

      if (result.customer) {
        setName(result.customer.name || '');
        setPhone(result.customer.phone_number || '');
        setEmail(result.customer.email || '');
        setAddress(result.customer.address || '');
        setCity(result.customer.city || '');
        setState(result.customer.state || '');
        setPincode(result.customer.pincode || '');
        setShowLookup(false);
        toast.success(`Loaded details for ${result.customer.name}`, 'Customer Found');
      }
    } catch (error: any) {
      toast.error(error.message || 'Customer not found.', 'Not Found');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleProceed = async () => {
    if (!name.trim()) {
      toast.warn('Customer name is required.', 'Required Field');
      return;
    }

    try {
      const previewResult = await checkoutPreview({
        inventory_id: product.id,
      });

      // Step 2: Finalize the sale via checkout/complete
      const completeResult = await checkoutComplete({
        inventory_id: product.id,
        customer_id: customerId.trim() || undefined,
        customer_name: name.trim(),
        customer_phone: phone.trim() || undefined,
        customer_email: email.trim() || undefined,
        customer_address: address.trim() || undefined,
        customer_city: city.trim() || undefined,
        customer_state: state.trim() || undefined,
        customer_pincode: pincode.trim() || undefined,
        payment_mode: 'cash',
      });

      if (!completeResult.sale_completed) {
        toast.error(completeResult.message || 'Sale could not be completed.');
        return;
      }

      const rateVal = Number(previewResult.billing_details?.rate || product.mrp || product.msp || 0);
      const computedGst = resolveGSTFields(product, rateVal);

      // Step 3: Build billing details with real invoice number
      if (previewResult.billing_details) {
        const billingDetails = {
          ...previewResult.billing_details,
          invoice_number: completeResult.invoice_number,
          customer_name: name.trim(),
          customer_address: [address, city, state, pincode].filter(Boolean).join(', '),
          customer_contact: phone.trim(),
          base_amount: previewResult.billing_details.base_amount && Number(previewResult.billing_details.gst_amount) > 0
            ? previewResult.billing_details.base_amount 
            : computedGst.base_amount,
          gst_percent: previewResult.billing_details.gst_percent && Number(previewResult.billing_details.gst_amount) > 0
            ? previewResult.billing_details.gst_percent 
            : computedGst.gst_percent,
          gst_amount: previewResult.billing_details.gst_amount && Number(previewResult.billing_details.gst_amount) > 0
            ? previewResult.billing_details.gst_amount 
            : computedGst.gst_amount,
          cgst_percent: previewResult.billing_details.cgst_percent && Number(previewResult.billing_details.cgst_amount) > 0
            ? previewResult.billing_details.cgst_percent 
            : computedGst.cgst_percent,
          cgst_amount: previewResult.billing_details.cgst_amount && Number(previewResult.billing_details.cgst_amount) > 0
            ? previewResult.billing_details.cgst_amount 
            : computedGst.cgst_amount,
          sgst_percent: previewResult.billing_details.sgst_percent && Number(previewResult.billing_details.sgst_amount) > 0
            ? previewResult.billing_details.sgst_percent 
            : computedGst.sgst_percent,
          sgst_amount: previewResult.billing_details.sgst_amount && Number(previewResult.billing_details.sgst_amount) > 0
            ? previewResult.billing_details.sgst_amount 
            : computedGst.sgst_amount,
        };

        navigation.navigate('Invoice', {
          product,
          billingDetails,
          customer: completeResult.customer || {
            name: name.trim(),
            phone_number: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
          },
          invoiceNumber: completeResult.invoice_number,
        });
      } else {
        // Fallback: navigate with minimal billing details from what we know
        navigation.navigate('Invoice', {
          product,
          billingDetails: {
            shop_name: '',
            invoice_number: completeResult.invoice_number,
            invoice_date: new Date().toISOString(),
            customer_name: name.trim(),
            customer_address: [address, city, state, pincode].filter(Boolean).join(', '),
            customer_contact: phone.trim(),
            customer_gst: '',
            state_code: '',
            product_name: product.model,
            brand_name: product.brand,
            model_number: product.model,
            imei_no_1: product.imei1 || '',
            imei_no_2: product.imei2 || '',
            serial_number: '',
            hsn_sac: '',
            quantity: 1,
            rate: String(rateVal),
            amount: String(rateVal),
            total_amount: String(rateVal),
            payment_mode: 'cash',
            cheque_number: '',
            ...computedGst,
          },
          customer: completeResult.customer,
          invoiceNumber: completeResult.invoice_number,
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete the sale.', 'Checkout Failed');
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
        <Text style={styles.headerTitle}>Customer Details</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Summary */}
          <View style={styles.productSummary}>
            <View style={styles.productSummaryIcon}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.productSummaryInfo}>
              <Text style={styles.productSummaryBrand}>{product.brand} {product.model}</Text>
              <Text style={styles.productSummarySub}>
                {product.category} • {product.product_barcode}
              </Text>
            </View>
            <Text style={styles.productSummaryPrice}>
              ₹{Number(product.mrp || product.msp || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Lookup Existing Customer */}
          <TouchableOpacity
            style={styles.lookupToggle}
            onPress={() => setShowLookup(!showLookup)}
          >
            <View style={styles.lookupToggleLeft}>
              <Ionicons name="search-outline" size={18} color={colors.primary} />
              <Text style={styles.lookupToggleText}>
                {showLookup ? 'Hide Lookup' : 'Lookup Existing Customer'}
              </Text>
            </View>
            <Ionicons
              name={showLookup ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>

          {showLookup && (
            <View style={styles.lookupPanel}>
              <Input
                label="Customer ID"
                placeholder="Enter existing customer UUID"
                leftIcon="person-circle-outline"
                value={customerId}
                onChangeText={setCustomerId}
              />
              <Button
                title={isLookingUp ? 'Searching...' : 'Find Customer'}
                onPress={handleLookupCustomer}
                loading={isLookingUp}
                variant="outline"
                size="md"
              />
            </View>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New Customer</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Customer Form */}
          <View style={styles.section}>
            <Input
              label="Customer Name *"
              placeholder="Full name"
              leftIcon="person-outline"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Phone Number"
              placeholder="10-digit phone number"
              leftIcon="call-outline"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <Input
              label="Email"
              placeholder="email@example.com"
              leftIcon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <Input
              label="Street Address"
              placeholder="House no., street, area"
              leftIcon="location-outline"
              value={address}
              onChangeText={setAddress}
            />
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="City"
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="State"
                  placeholder="State"
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>
            <Input
              label="Pincode"
              placeholder="6-digit pincode"
              leftIcon="navigate-outline"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          {/* Submit */}
          <Button
            title="Generate Invoice"
            onPress={handleProceed}
            loading={isLoading}
            size="lg"
            variant="secondary"
            icon={<Ionicons name="receipt-outline" size={20} color={colors.textInverse} />}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    height: 56, paddingHorizontal: spacing.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerIconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.subtitle, color: colors.text },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing['4xl'] },

  // Product Summary
  productSummary: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm, marginBottom: spacing.lg,
  },
  productSummaryIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLightest,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  productSummaryInfo: { flex: 1 },
  productSummaryBrand: { ...typography.bodyMedium, color: colors.text },
  productSummarySub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  productSummaryPrice: { ...typography.subtitle, color: colors.primary },

  // Lookup
  lookupToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryLightest, padding: spacing.lg,
    borderRadius: borderRadius.lg, marginBottom: spacing.lg,
  },
  lookupToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lookupToggleText: { ...typography.bodyMedium, color: colors.primary },
  lookupPanel: {
    backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.lg, ...shadows.sm,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, gap: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.caption, color: colors.textSecondary },

  // Form
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  halfInput: { flex: 1 },
  submitBtn: { marginTop: spacing.md },
});
