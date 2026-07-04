import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONT_SIZE, SPACING } from '../constants';
import { authApi } from '../services/api';
import { showToast } from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'OTPVerification'>;

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { phone, nextScreen } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (code.trim().length < 4) {
      showToast('Entrez le code complet', 'warning');
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyOtp(phone, code.trim());
      showToast('Téléphone vérifié !', 'success');
      navigation.replace(nextScreen as any, { phone });
    } catch (err: any) {
      showToast(err.message || 'Code incorrect', 'error');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const res = await authApi.sendOtp(phone);
      setResendCooldown(60);
      if (res.data.devCode) {
        showToast(`[DEV] Code OTP: ${res.data.devCode}`, 'info');
      } else {
        showToast('Nouveau code envoyé', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Vérification WhatsApp</Text>
          <Text style={styles.subtitle}>
            Un code a été envoyé sur WhatsApp au {'\n'}
            <Text style={styles.phone}>{phone}</Text>
          </Text>

          <TextInput
            ref={inputRef}
            style={styles.codeInput}
            value={code}
            onChangeText={setCode}
            keyboardType="numeric"
            maxLength={6}
            placeholder="• • • • • •"
            placeholderTextColor={COLORS.border}
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.dark} />
            ) : (
              <Text style={styles.btnText}>Vérifier</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCooldown > 0}
            style={styles.resendBtn}
          >
            <Text
              style={[
                styles.resendText,
                resendCooldown > 0 && styles.resendDisabled,
              ]}
            >
              {resendCooldown > 0
                ? `Renvoyer dans ${resendCooldown}s`
                : 'Renvoyer le code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, padding: SPACING.lg },
  backBtn: { marginBottom: SPACING.xl },
  backText: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.dark, marginBottom: 8 },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.mediumGray,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  phone: { color: COLORS.dark, fontWeight: '700' },
  codeInput: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.lg,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.dark,
    letterSpacing: 12,
    marginBottom: SPACING.lg,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  resendBtn: { alignItems: 'center', marginTop: SPACING.lg },
  resendText: { fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: '600' },
  resendDisabled: { color: COLORS.mediumGray },
});
