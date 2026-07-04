import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ClientStackParamList, TaxiOffer } from '../../types';
import { COLORS, FONT_SIZE, SPACING } from '../../constants';
import { clientApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import { formatDistance, formatEta } from '../../utils/haversine';

type Props = NativeStackScreenProps<ClientStackParamList, 'TaxiOffers'>;

export default function TaxiOffersScreen({ navigation, route }: Props) {
  const { requestId } = route.params;
  const [offers, setOffers] = useState<TaxiOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    try {
      const res = await clientApi.getOffers(requestId);
      setOffers(res.data.offers || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchOffers();

    const socket = getSocket();
    if (socket) {
      socket.on('offer:new', (data: any) => {
        setOffers((prev) => {
          const exists = prev.find((o) => o._id === data.offer._id);
          if (exists) return prev;
          return [{ ...data.offer, taxi: data.taxi }, ...prev];
        });
        showToast(`Nouvelle offre de ${data.taxi?.fullName}`, 'success');
      });

      socket.on('trip:started', (data: any) => {
        navigation.replace('ActiveTrip', { tripId: data.trip._id });
      });
    }

    const poll = setInterval(fetchOffers, 5000);
    return () => {
      clearInterval(poll);
      socket?.off('offer:new');
      socket?.off('trip:started');
    };
  }, [requestId]);

  const handleAccept = async (offer: TaxiOffer) => {
    setAcceptingId(offer._id);
    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('client:acceptOffer', { offerId: offer._id, requestId });
      } else {
        await clientApi.acceptOffer(offer._id, requestId);
      }
      showToast('Taxi accepté ! En route...', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur', 'error');
      setAcceptingId(null);
    }
  };

  const renderOffer = ({ item }: { item: TaxiOffer }) => {
    const isAccepting = acceptingId === item._id;
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          {item.taxi?.avatarUrl ? (
            <Image source={{ uri: item.taxi.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          )}
        </View>

        <View style={styles.cardCenter}>
          <Text style={styles.driverName}>{item.taxi?.fullName || 'Chauffeur'}</Text>
          <Text style={styles.taxiInfo}>
            🚖 {item.taxi?.taxiNumber} · {item.taxi?.matricule}
          </Text>
          {(item.taxi?.averageRating ?? 0) > 0 && (
            <Text style={styles.rating}>
              ⭐ {item.taxi?.averageRating?.toFixed(1)} ({item.taxi?.totalReviews} avis)
            </Text>
          )}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDistance(item.distanceKm)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatEta(item.etaMinutes)}</Text>
              <Text style={styles.statLabel}>Temps estimé</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.acceptBtn, isAccepting && styles.btnDisabled]}
          onPress={() => handleAccept(item)}
          disabled={!!acceptingId}
          activeOpacity={0.85}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={COLORS.dark} />
          ) : (
            <Text style={styles.acceptText}>Choisir</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Offres de taxis</Text>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>Chargement des offres...</Text>
        </View>
      ) : offers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⏳</Text>
          <Text style={styles.emptyTitle}>En attente de taxis...</Text>
          <Text style={styles.emptyText}>
            Les chauffeurs disponibles verront votre demande et vous enverront des offres.
          </Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(o) => o._id}
          renderItem={renderOffer}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchOffers} tintColor={COLORS.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 4,
  },
  back: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.dark },
  list: { padding: SPACING.md, gap: SPACING.md },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeft: {},
  cardCenter: { flex: 1, gap: 3 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  driverName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.dark },
  taxiInfo: { fontSize: FONT_SIZE.sm, color: COLORS.mediumGray },
  rating: { fontSize: FONT_SIZE.sm, color: COLORS.darkGray },
  statsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: 4 },
  stat: { gap: 1 },
  statValue: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.primary },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.mediumGray },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    minWidth: 72,
    minHeight: 40,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  acceptText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.dark },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.dark, textAlign: 'center' },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray, textAlign: 'center', lineHeight: 22 },
});
