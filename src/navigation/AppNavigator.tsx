import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';

// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { SignupScreen } from '../screens/Auth/SignupScreen';
import { HomeScreen } from '../screens/Dashboard/HomeScreen';
import { ScanScreen } from '../screens/Scan/ScanScreen';
import { ProductFormScreen } from '../screens/Product/ProductFormScreen';
import { ProductListScreen } from '../screens/Product/ProductListScreen';
import { ProductDetailsScreen } from '../screens/Product/ProductDetailsScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { BusinessProfileFormScreen } from '../screens/Profile/BusinessProfileFormScreen';
import { SellScanScreen } from '../screens/Checkout/SellScanScreen';
import { CheckoutPreviewScreen } from '../screens/Checkout/CheckoutPreviewScreen';
import { CustomerSelectScreen } from '../screens/Checkout/CustomerSelectScreen';
import { CustomerFormScreen } from '../screens/Checkout/CustomerFormScreen';
import { InvoiceScreen } from '../screens/Checkout/InvoiceScreen';
import { SalesHistoryScreen } from '../screens/Checkout/SalesHistoryScreen';
import { SaleDetailScreen } from '../screens/Checkout/SaleDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const ProductStack = createStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="ProductForm" component={ProductFormScreen} />
      <HomeStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    </HomeStack.Navigator>
  );
}

function ProductStackNavigator() {
  return (
    <ProductStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductStack.Screen name="ProductListMain" component={ProductListScreen} />
      <ProductStack.Screen name="ProductForm" component={ProductFormScreen} />
      <ProductStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    </ProductStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Scan') iconName = focused ? 'scan' : 'scan-outline';
          else if (route.name === 'ProductList') iconName = focused ? 'cube' : 'cube-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { ...typography.small, fontWeight: '500' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ tabBarLabel: 'Scan' }} />
      <Tab.Screen name="ProductList" component={ProductStackNavigator} options={{ tabBarLabel: 'Products' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="BusinessProfileForm" component={BusinessProfileFormScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ProductForm" component={ProductFormScreen} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
        <Stack.Screen name="SellScan" component={SellScanScreen} />
        <Stack.Screen name="CheckoutPreview" component={CheckoutPreviewScreen} />
        <Stack.Screen name="CustomerSelect" component={CustomerSelectScreen} />
        <Stack.Screen name="CustomerForm" component={CustomerFormScreen} />
        <Stack.Screen name="Invoice" component={InvoiceScreen} />
        <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
        <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
