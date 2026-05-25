import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useAuthStore } from '../../store/auth.store';

export const ProfileScreen: React.FC<{navigation: any}> = ({ navigation }) => {
  const { user, logout, isLoading } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }},
    ]);
  };

  const menuItems = [
    { icon: 'business-outline' as const, label: 'Edit Business Profile', onPress: () => navigation.navigate('BusinessProfileForm', { isEditMode: true }) },
    { icon: 'person-outline' as const, label: 'Account Settings', onPress: () => {} },
    { icon: 'notifications-outline' as const, label: 'Notifications', onPress: () => {} },
    { icon: 'shield-checkmark-outline' as const, label: 'Privacy & Security', onPress: () => {} },
    { icon: 'help-circle-outline' as const, label: 'Help & Support', onPress: () => {} },
    { icon: 'information-circle-outline' as const, label: 'About', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoading}>
        <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>InventoryPro v1.0.0</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  headerTitle: { ...typography.heading2, color: colors.text },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    marginHorizontal: spacing.xl, padding: spacing.xl, borderRadius: borderRadius.card,
    marginBottom: spacing.xl, ...shadows.md,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg,
  },
  avatarText: { ...typography.heading3, color: colors.textInverse },
  userInfo: { flex: 1 },
  userName: { ...typography.subtitle, color: colors.text },
  userEmail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  menu: {
    backgroundColor: colors.surface, marginHorizontal: spacing.xl,
    borderRadius: borderRadius.card, ...shadows.sm, marginBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLightest,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  menuLabel: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: spacing.xl, padding: spacing.lg, borderRadius: borderRadius.card,
    backgroundColor: colors.dangerLight, gap: spacing.sm,
  },
  logoutText: { ...typography.bodyMedium, color: colors.danger },
  version: { ...typography.small, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl },
});
