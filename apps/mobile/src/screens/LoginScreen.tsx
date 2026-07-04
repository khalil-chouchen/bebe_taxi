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

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const { setAuth } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isClient = role === 'client';

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      showToast('Veuillez remplir tous les champs', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(phone.trim(), password, role);
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
    if (!phone.trim()) {
      showToast('Entrez votre numéro de téléphone', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.sendOtp(phone.trim());
      if (res.data.devCode) {
        showToast(`[DEV] Code OTP: ${res.data.devCode}`, 'info');
      } else {
        showToast('Code OTP envoyé sur WhatsApp', 'success');
      }
      navigation.navigate('OTPVerification', {
        phone: phone.trim(),
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
            {isClient ? '🙋 Connexion Client' : '🚖 Connexion Chauffeur'}
          </Text>
          <Text style={styles.subtitle}>
            Connectez-vous ou créez un compte
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
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••"
                placeholderTextColor={COLORS.mediumGray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.loginBtn]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.btnText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.registerBtn]}
              onPress={handleGoToRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, { color: COLORS.dark }]}>
                Créer un compte
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
  loginBtn: { backgroundColor: COLORS.primary },
  registerBtn: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONT_SIZE.sm, color: COLORS.mediumGray },
});
