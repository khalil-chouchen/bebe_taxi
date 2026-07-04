import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, SPACING } from '../constants';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

let globalShowToast: ((message: string, type?: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  globalShowToast?.(message, type);
}

const COLORS_BY_TYPE: Record<ToastType, string> = {
  info: COLORS.blue,
  success: COLORS.green,
  error: COLORS.red,
  warning: COLORS.primary,
};

function ToastItem({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDismiss(item.id));
  }, []);

  return (
    <Animated.View style={[styles.toast, { opacity, borderLeftColor: COLORS_BY_TYPE[item.type] }]}>
      <Text style={styles.toastText}>{item.message}</Text>
      <TouchableOpacity onPress={() => onDismiss(item.id)} style={styles.closeBtn}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    globalShowToast = (message, type = 'info') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    };
    return () => {
      globalShowToast = null;
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <View style={[styles.container, { top: insets.top + SPACING.md }]}>
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    backgroundColor: COLORS.dark,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  toastText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    flex: 1,
    lineHeight: 20,
  },
  closeBtn: {
    paddingLeft: SPACING.sm,
  },
  closeText: {
    color: COLORS.mediumGray,
    fontSize: FONT_SIZE.sm,
  },
});
