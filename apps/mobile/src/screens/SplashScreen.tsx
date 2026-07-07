import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONT_SIZE } from '../constants';

/**
 * Branded loading gate shown while the app restores/verifies the stored
 * session on launch. Not a navigable screen — rendered directly by
 * RootNavigator, so it never re-triggers its animation on remount.
 */
export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.emoji}>🚖</Text>
        <Text style={styles.title}>Bebe Taxi</Text>
        <Text style={styles.subtitle}>Votre taxi en un clic</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 80,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
});
