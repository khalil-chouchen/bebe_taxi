import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '../constants';

interface Props {
  onBack?: () => void;
}

export default function WebMapNotice({ onBack }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={styles.title}>Map not available on web</Text>
        <Text style={styles.body}>
          Open Bebe Taxi in the Expo Go app on your phone to see the live map.
        </Text>
        {onBack && (
          <TouchableOpacity style={styles.button} onPress={onBack} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Go back</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.xl,
  },
  emoji: { fontSize: 48, marginBottom: SPACING.md },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  body: {
    fontSize: FONT_SIZE.md,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
