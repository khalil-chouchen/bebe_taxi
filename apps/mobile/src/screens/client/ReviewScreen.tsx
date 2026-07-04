import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ClientStackParamList } from '../../types';
import { COLORS, FONT_SIZE, SPACING } from '../../constants';
import { clientApi } from '../../services/api';
import { showToast } from '../../components/Toast';

type Props = NativeStackScreenProps<ClientStackParamList, 'Review'>;

export default function ReviewScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast('Choisissez une note', 'warning');
      return;
    }

    setLoading(true);
    try {
      await clientApi.submitReview(tripId, rating, comment.trim() || undefined);
      setSubmitted(true);
      showToast('Merci pour votre avis !', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.success}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Merci !</Text>
          <Text style={styles.successText}>
            Votre avis aide les autres clients à choisir le meilleur taxi.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.navigate('ClientHomeMap')}
          >
            <Text style={styles.btnText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Votre avis</Text>
        <Text style={styles.subtitle}>Comment était votre expérience ?</Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}
            >
              <Text style={[styles.star, star <= rating && styles.starActive]}>
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ratingLabel}>
          {rating === 0
            ? 'Touchez une étoile'
            : rating === 1
            ? 'Très mauvais'
            : rating === 2
            ? 'Mauvais'
            : rating === 3
            ? 'Correct'
            : rating === 4
            ? 'Bien'
            : 'Excellent !'}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Commentaire (optionnel)</Text>
          <TextInput
            style={styles.textarea}
            value={comment}
            onChangeText={setComment}
            placeholder="Partagez votre expérience..."
            placeholderTextColor={COLORS.mediumGray}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, (!rating || loading) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!rating || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.dark} />
          ) : (
            <Text style={styles.btnText}>Envoyer l'avis</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.navigate('ClientHomeMap')}
        >
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { padding: SPACING.lg, gap: SPACING.md },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.dark },
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  star: { fontSize: 44, color: COLORS.border },
  starActive: { color: COLORS.primary },
  ratingLabel: {
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: SPACING.sm,
  },
  field: { gap: 6 },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.darkGray },
  textarea: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.dark,
    backgroundColor: COLORS.lightGray,
    minHeight: 100,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  skipBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  skipText: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
  success: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: FONT_SIZE.xxxl, fontWeight: '800', color: COLORS.dark },
  successText: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray, textAlign: 'center', lineHeight: 22 },
});
