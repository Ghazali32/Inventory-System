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
import { toast } from '../../store/toast.store';

interface SellScanScreenProps {
  navigation: any;
}

const IMEI_REGEX = /\b\d{15}\b/;

export const SellScanScreen: React.FC<SellScanScreenProps> = ({ navigation }) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [scannedImei1, setScannedImei1] = useState<string | null>(null);
  const [scannedImei2, setScannedImei2] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const cooldownRef = useRef(false);

  const { scanForSelling } = useProductStore();

  useFocusEffect(
    React.useCallback(() => {
      setScannedBarcode(null);
      setScannedImei1(null);
      setScannedImei2(null);
      lastScannedRef.current = null;
      cooldownRef.current = false;
      setIsProcessing(false);
      return () => {};
    }, [])
  );

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (cooldownRef.current || !data || data === lastScannedRef.current) return;

    cooldownRef.current = true;
    lastScannedRef.current = data;
    Vibration.vibrate(100);

    const imeiMatch = data.match(IMEI_REGEX);
    const imei = imeiMatch ? imeiMatch[0] : null;

    if (imei) {
      if (!scannedImei1) {
        setScannedImei1(imei);
      } else if (!scannedImei2 && imei !== scannedImei1) {
        setScannedImei2(imei);
      }
    } else {
      if (!scannedBarcode) {
        setScannedBarcode(data);
      }
    }

    setTimeout(() => {
      cooldownRef.current = false;
      lastScannedRef.current = null;
    }, 600);
  };

  const handleProceed = async () => {
    if (!scannedBarcode) {
      toast.warn('Please scan a barcode first.', 'Missing Data');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await scanForSelling(
        scannedBarcode,
        scannedImei1 || undefined,
        scannedImei2 || undefined
      );

      if (result.product_found && result.product) {
        navigation.navigate('CheckoutPreview', { product: result.product });
      } else {
        toast.warn(result.message || 'This product is not in your inventory.', 'Product Not Found');
        resetScanner();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to find product.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScannedBarcode(null);
    setScannedImei1(null);
    setScannedImei2(null);
    lastScannedRef.current = null;
  };

  if (!cameraPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

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

      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="cart-outline" size={18} color={colors.accent} />
            <Text style={styles.headerTitle}>Scan to Sell</Text>
          </View>
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
          <Text style={styles.frameText}>Point at product barcode</Text>
        </View>

        {/* Scanned Data Panel */}
        <View style={styles.dataPanel}>
          <ScrollView style={styles.dataScroll} showsVerticalScrollIndicator={false}>
            {scannedBarcode && (
              <View style={styles.dataItem}>
                <View style={styles.dataLabel}>
                  <Ionicons name="barcode" size={16} color={colors.success} />
                  <Text style={styles.dataLabelText}>Barcode</Text>
                </View>
                <Text style={styles.dataValue}>{scannedBarcode}</Text>
              </View>
            )}

            {scannedImei1 && (
              <View style={styles.dataItem}>
                <View style={styles.dataLabel}>
                  <Ionicons name="phone-portrait" size={16} color={colors.primary} />
                  <Text style={styles.dataLabelText}>IMEI 1</Text>
                </View>
                <Text style={styles.dataValue}>{scannedImei1}</Text>
              </View>
            )}

            {scannedImei2 && (
              <View style={styles.dataItem}>
                <View style={styles.dataLabel}>
                  <Ionicons name="phone-portrait" size={16} color={colors.accent} />
                  <Text style={styles.dataLabelText}>IMEI 2</Text>
                </View>
                <Text style={styles.dataValue}>{scannedImei2}</Text>
              </View>
            )}

            {!scannedBarcode && (
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyText}>Scan a product to sell</Text>
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
                <Ionicons name="cart" size={18} color={colors.textInverse} />
              )}
              <Text style={styles.proceedBtnText}>
                {isProcessing ? 'Finding...' : 'Find & Sell'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1 },
  infoText: { ...typography.bodyMedium, color: colors.text, textAlign: 'center', marginTop: 100 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.subtitle, color: colors.textInverse },
  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl, backgroundColor: colors.background,
  },
  permissionText: { ...typography.bodyMedium, color: colors.text, marginVertical: spacing.lg, textAlign: 'center' },
  permissionBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  permissionBtnText: { ...typography.bodyMedium, color: colors.textInverse },
  frameContainer: { flex: 0.4, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  frame: { width: 260, height: 160, position: 'relative' },
  frameText: { ...typography.caption, color: colors.textInverse, textAlign: 'center' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: colors.accent },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  dataPanel: {
    flex: 0.35, backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  dataScroll: { flex: 1 },
  dataItem: {
    marginBottom: spacing.lg, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md, padding: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.accent,
  },
  dataLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  dataLabelText: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase', fontSize: 11 },
  dataValue: { ...typography.bodyMedium, color: colors.textInverse, fontFamily: 'monospace', letterSpacing: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  emptyText: { ...typography.caption, color: colors.textTertiary },
  actionBar: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  resetBtn: {
    flex: 0.35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.primary, gap: spacing.sm,
  },
  resetBtnText: { ...typography.bodyMedium, color: colors.primary },
  proceedBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.success, gap: spacing.sm,
  },
  proceedBtnText: { ...typography.bodyMedium, color: colors.textInverse, fontWeight: '600' },
});
