import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Vibration,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useProductStore } from '../../store/product.store';

interface ScanScreenProps {
  navigation: any;
  route?: any;
}

const IMEI_REGEX = /\b\d{15}\b/;

export const ScanScreen: React.FC<ScanScreenProps> = ({ navigation, route }) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [scannedImei1, setScannedImei1] = useState<string | null>(null);
  const [scannedImei2, setScannedImei2] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const cooldownRef = useRef(false);

  const { ingestScan } = useProductStore();

  // ─── Clear scanner state when screen comes into focus ──────────────────
  useFocusEffect(
    React.useCallback(() => {
      console.log('\n🔵 [SCAN SCREEN] Screen focused - clearing previous scan data');
      setScannedBarcode(null);
      setScannedImei1(null);
      setScannedImei2(null);
      lastScannedRef.current = null;
      cooldownRef.current = false;
      setIsProcessing(false);
      
      return () => {
        // Cleanup on blur if needed
      };
    }, [])
  );

  // ─── Scan handler ───────────────────────────────────────────────────────
  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    // Prevent double-scanning same value
    if (cooldownRef.current || !data || data === lastScannedRef.current) return;

    cooldownRef.current = true;
    lastScannedRef.current = data;
    Vibration.vibrate(100);

    console.log('--- BARCODE/IMEI SCANNED ---');
    console.log('Type:', type);
    console.log('Data:', data);

    // Try to extract IMEI (15 digits)
    const imeiMatch = data.match(IMEI_REGEX);
    const imei = imeiMatch ? imeiMatch[0] : null;

    console.log('🔍 [SCAN] IMEI Detection:');
    console.log('  Raw Data:', data);
    console.log('  Data Length:', data.length);
    console.log('  IMEI Match:', imeiMatch);
    console.log('  Extracted IMEI:', imei);

    // If it looks like IMEI, store it
    if (imei) {
      console.log('✅ IMEI detected:', imei);
      console.log('   Current IMEI1:', scannedImei1);
      console.log('   Current IMEI2:', scannedImei2);
      // Prefer to store IMEI1 first, then IMEI2
      if (!scannedImei1) {
        console.log('   → Storing as IMEI1');
        setScannedImei1(imei);
      } else if (!scannedImei2 && imei !== scannedImei1) {
        console.log('   → Storing as IMEI2 (different from IMEI1)');
        setScannedImei2(imei);
      } else {
        console.log('   → Already have both IMEIs or duplicate');
      }
    } else {
      if (!scannedBarcode) {
        console.log('✅ Barcode detected (no IMEI found in data):', data);
        setScannedBarcode(data);
      } else {
        console.log('♻️ Duplicate non-IMEI scan ignored after barcode was already captured:', data);
      }
    }

    // Release cooldown after 600ms to allow next scan
    setTimeout(() => {
      cooldownRef.current = false;
      lastScannedRef.current = null;
    }, 600);
  };

  // ─── Process scanned data ────────────────────────────────────────────────
  const handleProceed = async () => {
    if (!scannedBarcode) {
      Alert.alert('Missing Data', 'Please scan a barcode first.');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('\n========== SCAN INGEST REQUEST ==========');
      console.log('Barcode:', scannedBarcode);
      console.log('IMEI1:', scannedImei1);
      console.log('IMEI2:', scannedImei2);
      console.log('Calling ingestScan() with:', {
        productBarcode: scannedBarcode,
        imeiPrimary: scannedImei1,
        imeiSecondary: scannedImei2,
      });
      console.log('Note: IMEI values will be passed as imei1/imei2 to API');

      const result = await ingestScan(
        scannedBarcode,
        scannedImei1 || undefined,
        scannedImei2 || undefined
      );

      console.log('\n========== SCAN INGEST RESPONSE ==========');
      console.log('Response received:', JSON.stringify(result, null, 2));

      if (result.product_found && (result.action === 'quantity_increased' || result.action === 'created')) {
        // Product found in inventory
        const brandName = result.product?.brand || 'Product';
        const successMessage = result.action === 'created'
          ? `${brandName} created and added successfully.`
          : `${brandName} added to cart.`;
        Alert.alert(
          '✅ Product Found',
          successMessage,
          [
            {
              text: 'Scan Again',
              onPress: () => {
                resetScanner();
              },
            },
            {
              text: result.action === 'created' ? 'View Details' : 'Checkout',
              onPress: () => {
                if (result.action === 'created') {
                  navigation.navigate('ProductDetails', {
                    product: result.product,
                  });
                  return;
                }

                // Navigate to checkout/customer selection
                navigation.navigate('Dashboard', {
                  screen: 'Checkout',
                  params: {
                    inventory_id: result.product?.id,
                    product: result.product,
                  },
                });
              },
            },
          ]
        );
      } else if (result.action === 'not_found' && result.form_required) {
        // Product not found, open creation form with prefill
        Alert.alert(
          '📝 Product Not Found',
          'Opening form to create new product...'
        );
        navigation.navigate('ProductForm', {
          mode: 'create',
          barcode: scannedBarcode,
          imei1: scannedImei1 || undefined,
          imei2: scannedImei2 || undefined,
          prefill: result.prefill || {},
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to process scan.');
      }
    } catch (error: any) {
      console.log('\n========== SCAN INGEST ERROR ==========');
      console.log('Error Message:', error.message);
      console.log('Error Stack:', error.stack);
      console.log('Full Error Object:', JSON.stringify(error, null, 2));

      if (error.message?.includes('409') || error.message?.includes('already')) {
        Alert.alert('Duplicate', 'This IMEI is already saved.');
      } else {
        Alert.alert('Error', error.message || 'Failed to process scan.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Reset scanner ──────────────────────────────────────────────────────
  const resetScanner = () => {
    setScannedBarcode(null);
    setScannedImei1(null);
    setScannedImei2(null);
    lastScannedRef.current = null;
  };

  // ─── Permission: loading ────────────────────────────────────────────────
  if (!cameraPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>Requesting camera permission…</Text>
      </View>
    );
  }

  // ─── Permission: denied ─────────────────────────────────────────────────
  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.centerContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.permissionText}>Camera access is required to scan barcodes.</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Main UI ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13', 'ean8', 'upc_a', 'upc_e',
            'code128', 'code39', 'itf14',
            'qr', 'datamatrix', 'pdf417',
          ],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Products</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Frame */}
        <View style={styles.frameContainer}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.frameText}>Point at barcode or IMEI</Text>
        </View>

        {/* Scanned Data Panel */}
        <View style={styles.dataPanel}>
          <ScrollView style={styles.dataScroll} showsVerticalScrollIndicator={false}>
            {/* Barcode */}
            {scannedBarcode && (
              <View style={styles.dataItem}>
                <View style={styles.dataLabel}>
                  <Ionicons name="barcode" size={16} color={colors.success} />
                  <Text style={styles.dataLabelText}>Barcode</Text>
                </View>
                <Text style={styles.dataValue}>{scannedBarcode}</Text>
              </View>
            )}

            {/* IMEI1 */}
            {scannedImei1 && (
              <View style={styles.dataItem}>
                <View style={styles.dataLabel}>
                  <Ionicons name="phone-portrait" size={16} color={colors.primary} />
                  <Text style={styles.dataLabelText}>IMEI 1</Text>
                </View>
                <Text style={styles.dataValue}>{scannedImei1}</Text>
              </View>
            )}

            {/* IMEI2 */}
            {scannedImei2 && (
              <View style={styles.dataItem}>
                <View style={styles.dataLabel}>
                  <Ionicons name="phone-portrait" size={16} color={colors.accent} />
                  <Text style={styles.dataLabelText}>IMEI 2</Text>
                </View>
                <Text style={styles.dataValue}>{scannedImei2}</Text>
              </View>
            )}

            {/* Empty state */}
            {!scannedBarcode && (
              <View style={styles.emptyState}>
                <Ionicons name="scan-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyText}>Scan a barcode to start</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        {scannedBarcode && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={resetScanner}
              disabled={isProcessing}
            >
              <Ionicons name="refresh" size={18} color={colors.primary} />
              <Text style={styles.resetBtnText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.proceedBtn, isProcessing && { opacity: 0.6 }]}
              onPress={handleProceed}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              )}
              <Text style={styles.proceedBtnText}>
                {isProcessing ? 'Processing...' : 'Proceed'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1 },
  backBtn: { padding: spacing.md },

  infoText: {
    ...typography.bodyMedium,
    color: colors.text,
    textAlign: 'center',
    marginTop: 100,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textInverse,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  permissionText: {
    ...typography.bodyMedium,
    color: colors.text,
    marginVertical: spacing.lg,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  permissionBtnText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },

  frameContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  frame: {
    width: 260,
    height: 160,
    position: 'relative',
  },
  frameText: {
    ...typography.caption,
    color: colors.textInverse,
    textAlign: 'center',
  },

  // Corner decorators
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },

  // Data panel
  dataPanel: {
    flex: 0.35,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dataScroll: {
    flex: 1,
  },
  dataItem: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  dataLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  dataLabelText: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  dataValue: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  resetBtn: {
    flex: 0.35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  resetBtnText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  proceedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    gap: spacing.sm,
  },
  proceedBtnText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontWeight: '600',
  },
});
