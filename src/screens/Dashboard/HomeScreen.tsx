import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { MiniBarChart } from '../../components/MiniBarChart';
import { useDashboardStore } from '../../store/dashboard.store';
import { useAuthStore } from '../../store/auth.store';
import { DashboardPeriod, DashboardSummary } from '../../api/dashboard.api';
import { toast } from '../../store/toast.store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}

// ──────────── Helpers ────────────

const formatCurrency = (val: string | number | null | undefined): string => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (num == null || isNaN(num)) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
};

const formatFullCurrency = (val: string | number | null | undefined): string => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (num == null || isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const getTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const PERIOD_OPTIONS: { key: DashboardPeriod; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

// ──────────── Component ────────────

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { summary, isLoading, selectedPeriod, fetchSummary, setPeriod, error, clearError } =
    useDashboardStore();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  React.useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error]);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [])
  );

  const handleRefresh = () => fetchSummary();

  const inv = summary?.inventory;
  const sales = summary?.sales;
  const chart = summary?.sales_chart || [];
  const topSelling = summary?.top_selling || [];
  const lowStock = summary?.low_stock || [];
  const recentActivity = summary?.recent_activity || [];

  // Chart data
  const chartData = chart.map((pt) => ({
    label: new Date(pt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(' ', '\n'),
    value: parseFloat(pt.revenue) || 0,
  }));

  const changePercent = sales?.revenue_change_percent ?? 0;
  const isPositiveChange = changePercent >= 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ─── Greeting ─── */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{user?.username || 'User'}</Text>
            {profile?.shop_name ? (
              <Text style={styles.shopName}>{profile.shop_name}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('SalesHistory')}
          >
            <Ionicons name="receipt-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ─── Revenue Overview Card ─── */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <View style={styles.revenueIconCircle}>
              <Ionicons name="trending-up" size={20} color={colors.textInverse} />
            </View>
            <View style={styles.revenueBadge}>
              <Ionicons
                name={isPositiveChange ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={isPositiveChange ? '#4ADE80' : colors.danger}
              />
              <Text
                style={[
                  styles.revenueBadgeText,
                  { color: isPositiveChange ? '#4ADE80' : colors.danger },
                ]}
              >
                {Math.abs(changePercent).toFixed(1)}%
              </Text>
            </View>
          </View>

          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueAmount}>
            {formatFullCurrency(sales?.total_revenue)}
          </Text>

          <View style={styles.revenueDivider} />

          <View style={styles.revenueMeta}>
            <View style={styles.revenueMetaItem}>
              <Text style={styles.revenueMetaLabel}>Today</Text>
              <Text style={styles.revenueMetaValue}>
                {formatCurrency(sales?.today_revenue)}
              </Text>
            </View>
            <View style={styles.revenueMetaSep} />
            <View style={styles.revenueMetaItem}>
              <Text style={styles.revenueMetaLabel}>Sales</Text>
              <Text style={styles.revenueMetaValue}>
                {sales?.total_sales_count ?? 0}
              </Text>
            </View>
            <View style={styles.revenueMetaSep} />
            <View style={styles.revenueMetaItem}>
              <Text style={styles.revenueMetaLabel}>Avg Order</Text>
              <Text style={styles.revenueMetaValue}>
                {formatCurrency(sales?.average_order_value)}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Inventory Summary ─── */}
        <View style={styles.inventoryRow}>
          <View style={[styles.inventoryCard, { backgroundColor: '#EEF2FF' }]}>
            <View style={[styles.invIconCircle, { backgroundColor: '#818CF8' }]}>
              <Ionicons name="cube" size={16} color="#FFF" />
            </View>
            <Text style={styles.invValue}>{inv?.in_stock_count ?? 0}</Text>
            <Text style={styles.invLabel}>In Stock</Text>
          </View>

          <View style={[styles.inventoryCard, { backgroundColor: '#FEF3C7' }]}>
            <View style={[styles.invIconCircle, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="pricetag" size={16} color="#FFF" />
            </View>
            <Text style={styles.invValue}>{inv?.sold_count ?? 0}</Text>
            <Text style={styles.invLabel}>Sold</Text>
          </View>

          <View style={[styles.inventoryCard, { backgroundColor: '#D1FAE5' }]}>
            <View style={[styles.invIconCircle, { backgroundColor: '#10B981' }]}>
              <Ionicons name="wallet" size={16} color="#FFF" />
            </View>
            <Text style={styles.invValue}>{formatCurrency(inv?.total_mrp)}</Text>
            <Text style={styles.invLabel}>Stock Value</Text>
          </View>
        </View>

        {/* ─── Quick Actions ─── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Scan')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="scan-outline" size={22} color="#FFF" />
            </View>
            <Text style={styles.quickActionText}>Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('ProductForm', { mode: 'create' })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="add" size={22} color={colors.text} />
            </View>
            <Text style={styles.quickActionText}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('SellScan')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.success }]}>
              <Ionicons name="cart-outline" size={22} color="#FFF" />
            </View>
            <Text style={styles.quickActionText}>Sell</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('ProductList')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="list-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionText}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('SalesHistory')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.info }]}>
              <Ionicons name="analytics-outline" size={22} color="#FFF" />
            </View>
            <Text style={styles.quickActionText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Sales Chart ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Sales Overview</Text>
            <View style={styles.periodPills}>
              {PERIOD_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.periodPill,
                    selectedPeriod === opt.key && styles.periodPillActive,
                  ]}
                  onPress={() => setPeriod(opt.key)}
                >
                  <Text
                    style={[
                      styles.periodPillText,
                      selectedPeriod === opt.key && styles.periodPillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {chartData.length > 0 ? (
            <View style={styles.chartContainer}>
              <MiniBarChart
                data={chartData}
                height={100}
                barColor={colors.primaryLightest}
                barActiveColor={colors.primary}
              />
            </View>
          ) : (
            <View style={styles.chartEmpty}>
              <Ionicons name="bar-chart-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.chartEmptyText}>No sales data yet</Text>
            </View>
          )}
        </View>

        {/* ─── Top Selling ─── */}
        {topSelling.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Top Selling</Text>
              <Ionicons name="trophy-outline" size={18} color={colors.accent} />
            </View>

            {topSelling.map((item, idx) => {
              const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
              return (
                <TouchableOpacity
                  key={item.product_id}
                  style={styles.topItem}
                  onPress={() =>
                    navigation.navigate('ProductDetails', {
                      product: { id: item.product_id },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.topItemLeft}>
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor:
                            idx < 3 ? medalColors[idx] : colors.textTertiary,
                        },
                      ]}
                    >
                      <Text style={styles.rankText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.topItemInfo}>
                      <Text style={styles.topItemBrand} numberOfLines={1}>
                        {item.brand}
                      </Text>
                      <Text style={styles.topItemModel} numberOfLines={1}>
                        {item.model}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.topItemRight}>
                    <Text style={styles.topItemRevenue}>
                      {formatCurrency(item.total_revenue)}
                    </Text>
                    <Text style={styles.topItemSold}>
                      {item.total_sold} sold
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── Low Stock Alerts ─── */}
        {lowStock.length > 0 && (
          <View style={[styles.sectionCard, styles.lowStockCard]}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.lowStockTitleRow}>
                <Ionicons name="warning" size={18} color={colors.warning} />
                <Text style={styles.sectionTitle}>Low Stock</Text>
              </View>
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockBadgeText}>{lowStock.length}</Text>
              </View>
            </View>

            {lowStock.map((item) => (
              <TouchableOpacity
                key={item.product_id}
                style={styles.lowStockItem}
                onPress={() =>
                  navigation.navigate('ProductDetails', {
                    product: { id: item.product_id },
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.lowStockLeft}>
                  <View style={styles.lowStockDot} />
                  <View>
                    <Text style={styles.lowStockName} numberOfLines={1}>
                      {item.brand} {item.model}
                    </Text>
                    <Text style={styles.lowStockCategory}>{item.category}</Text>
                  </View>
                </View>
                <View style={styles.lowStockQtyBadge}>
                  <Text style={styles.lowStockQtyText}>{item.quantity} left</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ─── Recent Activity ─── */}
        {recentActivity.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SalesHistory')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentActivity.slice(0, 6).map((act, idx) => {
              const isSale = act.type === 'sale';
              return (
                <TouchableOpacity
                  key={`${act.type}-${idx}`}
                  style={[
                    styles.activityItem,
                    idx === Math.min(recentActivity.length, 6) - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => {
                    if (isSale && act.reference_id) {
                      navigation.navigate('SaleDetail', {
                        invoiceNumber: act.reference_id,
                      });
                    }
                  }}
                  activeOpacity={isSale ? 0.7 : 1}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      {
                        backgroundColor: isSale
                          ? colors.successLight
                          : colors.infoLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isSale ? 'arrow-up-circle' : 'add-circle'}
                      size={18}
                      color={isSale ? colors.success : colors.info}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityDesc} numberOfLines={1}>
                      {act.description}
                    </Text>
                    <Text style={styles.activityTime}>
                      {getTimeAgo(act.timestamp)}
                    </Text>
                  </View>
                  {act.amount && (
                    <Text
                      style={[
                        styles.activityAmount,
                        { color: isSale ? colors.success : colors.info },
                      ]}
                    >
                      {isSale ? '+' : ''}{formatCurrency(act.amount)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── Empty State ─── */}
        {!isLoading && !summary && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="analytics-outline" size={48} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Dashboard Loading...</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh or check your connection.
            </Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ─── FAB ─── */}
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

// ──────────── Styles ────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
  },

  // Greeting
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greetingLeft: {
    flex: 1,
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
  shopName: {
    ...typography.caption,
    color: colors.textTertiary,
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

  // Revenue Card
  revenueCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  revenueIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  revenueBadgeText: {
    ...typography.captionMedium,
    fontWeight: '700',
  },
  revenueLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 4,
  },
  revenueAmount: {
    fontFamily: typography.fontFamily,
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 40,
  },
  revenueDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: spacing.lg,
  },
  revenueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueMetaSep: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  revenueMetaLabel: {
    ...typography.small,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 2,
  },
  revenueMetaValue: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Inventory Row
  inventoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  inventoryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  invIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  invValue: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '700',
  },
  invLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  quickActionText: {
    ...typography.small,
    color: colors.text,
    fontWeight: '500',
  },

  // Section Card
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitleRow: {
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

  // Period Pills
  periodPills: {
    flexDirection: 'row',
    gap: 6,
  },
  periodPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  periodPillActive: {
    backgroundColor: colors.primary,
  },
  periodPillText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  periodPillTextActive: {
    color: '#FFFFFF',
  },

  // Chart
  chartContainer: {
    paddingTop: spacing.sm,
  },
  chartEmpty: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.sm,
  },
  chartEmptyText: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // Top Selling
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  topItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  topItemInfo: {
    flex: 1,
  },
  topItemBrand: {
    ...typography.captionMedium,
    color: colors.text,
  },
  topItemModel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },
  topItemRight: {
    alignItems: 'flex-end',
  },
  topItemRevenue: {
    ...typography.captionMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  topItemSold: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: 1,
  },

  // Low Stock
  lowStockCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  lowStockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lowStockBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lowStockBadgeText: {
    ...typography.small,
    color: colors.warning,
    fontWeight: '700',
  },
  lowStockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  lowStockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  lowStockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  lowStockName: {
    ...typography.captionMedium,
    color: colors.text,
  },
  lowStockCategory: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: 1,
  },
  lowStockQtyBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lowStockQtyText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '600',
  },

  // Activity
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityDesc: {
    ...typography.captionMedium,
    color: colors.text,
  },
  activityTime: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: 1,
  },
  activityAmount: {
    ...typography.bodyMedium,
    fontWeight: '700',
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
