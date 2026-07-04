import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TaxiStackParamList } from '../../types';
import { COLORS, FONT_SIZE, SPACING } from '../../constants';
import { useAuthStore } from '../../store/authStore';
import { disconnectSocket } from '../../services/socket';
import { showToast } from '../../components/Toast';

type Props = NativeStackScreenProps<TaxiStackParamList, 'TaxiProfile'>;

export default function TaxiProfileScreen({ navigation }: Props) {
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          disconnectSocket();
          await clearAuth();
          showToast('Déconnecté', 'info');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mon profil</Text>
      </View>

      <View style={styles.content}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarEmoji}>🚖</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>

        <View style={styles.infoCard}>
          {[
            ['Email', user?.email || '—'],
            ['Téléphone', user?.phone || '—'],
            ['Rôle', 'Chauffeur de taxi'],
            ['Statut', user?.isPhoneVerified ? '✅ Vérifié' : '❌ Non vérifié'],
          ].map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray, marginBottom: 4 },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.dark },
  content: { padding: SPACING.lg, alignItems: 'center', gap: SPACING.md },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: COLORS.primary },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 44 },
  name: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.dark },
  phone: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
  infoCard: {
    width: '100%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
  infoValue: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.dark },
  logoutBtn: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1.5,
    borderColor: COLORS.red,
  },
  logoutText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.red },
});
