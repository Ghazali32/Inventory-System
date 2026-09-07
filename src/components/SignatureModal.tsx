import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../store/toast.store';

interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ visible, onClose }) => {
  const { hasSignature, signatureImage, fetchSignature, uploadSignature, deleteSignature } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchSignature().finally(() => setLoading(false));
    }
  }, [visible, fetchSignature]);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload a signature.');
        return;
      }

      setActionLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.base64) {
        const base64Data = `data:image/png;base64,${result.assets[0].base64}`;
        const success = await uploadSignature(base64Data);
        if (success) {
          toast.success('Signature uploaded successfully!');
        } else {
          toast.error('Failed to upload signature.');
        }
      }
    } catch (err: any) {
      console.error('Error picking signature:', err);
      toast.error(err.message || 'Failed to select image.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to take a photo of your signature.');
        return;
      }

      setActionLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.base64) {
        const base64Data = `data:image/png;base64,${result.assets[0].base64}`;
        const success = await uploadSignature(base64Data);
        if (success) {
          toast.success('Signature photo uploaded successfully!');
        } else {
          toast.error('Failed to upload signature photo.');
        }
      }
    } catch (err: any) {
      console.error('Error taking signature photo:', err);
      toast.error(err.message || 'Failed to take photo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Signature',
      'Are you sure you want to remove your digital signature? It will no longer appear on new invoices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const success = await deleteSignature();
              if (success) {
                toast.success('Signature removed.');
              } else {
                toast.error('Failed to remove signature.');
              }
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Ionicons name="pencil-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Digital Signature</Text>
              <Text style={styles.subtitle}>Printed on invoices under Authorized Signatory</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Checking signature status...</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {hasSignature && signatureImage ? (
                <View style={styles.signaturePreviewBox}>
                  <Text style={styles.previewLabel}>Current Signature</Text>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: signatureImage }}
                      style={styles.signatureImg}
                      resizeMode="contain"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleDelete}
                    disabled={actionLoading}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={styles.deleteText}>Remove Signature</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name="create-outline" size={40} color={colors.textTertiary} />
                  <Text style={styles.emptyTitle}>No Signature Uploaded</Text>
                  <Text style={styles.emptyText}>
                    Upload your signature image or take a clear photo of your handwritten signature on white paper.
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.primaryBtn, actionLoading && styles.btnDisabled]}
                  onPress={handlePickImage}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="images-outline" size={18} color={colors.textInverse} />
                      <Text style={styles.primaryBtnText}>
                        {hasSignature ? 'Replace from Gallery' : 'Upload from Gallery'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, actionLoading && styles.btnDisabled]}
                  onPress={handleTakePhoto}
                  disabled={actionLoading}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  <Text style={styles.secondaryBtnText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLightest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    fontSize: 17,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  content: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  signaturePreviewBox: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  signatureImg: {
    width: '100%',
    height: '100%',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  deleteText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
  },
  primaryBtnText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLightest,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryBtnText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
