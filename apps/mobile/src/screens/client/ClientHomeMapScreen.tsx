import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ClientStackParamList, TaxiMapMarker } from '../../types';
import { COLORS, FONT_SIZE, SPACING, DEFAULT_REGION } from '../../constants';
import { LOCATION_UPDATE_INTERVAL_MS } from '@bebe-taxi/shared';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from '../../hooks/useLocation';
import { clientApi } from '../../services/api';
import { connectSocket, getSocket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import TaxiMarker from '../../components/TaxiMarker';
import LoadingSpinner from '../../components/LoadingSpinner';

type Props = NativeStackScreenProps<ClientStackParamList, 'ClientHomeMap'>;

export default function ClientHomeMapScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const mapRef = useRef<MapView>(null);

  const [availableTaxis, setAvailableTaxis] = useState<TaxiMapMarker[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [loadingTaxis, setLoadingTaxis] = useState(true);

  // Ref so socket callbacks always see the latest requestId without stale closure
  const activeRequestIdRef = useRef<string | null>(null);

  const setActiveRequest = (id: string | null) => {
    activeRequestIdRef.current = id;
    setActiveRequestId(id);
  };

  const { location, startTracking } = useLocation({
    onUpdate: async (coords) => {
      try {
        await clientApi.updateLocation(coords.latitude, coords.longitude);
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('client:updateLocation', coords);
        }
      } catch {}
    },
  });

  const fetchTaxis = useCallback(async () => {
    try {
      const res = await clientApi.getAvailableTaxis();
      setAvailableTaxis(res.data.taxis || []);
    } catch {
      // silent fail
    } finally {
      setLoadingTaxis(false);
    }
  }, []);

  useEffect(() => {
    startTracking();
    fetchTaxis();

    const taxiPollInterval = setInterval(fetchTaxis, 8000);

    const setupSocket = async () => {
      const socket = await connectSocket();

      // Single offer:new handler — uses ref so it always has the current requestId
      socket.on('offer:new', (data: any) => {
        const currentId = activeRequestIdRef.current;
        if (currentId) {
          showToast(`Nouvelle offre de ${data.taxi?.fullName}`, 'success');
          navigation.navigate('TaxiOffers', { requestId: currentId });
        }
      });

      socket.on('trip:started', (data: any) => {
        showToast('Votre taxi est en route !', 'success');
        navigation.navigate('ActiveTrip', { tripId: data.trip._id });
      });
    };

    setupSocket();

    return () => {
      clearInterval(taxiPollInterval);
      const socket = getSocket();
      if (socket) {
        socket.off('offer:new');
        socket.off('trip:started');
      }
    };
  }, []);

  const handleSearchTaxi = async () => {
    if (activeRequestId) {
      navigation.navigate('TaxiOffers', { requestId: activeRequestId });
      return;
    }

    if (!location) {
      showToast('Localisation non disponible', 'warning');
      return;
    }

    setIsRequesting(true);
    try {
      await clientApi.updateLocation(location.latitude, location.longitude);
      const res = await clientApi.requestTaxi();
      const requestId = res.data.request._id;
      setActiveRequest(requestId);
      showToast('Recherche de taxi en cours...', 'info');
    } catch (err: any) {
      if (err.message?.includes('already have')) {
        showToast('Vous avez déjà une demande active', 'warning');
      } else {
        showToast(err.message || 'Erreur', 'error');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequestId) return;
    try {
      const socket = getSocket();
      socket?.emit('client:cancelRequest', { requestId: activeRequestId });
      setActiveRequest(null);
      showToast('Demande annulée', 'info');
    } catch {}
  };

  if (!location && loadingTaxis) {
    return <LoadingSpinner fullScreen message="Récupération de votre position..." />;
  }

  const region: Region = location
    ? { ...location, latitudeDelta: 0.03, longitudeDelta: 0.03 }
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        showsUserLocation
        showsMyLocationButton
        userInterfaceStyle="light"
      >
        {availableTaxis.map((taxi) => (
          <TaxiMarker
            key={taxi.taxiId}
            taxiId={taxi.taxiId}
            latitude={taxi.latitude}
            longitude={taxi.longitude}
            label={taxi.fullName.split(' ')[0]}
          />
        ))}
      </MapView>

      {/* Header */}
      <SafeAreaView style={styles.headerWrapper}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour, {user?.fullName?.split(' ')[0]} 👋</Text>
            <Text style={styles.taxiCount}>
              {availableTaxis.length} taxi{availableTaxis.length !== 1 ? 's' : ''} disponible
              {availableTaxis.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('ClientProfile')}
          >
            <Text style={styles.profileEmoji}>👤</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom action */}
      <SafeAreaView style={styles.bottomWrapper}>
        <View style={styles.bottomCard}>
          {activeRequestId ? (
            <View style={styles.activeRequest}>
              <View style={styles.pulseRow}>
                <View style={styles.pulse} />
                <Text style={styles.activeText}>Recherche en cours...</Text>
              </View>
              <View style={styles.activeButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.offersBtn]}
                  onPress={() =>
                    navigation.navigate('TaxiOffers', { requestId: activeRequestId })
                  }
                >
                  <Text style={styles.btnText}>Voir les offres</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={handleCancelRequest}
                >
                  <Text style={[styles.btnText, { color: COLORS.red }]}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.searchBtn, isRequesting && styles.btnDisabled]}
              onPress={handleSearchTaxi}
              disabled={isRequesting}
              activeOpacity={0.85}
            >
              {isRequesting ? (
                <ActivityIndicator color={COLORS.dark} />
              ) : (
                <>
                  <Text style={styles.searchEmoji}>🔍</Text>
                  <Text style={styles.btnText}>Chercher Taxi</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  headerWrapper: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    margin: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  greeting: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  taxiCount: { fontSize: FONT_SIZE.sm, color: COLORS.mediumGray, marginTop: 2 },
  profileBtn: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEmoji: { fontSize: 22 },
  bottomWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    flexDirection: 'row',
    gap: 8,
  },
  searchBtn: { backgroundColor: COLORS.primary },
  offersBtn: { flex: 1, backgroundColor: COLORS.primary },
  cancelBtn: {
    flex: 0,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  searchEmoji: { fontSize: 20 },
  activeRequest: { gap: SPACING.sm },
  pulseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.green,
  },
  activeText: { fontSize: FONT_SIZE.md, color: COLORS.dark, fontWeight: '600' },
  activeButtons: { flexDirection: 'row', gap: SPACING.sm },
});
