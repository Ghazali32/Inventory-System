import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { SignatureModal } from '../../components/SignatureModal';
import { useAuthStore } from '../../store/auth.store';
import { authAPI, BusinessProfile } from '../../api/auth.api';
import { toast } from '../../store/toast.store';

interface BusinessProfileFormScreenProps {
  navigation: any;
  route: any;
}

export const BusinessProfileFormScreen: React.FC<BusinessProfileFormScreenProps> = ({
  navigation,
  route,
}) => {
  const isEditMode = route.params?.isEditMode || false;
  const profileState = useAuthStore((s) => s.profile);
  const signatureImage = useAuthStore((s) => s.signatureImage);
  const hasSignature = useAuthStore((s) => s.hasSignature);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const fetchSignature = useAuthStore((s) => s.fetchSignature);

  const [isLoading, setIsLoading] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Form State
  const [shopName, setShopName] = useState(profileState?.shop_name || '');
  const [ownerName, setOwnerName] = useState(profileState?.owner_name || '');
  const [shopAddress, setShopAddress] = useState(profileState?.shop_address || '');
  const [shopCity, setShopCity] = useState(profileState?.shop_city || '');
  const [shopState, setShopState] = useState(profileState?.shop_state || '');
  const [shopPincode, setShopPincode] = useState(profileState?.shop_pincode || '');
  const [shopPhone, setShopPhone] = useState(profileState?.shop_phone || '');

  // Optional Tax & KYC Fields
  const [gstNumber, setGstNumber] = useState(profileState?.gst_registration_number || '');
  const [panNumber, setPanNumber] = useState(profileState?.pan_number || '');
  const [shopLicense, setShopLicense] = useState(profileState?.shop_license_number || '');
  const [shopLicenseExpiry, setShopLicenseExpiry] = useState(profileState?.shop_license_expiry || '');
  const [aadharNumber, setAadharNumber] = useState(profileState?.aadhar_number || '');

  // Optional Bank Details
  const [bankAccountNumber, setBankAccountNumber] = useState(profileState?.bank_account_number || '');
  const [bankIfscCode, setBankIfscCode] = useState(profileState?.bank_ifsc_code || '');
  const [bankHolderName, setBankHolderName] = useState(profileState?.bank_holder_name || '');

  useEffect(() => {
    fetchSignature().catch(() => {});
  }, [fetchSignature]);

  useEffect(() => {
    if (profileState) {
      setShopName(profileState.shop_name || '');
      setOwnerName(profileState.owner_name || '');
      setShopAddress(profileState.shop_address || '');
      setShopCity(profileState.shop_city || '');
      setShopState(profileState.shop_state || '');
      setShopPincode(profileState.shop_pincode || '');
      setShopPhone(profileState.shop_phone || '');
      setGstNumber(profileState.gst_registration_number || '');
      setPanNumber(profileState.pan_number || '');
      setShopLicense(profileState.shop_license_number || '');
      setShopLicenseExpiry(profileState.shop_license_expiry || '');
      setAadharNumber(profileState.aadhar_number || '');
      setBankAccountNumber(profileState.bank_account_number || '');
      setBankIfscCode(profileState.bank_ifsc_code || '');
      setBankHolderName(profileState.bank_holder_name || '');
    }
  }, [profileState]);

  const handleSubmit = async () => {
    if (
      !shopName.trim() ||
      !ownerName.trim() ||
      !shopAddress.trim() ||
      !shopCity.trim() ||
      !shopState.trim() ||
      !shopPincode.trim() ||
      !shopPhone.trim()
    ) {
      toast.warn('Please fill all required business details.', 'Missing Fields');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Partial<BusinessProfile> = {
        shop_name: shopName.trim(),
        owner_name: ownerName.trim(),
        shop_address: shopAddress.trim(),
        shop_city: shopCity.trim(),
        shop_state: shopState.trim(),
        shop_pincode: shopPincode.trim(),
        shop_phone: shopPhone.trim(),
        gst_registration_number: gstNumber.trim() || '',
        pan_number: panNumber.trim() || '',
        shop_license_number: shopLicense.trim() || '',
        shop_license_expiry: shopLicenseExpiry.trim() || undefined,
        aadhar_number: aadharNumber.trim() || '',
        bank_account_number: bankAccountNumber.trim() || undefined,
        bank_ifsc_code: bankIfscCode.trim() || undefined,
        bank_holder_name: bankHolderName.trim() || undefined,
        signature_image_base64: signatureImage || undefined,
      };

      if (profileState && profileState.shop_name) {
        await authAPI.updateProfile(payload);
      } else {
        await authAPI.createProfile(payload);
      }

      await fetchProfile();

      toast.success('Business profile saved successfully!');
      if (isEditMode) {
        navigation.goBack();
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    } catch (error: any) {
      console.log('Profile Submit Error:', error);
      toast.error(error.message || 'Failed to save business profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        {isEditMode ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.headerTitle}>Business Profile</Text>
        <View style={{ width: 40 }} />
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
          {!isEditMode && (
            <Text style={styles.welcomeText}>
              Please complete your business profile before continuing.
            </Text>
          )}

          {/* Section 1: Required Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Required Details</Text>
            <Input
              label="Shop Name *"
              placeholder="e.g. My Electronics Store"
              leftIcon="business-outline"
              value={shopName}
              onChangeText={setShopName}
            />
            <Input
              label="Owner Name *"
              placeholder="e.g. John Doe"
              leftIcon="person-outline"
              value={ownerName}
              onChangeText={setOwnerName}
            />
            <Input
              label="Shop Phone *"
              placeholder="e.g. 9876543210"
              leftIcon="call-outline"
              value={shopPhone}
              onChangeText={setShopPhone}
              keyboardType="phone-pad"
            />
            <Input
              label="Shop Address *"
              placeholder="e.g. 123 Main St"
              leftIcon="location-outline"
              value={shopAddress}
              onChangeText={setShopAddress}
              multiline
            />
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="City *"
                  placeholder="e.g. Mumbai"
                  value={shopCity}
                  onChangeText={setShopCity}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="State *"
                  placeholder="e.g. MH"
                  value={shopState}
                  onChangeText={setShopState}
                />
              </View>
            </View>
            <Input
              label="Pincode *"
              placeholder="e.g. 400001"
              value={shopPincode}
              onChangeText={setShopPincode}
              keyboardType="number-pad"
            />
          </View>

          {/* Section 2: Digital Signature */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Retailer Digital Signature</Text>
              <View style={[styles.statusBadge, hasSignature ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, hasSignature ? styles.statusTextActive : styles.statusTextInactive]}>
                  {hasSignature ? 'Uploaded' : 'Not Uploaded'}
                </Text>
              </View>
            </View>
            <Text style={styles.signatureHelperText}>
              Your signature appears on generated customer invoices in the "Authorized Signatory" section.
            </Text>

            {hasSignature && signatureImage ? (
              <View style={styles.signaturePreviewCard}>
                <Image
                  source={{ uri: signatureImage }}
                  style={styles.signaturePreviewImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.signatureActionBtn}
                  onPress={() => setShowSignatureModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={styles.signatureActionBtnText}>Change Signature</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadSignaturePlaceholder}
                onPress={() => setShowSignatureModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil-outline" size={28} color={colors.primary} />
                <Text style={styles.uploadPlaceholderTitle}>Add Digital Signature</Text>
                <Text style={styles.uploadPlaceholderSubtitle}>Take a photo or upload from gallery</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Section 3: Tax & KYC */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tax & KYC (Optional)</Text>
            <Input
              label="GST Registration Number"
              placeholder="e.g. 22AAAAA0000A1Z5"
              leftIcon="document-text-outline"
              value={gstNumber}
              onChangeText={setGstNumber}
              autoCapitalize="characters"
            />
            <Input
              label="PAN Number"
              placeholder="e.g. ABCDE1234F"
              leftIcon="card-outline"
              value={panNumber}
              onChangeText={setPanNumber}
              autoCapitalize="characters"
            />
            <Input
              label="Shop License Number"
              placeholder="Enter license number"
              leftIcon="document-outline"
              value={shopLicense}
              onChangeText={setShopLicense}
            />
            <Input
              label="Shop License Expiry"
              placeholder="YYYY-MM-DD"
              leftIcon="calendar-outline"
              value={shopLicenseExpiry}
              onChangeText={setShopLicenseExpiry}
            />
            <Input
              label="Aadhar Number"
              placeholder="e.g. 1234 5678 9012"
              leftIcon="finger-print-outline"
              value={aadharNumber}
              onChangeText={setAadharNumber}
              keyboardType="number-pad"
            />
          </View>

          {/* Section 4: Bank Account Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Account Details (Optional)</Text>
            <Input
              label="Account Holder Name"
              placeholder="e.g. John Doe"
              leftIcon="person-circle-outline"
              value={bankHolderName}
              onChangeText={setBankHolderName}
            />
            <Input
              label="Bank Account Number"
              placeholder="Enter account number"
              leftIcon="wallet-outline"
              value={bankAccountNumber}
              onChangeText={setBankAccountNumber}
              keyboardType="number-pad"
            />
            <Input
              label="Bank IFSC Code"
              placeholder="e.g. HDFC0001234"
              leftIcon="business-outline"
              value={bankIfscCode}
              onChangeText={setBankIfscCode}
              autoCapitalize="characters"
            />
          </View>

          <Button
            title="Save Profile"
            onPress={handleSubmit}
            loading={isLoading}
            size="lg"
            variant="primary"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Signature Management Modal */}
      <SignatureModal
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  welcomeText: {
    ...typography.body,
    color: colors.primary,
    marginBottom: spacing.xl,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusBadgeActive: {
    backgroundColor: colors.successLight,
  },
  statusBadgeInactive: {
    backgroundColor: colors.surfaceAlt,
  },
  statusBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textTertiary,
  },
  signatureHelperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  signaturePreviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  signaturePreviewImage: {
    width: '100%',
    height: 90,
    backgroundColor: '#FAFDF9',
    borderRadius: borderRadius.sm,
  },
  signatureActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  signatureActionBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  uploadSignaturePlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadPlaceholderTitle: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  uploadPlaceholderSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});
