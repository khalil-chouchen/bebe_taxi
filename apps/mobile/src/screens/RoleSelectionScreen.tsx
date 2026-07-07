import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONT_SIZE, SPACING } from '../constants';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelection'>;

export default function RoleSelectionScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const isRegister = mode === 'register';

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.emoji}>🚖</Text>
        <Text style={styles.title}>Bebe Taxi</Text>
        <Text style={styles.subtitle}>
          {isRegister ? 'Créer un compte en tant que' : 'Se connecter en tant que'}
        </Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={[styles.card, styles.clientCard]}
          onPress={() => navigation.navigate('Login', { role: 'client', mode })}
          activeOpacity={0.85}
        >
          <Text style={styles.cardEmoji}>🙋</Text>
          <Text style={styles.cardTitle}>Je suis Client</Text>
          <Text style={styles.cardDesc}>
            Cherchez un taxi rapidement et suivez-le en temps réel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.taxiCard]}
          onPress={() => navigation.navigate('Login', { role: 'taxi', mode })}
          activeOpacity={0.85}
        >
          <Text style={styles.cardEmoji}>🚖</Text>
          <Text style={styles.cardTitle}>Je suis Chauffeur</Text>
          <Text style={styles.cardDesc}>
            Recevez des demandes de clients et gérez vos trajets
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
  },
  backBtn: { marginTop: SPACING.md },
  backText: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: 6,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '800',
    color: COLORS.dark,
  },
  subtitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.mediumGray,
  },
  cards: {
    gap: SPACING.md,
  },
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  clientCard: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  taxiCard: {
    backgroundColor: COLORS.primary,
  },
  cardEmoji: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.dark,
  },
  cardDesc: {
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
    lineHeight: 22,
  },
});
