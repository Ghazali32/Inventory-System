import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuthStore } from '../../store/auth.store';
import { SignupResponse } from '../../api/auth.api';

interface SignupScreenProps {
  navigation: any;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState(1); // 2-step form to avoid overwhelm
  const [signupResponse, setSignupResponse] = useState<SignupResponse | null>(null);

  const { signup, isLoading, error, clearError } = useAuthStore();

  const validateStep1 = (): boolean => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!accountName.trim() || !phoneNumber.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return false;
    }
    if (phoneNumber.trim().length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSignup = async () => {
    if (!validateStep2()) return;

    try {
      const response = await signup({
        username: username.trim(),
        email: email.trim(),
        password,
        account_name: accountName.trim(),
        phone_number: phoneNumber.trim(),
      });
      setSignupResponse(response);
    } catch (err: any) {
      // Error is already set in store
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Success Summary View */}
          {signupResponse ? (
            <View style={styles.summaryContainer}>
              <Ionicons name="checkmark-circle" size={64} color={colors.success} style={{ alignSelf: 'center', marginBottom: spacing.lg }} />
              <Text style={[styles.title, { textAlign: 'center' }]}>Registration Complete!</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: spacing['2xl'] }]}>
                {signupResponse.message || "Your account will be activated shortly."}
              </Text>
              
              <View style={styles.summaryCard}>
                <Text style={styles.fieldLabel}>Account Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Username:</Text>
                <Text style={styles.summaryValue}>{signupResponse.summary?.username}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Business:</Text>
                <Text style={styles.summaryValue}>{signupResponse.summary?.account_name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phone:</Text>
                <Text style={styles.summaryValue}>{signupResponse.summary?.phone_number}</Text>
              </View>
              </View>

              <Button
                title="Go to Sign In"
                onPress={() => navigation.navigate('Login')}
                size="lg"
                style={{ marginTop: spacing['2xl'] }}
              />
            </View>
          ) : (
            <>
              {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={styles.backText}>{step === 2 ? 'Back' : 'Back'}</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? 'Step 1 of 2 — Account details'
                : 'Step 2 of 2 — Business details'}
            </Text>
          </View>

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Ionicons name="close" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          {/* Step 1: Account Details */}
          {step === 1 && (
            <View style={styles.form}>
              <Input
                label="Username"
                placeholder="Choose a username"
                leftIcon="person-outline"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete="username"
              />
              <Input
                label="Email"
                placeholder="Enter your email"
                leftIcon="mail-outline"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Input
                label="Password"
                placeholder="Create a password"
                leftIcon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                isPassword
                hint="At least 8 characters"
              />
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                leftIcon="lock-closed-outline"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
              />

              <Button
                title="Next"
                onPress={handleNext}
                size="lg"
                style={styles.actionBtn}
              />
            </View>
          )}

          {/* Step 2: Business Details */}
          {step === 2 && (
            <View style={styles.form}>
              <Input
                label="Business Name / Account Name"
                placeholder="Enter your business name"
                leftIcon="business-outline"
                value={accountName}
                onChangeText={setAccountName}
                autoCapitalize="words"
              />
              <Input
                label="Phone Number"
                placeholder="10-digit mobile number"
                leftIcon="call-outline"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={15}
              />

              <Button
                title="Create Account"
                onPress={handleSignup}
                size="lg"
                style={styles.actionBtn}
                isLoading={isLoading}
              />
            </View>
          )}

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing['2xl'],
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  backText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 60,
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
  },
  form: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    ...typography.captionMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
});
