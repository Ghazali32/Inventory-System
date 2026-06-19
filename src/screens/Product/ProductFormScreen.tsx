import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useProductStore } from '../../store/product.store';
import { speechService } from '../../utils/speechRecognition';
import { toast } from '../../store/toast.store';

interface ProductFormScreenProps {
  navigation: any;
  route: any;
}

export const ProductFormScreen: React.FC<ProductFormScreenProps> = ({
  navigation,
  route,
}) => {
  const mode = route.params?.mode || 'create';
  const existingProduct = route.params?.product;
  const scanBarcode = route.params?.barcode || '';
  const scanImei1 = route.params?.imei1 || '';
  const scanImei2 = route.params?.imei2 || '';
  const prefillData = route.params?.prefill;
  const suggestions = route.params?.suggestions;
  const hasInitializedRef = useRef(false);

  const { createProduct, updateProduct, voiceDraft, isLoading } = useProductStore();

  // Form state
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [color, setColor] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [msp, setMsp] = useState('');
  const [mrp, setMrp] = useState('');
  const [gst, setGst] = useState('');
  const [description, setDescription] = useState('');

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [confirmationTranscript, setConfirmationTranscript] = useState('');

  // Pre-fill form
  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    console.log('\n========== PRODUCT FORM PRE-FILL ==========');
    console.log('Mode:', mode);
    console.log('Scan Barcode:', scanBarcode);
    console.log('Scan IMEI1:', scanImei1);
    console.log('Scan IMEI2:', scanImei2);
    console.log('Prefill Data:', JSON.stringify(prefillData, null, 2));

    if (existingProduct) {
      console.log('✏️ Loading existing product');
      setBrand(existingProduct.brand || '');
      setModel(existingProduct.model || '');
      setCategory(existingProduct.category || '');
      setBarcode(existingProduct.product_barcode || '');

      // Handle IMEI fields - check both old and new names
      const imei1Value = existingProduct.imei1 || existingProduct.imei_primary || '';
      const imei2Value = existingProduct.imei2 || existingProduct.imei_secondary || '';
      setImei1(imei1Value);
      setImei2(imei2Value);

      // Extract price and description from specs
      if (existingProduct.specs) {
        if (existingProduct.specs.price) setMrp(String(existingProduct.specs.price));
        if (existingProduct.specs.description) setDescription(existingProduct.specs.description);
      }

      // Set pricing fields if available
      if (existingProduct.buying_price) setBuyingPrice(String(existingProduct.buying_price));
      if (existingProduct.msp) setMsp(String(existingProduct.msp));
      if (existingProduct.mrp) setMrp(String(existingProduct.mrp));
      if (existingProduct.gst) setGst(String(existingProduct.gst));
      if (existingProduct.color) setColor(existingProduct.color);
    } else {
      console.log('📝 Creating new product with scanned data');
      setBarcode(scanBarcode);

      // Use scanned IMEI if available, otherwise use prefill IMEI
      const imei1ToUse = scanImei1 || (prefillData?.imei1 ? String(prefillData.imei1) : '');
      const imei2ToUse = scanImei2 || (prefillData?.imei2 ? String(prefillData.imei2) : '');

      console.log('IMEI1 source:', scanImei1 ? 'scanned' : prefillData?.imei1 ? 'prefill' : 'none');
      console.log('IMEI2 source:', scanImei2 ? 'scanned' : prefillData?.imei2 ? 'prefill' : 'none');

      setImei1(imei1ToUse);
      setImei2(imei2ToUse);
    }
    hasInitializedRef.current = true;
  }, [existingProduct, scanBarcode, scanImei1, scanImei2, prefillData, suggestions, mode]);

  // Voice recording
  const startRecording = async () => {
    try {
      const granted = await speechService.initialize();
      if (!granted) {
        toast.warn('Speech recognition is not available on this device.', 'Not Available');
        return;
      }

      setIsRecording(true);

      // Start listening with real-time updates
      await speechService.startListening(
        (result) => {
          // Can use real-time transcript if needed
          console.log('Interim transcript:', result.transcript);
        },
        'en-US'
      );
    } catch (error: any) {
      setIsRecording(false);
      toast.error('Failed to start speech recognition.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsProcessingVoice(true);

    try {
      // Stop and get final transcript
      const transcript = await speechService.stopListening();

      if (!transcript.trim()) {
        toast.warn('Please try speaking again.', 'No Speech Detected');
        setIsProcessingVoice(false);
        return;
      }

      // Show confirmation modal with the transcribed text
      setConfirmationTranscript(transcript);
      setIsConfirmationVisible(true);
      setIsProcessingVoice(false);
    } catch (error: any) {
      setIsProcessingVoice(false);
      toast.error(error.message || 'Failed to process speech.');
    }
  };

  const handleConfirmTranscription = async () => {
    setIsConfirmationVisible(false);
    if (!confirmationTranscript.trim()) return;

    setIsProcessingVoice(true);
    try {
      console.log('--- VOICE DRAFT REQUEST ---');
      console.log('Payload:', JSON.stringify({
        text: confirmationTranscript.trim(),
        product_barcode: barcode,
        imei_primary: imei1,
        imei_secondary: imei2
      }, null, 2));

      const result = await voiceDraft(confirmationTranscript.trim(), barcode, imei1, imei2);

      console.log('--- VOICE DRAFT RESPONSE ---');
      console.log('Response:', JSON.stringify(result, null, 2));

      if (result.prefill) {
        if (result.prefill.brand) setBrand(result.prefill.brand);
        if (result.prefill.model) setModel(result.prefill.model);
        if (result.prefill.color) setColor(result.prefill.color);
        if (result.prefill.category) setCategory(result.prefill.category);
        if (result.prefill.buying_price) setBuyingPrice(String(result.prefill.buying_price));
        if (result.prefill.msp) setMsp(String(result.prefill.msp));
        if (result.prefill.mrp) setMrp(String(result.prefill.mrp));

        let newDescChunks: string[] = [];
        if (result.prefill.description) {
          newDescChunks.push(result.prefill.description);
        }
        if (result.prefill.specs && Object.keys(result.prefill.specs).length > 0) {
          const specsStr = Object.entries(result.prefill.specs)
            .filter(([k]) => k !== 'voice_raw')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          if (specsStr) {
            newDescChunks.push(specsStr);
          }
        }

        if (newDescChunks.length > 0) {
          const combinedDesc = newDescChunks.join('\n');
          setDescription((prev) => prev ? `${prev}\n${combinedDesc}` : combinedDesc);
        }
      }
      toast.success('Form fields updated from voice input!');
    } catch (error: any) {
      console.log('--- VOICE DRAFT ERROR ---');
      console.log(error);
      toast.error(error.message || 'Voice draft failed.');
    } finally {
      setIsProcessingVoice(false);
      setConfirmationTranscript('');
    }
  };

  const handleReRecord = () => {
    setIsConfirmationVisible(false);
    setConfirmationTranscript('');
    // Restart recording immediately
    startRecording();
  };

  const handleSubmit = async () => {
    // Validation
    if (!brand.trim() || !model.trim() || !category.trim()) {
      toast.warn('Brand, model, and category are required.', 'Missing Fields');
      return;
    }

    if (!barcode.trim()) {
      toast.warn('Barcode is required.', 'Missing Barcode');
      return;
    }

    try {
      const resolvedSku =
        existingProduct?.sku ||
        existingProduct?.product_id ||
        `SKU-${barcode.trim()}-${Date.now().toString().slice(-4)}`;

      const payload: any = {
        product_barcode: barcode.trim(),
        sku: resolvedSku,
        category: category.trim(),
        brand: brand.trim(),
        model: model.trim(),
        barcode_type: 'INTERNAL',
      };

      // Optional IMEI fields
      if (imei1.trim()) payload.imei1 = imei1.trim();
      if (imei2.trim()) payload.imei2 = imei2.trim();

      // Optional color field
      if (color.trim()) payload.color = color.trim();

      // Optional pricing fields
      if (buyingPrice.trim()) payload.buying_price = parseFloat(buyingPrice);

      if (msp.trim()) payload.msp = parseFloat(msp);

      if (mrp.trim()) payload.mrp = parseFloat(mrp);

      if (gst.trim()) payload.gst = parseFloat(gst);

      // Build specs object
      const specs: Record<string, string | number> = {};
      if (description.trim()) specs.description = description.trim();
      if (Object.keys(specs).length > 0) payload.specs = specs;

      console.log('📝 [FORM] Submitting payload:', JSON.stringify(payload, null, 2));

      if (mode === 'edit' && existingProduct?.id) {
        await updateProduct(existingProduct.id, payload);
      } else {
        await createProduct(payload);
      }

      toast.success(mode === 'edit' ? 'Product updated successfully!' : 'Product created successfully!');
      navigation.goBack();
    } catch (error: any) {
      toast.error(error.message || (mode === 'edit' ? 'Failed to update product.' : 'Failed to create product.'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'edit' ? 'Edit Product' : 'New Product'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.voiceBtn}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessingVoice}
          >
            {isProcessingVoice ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic-outline'}
                size={24}
                color={isRecording ? colors.danger : colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice recording indicator */}
      {isRecording && (
        <View style={styles.recordingBanner}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording... Tap mic to stop</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Barcode section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identification</Text>
            <Input
              label="Barcode"
              placeholder="Scanned barcode number"
              leftIcon="barcode-outline"
              value={barcode}
              onChangeText={setBarcode}
              editable={!scanBarcode}
            />
            <Input
              label="IMEI 1 (Optional)"
              placeholder="15-digit IMEI number"
              leftIcon="hardware-chip-outline"
              value={imei1}
              onChangeText={setImei1}
              keyboardType="number-pad"
              maxLength={15}
            />
            <Input
              label="IMEI 2 (Optional)"
              placeholder="15-digit IMEI number"
              leftIcon="hardware-chip-outline"
              value={imei2}
              onChangeText={setImei2}
              keyboardType="number-pad"
              maxLength={15}
            />
          </View>

          {/* Product details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            <Input
              label="Brand"
              placeholder="e.g. Samsung, Apple"
              leftIcon="business-outline"
              value={brand}
              onChangeText={setBrand}
            />
            <Input
              label="Model"
              placeholder="e.g. Galaxy S24, iPhone 15"
              leftIcon="phone-portrait-outline"
              value={model}
              onChangeText={setModel}
            />
            <Input
              label="Category"
              placeholder="e.g. Smartphone, Laptop"
              leftIcon="grid-outline"
              value={category}
              onChangeText={setCategory}
            />
            <Input
              label="Color (Optional)"
              placeholder="e.g. Black, Silver"
              leftIcon="color-palette-outline"
              value={color}
              onChangeText={setColor}
            />
            <Input
              label="Description (Optional)"
              placeholder="Product description"
              leftIcon="document-text-outline"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Buying Price (Optional)"
                  placeholder="0.00"
                  leftIcon="cash-outline"
                  value={buyingPrice}
                  onChangeText={setBuyingPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="MSP (Optional)"
                  placeholder="0.00"
                  leftIcon="pricetag-outline"
                  value={msp}
                  onChangeText={setMsp}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="MRP (Optional)"
                  placeholder="0.00"
                  leftIcon="pricetag-outline"
                  value={mrp}
                  onChangeText={setMrp}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="GST % (Optional)"
                  placeholder="0.00"
                  leftIcon="information-circle-outline"
                  value={gst}
                  onChangeText={setGst}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Submit */}
          <Button
            title={mode === 'edit' ? 'Update Product' : 'Create Product'}
            onPress={handleSubmit}
            loading={isLoading}
            size="lg"
            variant="secondary"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Voice Confirmation Modal */}
      <Modal
        visible={isConfirmationVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
              <Text style={styles.modalTitle}>Voice Captured</Text>
            </View>

            <Text style={styles.modalSubtitle}>Is this correct?</Text>

            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>{confirmationTranscript}</Text>
            </View>

            <Text style={styles.confirmationHint}>
              If correct, we'll send this to process. Otherwise, re-record to try again.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.reRecordBtn}
                onPress={handleReRecord}
                disabled={isProcessingVoice}
              >
                <Ionicons name="refresh" size={20} color={colors.primary} />
                <Text style={styles.reRecordText}>Re-record</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, isProcessingVoice && styles.confirmBtnDisabled]}
                onPress={handleConfirmTranscription}
                disabled={isProcessingVoice}
              >
                {isProcessingVoice ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={colors.textInverse} />
                    <Text style={styles.confirmText}>Correct</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Header
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
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLightest,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recording
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  recordingText: {
    ...typography.captionMedium,
    color: colors.danger,
  },

  // Content
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing['4xl'],
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  transcriptBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  transcriptText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  confirmationHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  reRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLightest,
  },
  reRecordText: {
    ...typography.button,
    color: colors.primary,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.button,
    backgroundColor: colors.success,
  },
  confirmBtnDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  confirmText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
