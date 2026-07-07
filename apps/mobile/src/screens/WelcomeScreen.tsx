import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONT_SIZE, SPACING } from '../constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const FEATURES = [
  { icon: '🚕', text: 'Réservez un taxi facilement' },
  { icon: '📍', text: 'Les chauffeurs reçoivent les demandes à proximité' },
  { icon: '⚡', text: 'Rapide, sûr, simple' },
];

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🚖</Text>
        <Text style={styles.title}>Bebe Taxi</Text>
        <Text style={styles.slogan}>Votre taxi en un clic</Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => navigation.navigate('RoleSelection', { mode: 'register' })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Créer un compte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => navigation.navigate('RoleSelection', { mode: 'login' })}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Se connecter</Text>
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
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    gap: 6,
  },
  emoji: { fontSize: 72 },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  slogan: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.mediumGray,
    fontWeight: '500',
  },
  features: {
    gap: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: SPACING.md,
  },
  featureIcon: { fontSize: 26 },
  featureText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
    fontWeight: '500',
    lineHeight: 20,
  },
  actions: {
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryBtn: { backgroundColor: COLORS.primary },
  primaryBtnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  secondaryBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  secondaryBtnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
});
