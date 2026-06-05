import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, shadows } from '../../theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuthStore } from '../../store/auth.store';
import { authAPI, BusinessProfile } from '../../api/auth.api';

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
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [shopName, setShopName] = useState(profileState?.shop_name || '');
  const [ownerName, setOwnerName] = useState(profileState?.owner_name || '');
  const [shopAddress, setShopAddress] = useState(profileState?.shop_address || '');
  const [shopCity, setShopCity] = useState(profileState?.shop_city || '');
  const [shopState, setShopState] = useState(profileState?.shop_state || '');
  const [shopPincode, setShopPincode] = useState(profileState?.shop_pincode || '');
  const [shopPhone, setShopPhone] = useState(profileState?.shop_phone || '');

  // Optional Fields
  const [gstNumber, setGstNumber] = useState(profileState?.gst_registration_number || '');
  const [panNumber, setPanNumber] = useState(profileState?.pan_number || '');
  const [shopLicense, setShopLicense] = useState(profileState?.shop_license_number || '');
  const [aadharNumber, setAadharNumber] = useState(profileState?.aadhar_number || '');

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
      setAadharNumber(profileState.aadhar_number || '');
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
      Alert.alert('Missing Fields', 'Please fill all required business details.');
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
        aadhar_number: aadharNumber.trim() || '',
      };

      if (profileState && profileState.shop_name) {
        await authAPI.updateProfile(payload);
      } else {
        await authAPI.createProfile(payload);
      }

      await fetchProfile();

      Alert.alert(
        'Success',
        'Business profile saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (isEditMode) {
                navigation.goBack();
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.log('Profile Submit Error:', error);
      Alert.alert('Error', error.message || 'Failed to save business profile.');
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
              label="Aadhar Number"
              placeholder="e.g. 1234 5678 9012"
              leftIcon="finger-print-outline"
              value={aadharNumber}
              onChangeText={setAadharNumber}
              keyboardType="number-pad"
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
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.lg,
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
