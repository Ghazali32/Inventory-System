import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { ProductCard } from '../../components/ProductCard';
import { useProductStore } from '../../store/product.store';
import { useAuthStore } from '../../store/auth.store';
import { Product } from '../../api/product.api';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { products, isLoading, fetchProducts } = useProductStore();
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const filteredProducts = products.filter(
    (p) =>
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, p) => sum + (p.quantity ?? 0), 0);
  const categories = [...new Set(products.map((p) => p.category))].length;

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetails', {
      product,
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderHeader = () => (
    <View>
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <Text style={styles.userName}>{user?.username || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Ionicons
            name="notifications-outline"
            size={24}
            color={colors.text}
          />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('ProductList')}
        activeOpacity={0.7}
      >
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.searchPlaceholder}>Search products...</Text>
      </TouchableOpacity>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.primaryLightest }]}>
          <View style={styles.statIconWrap}>
            <Ionicons name="cube-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{totalProducts}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.accentLight }]}>
          <View style={styles.statIconWrap}>
            <Ionicons name="layers-outline" size={22} color={colors.accentDark} />
          </View>
          <Text style={styles.statValue}>{totalQuantity}</Text>
          <Text style={styles.statLabel}>Total Qty</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.infoLight }]}>
          <View style={styles.statIconWrap}>
            <Ionicons name="grid-outline" size={22} color={colors.info} />
          </View>
          <Text style={styles.statValue}>{categories}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Scan')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="scan-outline" size={24} color={colors.textInverse} />
          </View>
          <Text style={styles.quickActionText}>Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('ProductForm', { mode: 'create' })}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="add" size={24} color={colors.text} />
          </View>
          <Text style={styles.quickActionText}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('SellScan')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.success }]}>
            <Ionicons name="cart-outline" size={24} color={colors.textInverse} />
          </View>
          <Text style={styles.quickActionText}>Sell</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('ProductList')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="list-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickActionText}>All</Text>
        </TouchableOpacity>
      </View>

      {/* Second Row: History */}
      <View style={styles.quickActionsSecondary}>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate('SalesHistory')}
        >
          <View style={styles.historyBtnLeft}>
            <View style={[styles.quickActionIcon, { backgroundColor: colors.info, width: 40, height: 40, borderRadius: 20 }]}>
              <Ionicons name="analytics-outline" size={20} color={colors.textInverse} />
            </View>
            <View>
              <Text style={styles.historyBtnTitle}>Sales History</Text>
              <Text style={styles.historyBtnSub}>View all sold items</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Products</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No products yet</Text>
      <Text style={styles.emptySubtitle}>
        Scan a barcode or add a product manually to get started.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={filteredProducts.slice(0, 10)}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={handleProductPress} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchProducts}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Scan')}
        activeOpacity={0.8}
      >
        <Ionicons name="scan" size={28} color={colors.textInverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },

  // Greeting
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.heading2,
    color: colors.text,
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.input,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  searchPlaceholder: {
    ...typography.body,
    color: colors.textTertiary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    alignItems: 'center',
  },
  statIconWrap: {
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.heading3,
    color: colors.text,
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  quickActionText: {
    ...typography.captionMedium,
    color: colors.text,
  },

  // History Button
  quickActionsSecondary: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  historyBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyBtnTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  historyBtnSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  seeAll: {
    ...typography.captionMedium,
    color: colors.primary,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing['3xl'],
    right: spacing.xl,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
