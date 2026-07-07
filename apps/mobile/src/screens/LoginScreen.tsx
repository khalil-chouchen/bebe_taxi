import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONT_SIZE, SPACING } from '../constants';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../components/Toast';
import { connectSocket } from '../services/socket';
import { isValidPhone, normalizePhone } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const { setAuth } = useAuthStore();

  const [mode, setMode] = useState(route.params.mode);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isClient = role === 'client';
  const isLogin = mode === 'login';

  const handleLogin = async () => {
    if (loading) return;

    if (!phone.trim() || !password.trim()) {
      showToast('Veuillez remplir tous les champs', 'warning');
      return;
    }
    if (!isValidPhone(phone)) {
      showToast('Numéro de téléphone invalide', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(normalizePhone(phone), password, role);
      const { token, user } = res.data;
      await setAuth(user, token);
      await connectSocket();
    } catch (err: any) {
      showToast(err.message || 'Connexion échouée', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = async () => {
    if (loading) return;

    if (!phone.trim()) {
      showToast('Entrez votre numéro de téléphone', 'warning');
      return;
    }
    if (!isValidPhone(phone)) {
      showToast('Numéro de téléphone invalide', 'warning');
      return;
    }

    const normalized = normalizePhone(phone);
    setLoading(true);
    try {
      const res = await authApi.sendOtp(normalized);
      if (res.data.devCode) {
        showToast(`[DEV] Code OTP: ${res.data.devCode}`, 'info');
      } else {
        showToast('Code OTP envoyé sur WhatsApp', 'success');
      }
      navigation.navigate('OTPVerification', {
        phone: normalized,
        nextScreen: isClient ? 'ClientRegister' : 'TaxiRegister',
      });
    } catch (err: any) {
      showToast(err.message || 'Erreur envoi OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {isClient ? '🙋 ' : '🚖 '}
            {isLogin
              ? isClient
                ? 'Connexion Client'
                : 'Connexion Chauffeur'
              : isClient
              ? 'Inscription Client'
              : 'Inscription Chauffeur'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Connectez-vous avec votre numéro et mot de passe'
              : 'Vérifiez votre numéro pour commencer'}
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Numéro de téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="+216 XX XXX XXX"
                placeholderTextColor={COLORS.mediumGray}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!loading}
              />
            </View>

            {isLogin && (
              <View style={styles.field}>
                <Text style={styles.label}>Mot de passe</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••"
                  placeholderTextColor={COLORS.mediumGray}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={isLogin ? handleLogin : handleGoToRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.dark} />
              ) : (
                <Text style={styles.btnText}>
                  {isLogin ? 'Se connecter' : 'Continuer'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode(isLogin ? 'register' : 'login')}
              disabled={loading}
              style={styles.switchModeBtn}
            >
              <Text style={styles.switchModeText}>
                {isLogin ? "Pas encore de compte ? " : 'Déjà un compte ? '}
                <Text style={styles.switchModeLink}>
                  {isLogin ? 'Créer un compte' : 'Se connecter'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { padding: SPACING.lg, flexGrow: 1 },
  backBtn: { marginBottom: SPACING.lg },
  backText: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.dark, marginBottom: 6 },
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray, marginBottom: SPACING.xl },
  form: { gap: SPACING.md },
  field: { gap: 6 },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.darkGray },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: FONT_SIZE.md,
    color: COLORS.dark,
    backgroundColor: COLORS.lightGray,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtn: { backgroundColor: COLORS.primary },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  switchModeBtn: { alignItems: 'center', marginTop: SPACING.sm },
  switchModeText: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
  switchModeLink: { color: COLORS.primaryDark, fontWeight: '700' },
});
