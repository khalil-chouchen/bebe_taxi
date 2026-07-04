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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS, FONT_SIZE, SPACING } from '../../constants';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../components/Toast';
import { connectSocket } from '../../services/socket';

type Props = NativeStackScreenProps<RootStackParamList, 'TaxiRegister'>;

export default function TaxiRegisterScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const { setAuth } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [taxiNumber, setTaxiNumber] = useState('');
  const [matricule, setMatricule] = useState('');
  const [avatarBase64, setAvatarBase64] = useState<string | undefined>();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permission galerie requise', 'warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      if (asset.base64) {
        const ext = asset.uri.split('.').pop() || 'jpg';
        setAvatarBase64(`data:image/${ext};base64,${asset.base64}`);
      }
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !taxiNumber.trim() || !matricule.trim()) {
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
      const res = await authApi.registerTaxi({
        fullName: fullName.trim(),
        phone,
        email: email.trim(),
        password,
        taxiNumber: taxiNumber.trim(),
        matricule: matricule.trim(),
        avatarBase64,
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

          <Text style={styles.title}>🚖 Devenir Chauffeur</Text>
          <Text style={styles.subtitle}>Téléphone vérifié : {phone}</Text>

          {/* Avatar picker */}
          <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarIcon}>📷</Text>
                <Text style={styles.avatarText}>Photo de profil</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.form}>
            {([
              ['Nom complet', fullName, setFullName, false, 'words', 'Votre nom complet'],
              ['Email', email, setEmail, false, 'none', 'votre@email.com'],
              ['Numéro de taxi', taxiNumber, setTaxiNumber, false, 'characters', 'TN-XXX'],
              ['Matricule / Immatriculation', matricule, setMatricule, false, 'characters', '123 TUN 456'],
              ['Mot de passe', password, setPassword, true, 'none', 'Minimum 6 caractères'],
              ['Confirmer mot de passe', confirmPassword, setConfirmPassword, true, 'none', '••••••'],
            ] as const).map(([label, value, setter, secure, autoCapitalize, placeholder]) => (
              <View key={label} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={value as string}
                  onChangeText={setter as any}
                  secureTextEntry={secure as boolean}
                  placeholder={placeholder as string}
                  placeholderTextColor={COLORS.mediumGray}
                  autoCapitalize={autoCapitalize as any}
                  keyboardType={
                    label === 'Email' ? 'email-address' : 'default'
                  }
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
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.green, marginBottom: SPACING.lg, fontWeight: '600' },
  avatarPicker: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.lightGray,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  avatarIcon: { fontSize: 28 },
  avatarText: { fontSize: FONT_SIZE.xs, color: COLORS.mediumGray },
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
