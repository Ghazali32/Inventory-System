import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { ProductCard } from '../../components/ProductCard';
import { useProductStore } from '../../store/product.store';
import { Product } from '../../api/product.api';
import { toast } from '../../store/toast.store';

export const ProductListScreen: React.FC<{navigation: any}> = ({ navigation }) => {
  const { products, isLoading, fetchProducts, error, clearError } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error]);

  useFocusEffect(useCallback(() => { fetchProducts(); }, []));

  const categories = [...new Set(products.map((p) => p.category))];
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.brand.toLowerCase().includes(q) || p.model.toLowerCase().includes(q) || p.product_barcode.toLowerCase().includes(q);
    return matchesSearch && (!selectedCategory || p.category === selectedCategory);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ProductForm', { mode: 'create' })}>
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={colors.textTertiary} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={colors.textTertiary} /></TouchableOpacity>}
        </View>
      </View>
      {categories.length > 0 && (
        <FlatList
          data={[null, ...categories]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item || 'all'}
          style={styles.categoriesFlatList}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                (item === null ? !selectedCategory : item === selectedCategory) && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  (item === null ? !selectedCategory : item === selectedCategory) && styles.categoryChipTextActive
                ]}
              >
                {item || 'All'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
      <Text style={styles.resultsText}>{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</Text>
      <FlatList data={filteredProducts} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <ProductCard product={item} onPress={(p) => navigation.navigate('ProductDetails', { product: p })} />} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchProducts} tintColor={colors.primary} />} ListEmptyComponent={
        <View style={styles.emptyState}><Ionicons name="search-outline" size={48} color={colors.textTertiary} /><Text style={styles.emptyTitle}>{searchQuery ? 'No results' : 'No products'}</Text></View>
      } />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  headerTitle: { ...typography.heading2, color: colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  searchContainer: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.input, padding: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md, ...shadows.sm },
  searchInput: { flex: 1, ...typography.body, color: colors.text },
  categoriesFlatList: { flexGrow: 0, marginBottom: spacing.xs },
  categoriesList: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.xs },
  categoryChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { ...typography.captionMedium, color: colors.textSecondary },
  categoryChipTextActive: { color: colors.textInverse },
  resultsText: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
  emptyState: { alignItems: 'center', paddingVertical: spacing['4xl'] },
  emptyTitle: { ...typography.subtitle, color: colors.text, marginTop: spacing.lg },
});
