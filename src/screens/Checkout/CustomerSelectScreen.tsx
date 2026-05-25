import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useProductStore } from '../../store/product.store';
import { Product, SearchCustomerResult, productAPI } from '../../api/product.api';

interface CustomerSelectScreenProps {
  navigation: any;
  route: any;
}

export const CustomerSelectScreen: React.FC<CustomerSelectScreenProps> = ({
  navigation,
  route,
}) => {
  const product = route.params?.product as Product;
  const { searchCustomers } = useProductStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<SearchCustomerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  // Fetch/Search associated customers
  const fetchCustomers = useCallback(async (query: string = '') => {
    setLoading(true);
    try {
      const response = await searchCustomers(query, 100);
      setCustomers(response.results || []);
    } catch (error: any) {
      console.error('Failed to search customers:', error);
      Alert.alert('Error', 'Failed to retrieve previous customers.');
    } finally {
      setLoading(false);
    }
  }, [searchCustomers]);

  // Initial load
  useEffect(() => {
    fetchCustomers('');
  }, [fetchCustomers]);

  // Debounced search (simple timer-based)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, fetchCustomers]);

  const handleSkipToNew = () => {
    navigation.navigate('CustomerForm', { product });
  };

  const handleSelectCustomer = async (customer: SearchCustomerResult) => {
    setIsSelecting(true);
    try {
      console.log('Fetching complete customer profile for UUID:', customer.customer_id);
      const fullProfile = await productAPI.getCustomer(customer.customer_id);
      console.log('Customer profile retrieved. Prefilling and navigating to CustomerFormScreen.');
      navigation.navigate('CustomerForm', {
        product,
        prefilledCustomer: fullProfile,
      });
    } catch (error: any) {
      console.error('Failed to fetch full customer details:', error);
      // Fallback to whatever details we have from the search list
      navigation.navigate('CustomerForm', {
        product,
        prefilledCustomer: {
          customer_id: customer.customer_id,
          name: customer.name,
          phone_number: customer.phone_number,
          email: customer.email,
          city: customer.city,
          state: customer.state,
          address: '',
          pincode: '',
        },
      });
    } finally {
      setIsSelecting(false);
    }
  };

  const formatCurrency = (value: string | number): string => {
    const num = Number(value);
    if (Number.isNaN(num)) return `₹${value}`;
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const renderCustomerItem = ({ item }: { item: SearchCustomerResult }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => handleSelectCustomer(item)}
      activeOpacity={0.7}
      disabled={isSelecting}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.contactText}>{item.phone_number || '-'}</Text>
            {item.email ? (
              <>
                <View style={styles.bullet} />
                <Ionicons name="mail-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
              </>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>

      {/* Stats and metadata footer */}
      <View style={styles.cardFooter}>
        <View style={styles.statBox}>
          <Ionicons name="bag-check-outline" size={12} color={colors.primary} />
          <Text style={styles.statText}>
            {item.purchase_count} {item.purchase_count === 1 ? 'Purchase' : 'Purchases'}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="cash-outline" size={12} color={colors.success} />
          <Text style={styles.statText}>Spent: {formatCurrency(item.total_spent)}</Text>
        </View>
        {(item.city || item.state) && (
          <View style={styles.locationBox}>
            <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {[item.city, item.state].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Customer</Text>
        <View style={styles.headerIconBtn} />
      </View>

      {isSelecting && (
        <View style={styles.selectingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.selectingText}>Loading customer details...</Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textTertiary}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Skip Button Card */}
      <TouchableOpacity
        style={styles.skipBtnCard}
        onPress={handleSkipToNew}
        activeOpacity={0.8}
        disabled={isSelecting}
      >
        <View style={styles.skipIconWrap}>
          <Ionicons name="person-add-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.skipInfo}>
          <Text style={styles.skipTitle}>New / Walk-in Customer</Text>
          <Text style={styles.skipSubtitle}>Skip search and fill details manually</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
      </TouchableOpacity>

      {/* List Title */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Previous Customers</Text>
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Previous Customers List */}
      <FlatList
        data={customers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item.customer_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No Customers Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? "We couldn't find any customers matching your search query."
                  : 'Start by selling to your first customer.'}
              </Text>
              <TouchableOpacity style={styles.emptyCta} onPress={handleSkipToNew}>
                <Text style={styles.emptyCtaText}>Create New Customer</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56, paddingHorizontal: spacing.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerIconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.subtitle, color: colors.text },

  // Selecting Overlay
  selectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  selectingText: { ...typography.bodyMedium, color: colors.primary, marginTop: spacing.md, fontWeight: '600' },

  // Search
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.text,
    ...typography.body,
  },

  // Skip Button
  skipBtnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLightest,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  skipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  skipInfo: { flex: 1 },
  skipTitle: { ...typography.bodyMedium, color: colors.primary, fontWeight: '700' },
  skipSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  // List Title
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  listTitle: { ...typography.subtitle, color: colors.textSecondary, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },

  // Customers list
  listContent: { paddingBottom: spacing['4xl'] },
  customerCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { ...typography.bodyMedium, color: colors.textSecondary, fontWeight: '700' },
  customerInfo: { flex: 1 },
  customerName: { ...typography.bodyMedium, color: colors.text, fontWeight: '600' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  contactText: { ...typography.caption, color: colors.textTertiary, marginLeft: 2 },
  bullet: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textTertiary,
    marginHorizontal: spacing.sm,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { ...typography.caption, color: colors.textSecondary, fontSize: 11 },
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  locationText: { ...typography.caption, color: colors.textTertiary, fontSize: 11 },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: { marginBottom: spacing.md },
  emptyTitle: { ...typography.bodyMedium, color: colors.text, fontWeight: '600', marginBottom: 4 },
  emptySub: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 16 },
  emptyCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    marginTop: spacing.lg,
  },
  emptyCtaText: { ...typography.body, color: colors.textInverse, fontWeight: '600' },
});
