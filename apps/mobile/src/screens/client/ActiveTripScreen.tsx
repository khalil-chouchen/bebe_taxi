import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ClientStackParamList } from '../../types';
import { COLORS, FONT_SIZE, SPACING } from '../../constants';
import { tripApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import { openWhatsApp } from '../../utils/whatsapp';
import { formatDistance, formatEta, haversineDistanceKm } from '../../utils/haversine';
import RoutePolyline from '../../components/RoutePolyline';
import LoadingSpinner from '../../components/LoadingSpinner';

type Props = NativeStackScreenProps<ClientStackParamList, 'ActiveTrip'>;

interface TaxiLocation {
  latitude: number;
  longitude: number;
}

export default function ActiveTripScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const mapRef = useRef<MapView>(null);

  const [clientLocation, setClientLocation] = useState<TaxiLocation | null>(null);
  const [taxiLocation, setTaxiLocation] = useState<TaxiLocation | null>(null);
  const [taxiInfo, setTaxiInfo] = useState<any>(null);
  const [tripStatus, setTripStatus] = useState<string>('accepted');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrip();

    const socket = getSocket();
    if (socket) {
      socket.on('trip:locationUpdate', (data: { latitude: number; longitude: number; role: string }) => {
        if (data.role === 'taxi') {
          setTaxiLocation({ latitude: data.latitude, longitude: data.longitude });
        }
      });

      socket.on('trip:arrived', () => {
        setTripStatus('arrived');
        showToast('Votre taxi est arrivé !', 'success');
        Alert.alert('Taxi Arrivé!', 'Votre taxi vous attend. Bonne route !');
      });

      socket.on('trip:completed', () => {
        setTripStatus('completed');
        navigation.replace('Review', { tripId, taxiId: taxiInfo?.userId || '' });
      });
    }

    return () => {
      socket?.off('trip:locationUpdate');
      socket?.off('trip:arrived');
      socket?.off('trip:completed');
    };
  }, []);

  const loadTrip = async () => {
    try {
      const res = await tripApi.getCurrentTrip();
      if (res.data.trip) {
        setTripStatus(res.data.trip.status);
        setTaxiInfo(res.data.otherParty);
        if (res.data.otherParty) {
          setTaxiLocation({
            latitude: res.data.otherParty.latitude,
            longitude: res.data.otherParty.longitude,
          });
        }
        const [clientLng, clientLat] = res.data.trip.startLocation?.coordinates ?? [0, 0];
        setClientLocation({ latitude: clientLat, longitude: clientLng });
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTrip = () => {
    Alert.alert(
      'Terminer le trajet',
      'Confirmez-vous la fin du trajet ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const socket = getSocket();
            socket?.emit('client:completeTrip');
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement du trajet..." />;
  }

  const distance =
    taxiLocation && clientLocation
      ? haversineDistanceKm(
          taxiLocation.latitude, taxiLocation.longitude,
          clientLocation.latitude, clientLocation.longitude
        )
      : null;

  const region: Region | undefined =
    clientLocation
      ? {
          latitude: clientLocation.latitude,
          longitude: clientLocation.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }
      : undefined;

  return (
    <View style={styles.container}>
      {region && (
        <MapView ref={mapRef} style={styles.map} region={region} showsUserLocation>
          {taxiLocation && (
            <Marker coordinate={taxiLocation} identifier="taxi">
              <View style={styles.taxiIcon}>
                <Text style={{ fontSize: 28 }}>🚖</Text>
              </View>
            </Marker>
          )}
          {clientLocation && taxiLocation && (
            <RoutePolyline origin={taxiLocation} destination={clientLocation} />
          )}
        </MapView>
      )}

      {/* Status banner */}
      <SafeAreaView style={styles.topOverlay}>
        <View style={styles.statusBanner}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: tripStatus === 'arrived' ? COLORS.green : COLORS.primary },
            ]}
          />
          <Text style={styles.statusText}>
            {tripStatus === 'arrived'
              ? 'Taxi arrivé !'
              : tripStatus === 'arriving'
              ? 'Taxi en approche'
              : 'Taxi en route vers vous'}
          </Text>
        </View>
      </SafeAreaView>

      {/* Taxi info card */}
      <SafeAreaView style={styles.bottomOverlay}>
        <View style={styles.card}>
          {taxiInfo && (
            <View style={styles.driverRow}>
              {taxiInfo.avatarUrl ? (
                <Image source={{ uri: taxiInfo.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={{ fontSize: 24 }}>👤</Text>
                </View>
              )}
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{taxiInfo.fullName}</Text>
                <Text style={styles.taxiDetail}>
                  🚖 {taxiInfo.taxiNumber} · {taxiInfo.matricule}
                </Text>
                {distance !== null && (
                  <Text style={styles.distance}>
                    {formatDistance(distance)} · {formatEta(Math.ceil((distance / 30) * 60))}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.waBtn}
                onPress={() => openWhatsApp(taxiInfo.phone, 'Bebe Taxi — je vous attends')}
              >
                <Text style={styles.waBtnText}>📞 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}

          {tripStatus === 'arrived' && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={handleCompleteTrip}
              activeOpacity={0.85}
            >
              <Text style={styles.completeBtnText}>Terminer le trajet</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: StyleSheet.absoluteFillObject,
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  statusBanner: {
    margin: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.dark },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  card: {
    margin: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.md,
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: { flex: 1, gap: 2 },
  driverName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.dark },
  taxiDetail: { fontSize: FONT_SIZE.sm, color: COLORS.mediumGray },
  distance: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  waBtn: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  waBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.white },
  completeBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  completeBtnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.white },
  taxiIcon: { alignItems: 'center' },
});
