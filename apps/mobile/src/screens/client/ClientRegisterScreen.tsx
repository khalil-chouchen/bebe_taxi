import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS, FONT_SIZE, SPACING } from '../../constants';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../components/Toast';
import { connectSocket } from '../../services/socket';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientRegister'>;

export default function ClientRegisterScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const { setAuth } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      showToast('Veuillez remplir tous les champs', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Minimum 6 caractères pour le mot de passe', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.registerClient({
        fullName: fullName.trim(),
        phone,
        email: email.trim(),
        password,
      });
      const { token, user } = res.data;
      await setAuth(user, token);
      await connectSocket();
      showToast('Compte créé avec succès !', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur inscription', 'error');
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          <Text style={styles.title}>🙋 Créer mon compte</Text>
          <Text style={styles.subtitle}>Téléphone vérifié : {phone}</Text>

          <View style={styles.form}>
            {([
              ['Nom complet', fullName, setFullName, 'default', false, 'Votre nom complet'],
              ['Email', email, setEmail, 'email-address', false, 'votre@email.com'],
              ['Mot de passe', password, setPassword, 'default', true, 'Minimum 6 caractères'],
              ['Confirmer mot de passe', confirmPassword, setConfirmPassword, 'default', true, '••••••'],
            ] as const).map(([label, value, setter, keyboardType, secure, placeholder]) => (
              <View key={label} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={value as string}
                  onChangeText={setter as any}
                  keyboardType={keyboardType as any}
                  secureTextEntry={secure as boolean}
                  placeholder={placeholder as string}
                  placeholderTextColor={COLORS.mediumGray}
                  autoCapitalize={label === 'Email' ? 'none' : 'words'}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.dark} />
              ) : (
                <Text style={styles.btnText}>Créer mon compte</Text>
              )}
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
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.green, marginBottom: SPACING.xl, fontWeight: '600' },
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
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
});
