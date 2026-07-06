import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TaxiStackParamList } from '../../types';
import { COLORS, FONT_SIZE, SPACING } from '../../constants';
import { tripApi, taxiApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import { openWhatsApp } from '../../utils/whatsapp';
import { formatDistance, haversineDistanceKm } from '../../utils/haversine';
import RoutePolyline from '../../components/RoutePolyline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLocation } from '../../hooks/useLocation';

type Props = NativeStackScreenProps<TaxiStackParamList, 'ActivePickup'>;

interface LatLng { latitude: number; longitude: number; }

export default function ActivePickupScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const mapRef = useRef<MapView>(null);

  const [clientLocation, setClientLocation] = useState<LatLng | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [tripStatus, setTripStatus] = useState<string>('accepted');
  const [loading, setLoading] = useState(true);

  const { location: taxiLocation, startTracking } = useLocation({
    onUpdate: async (coords) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('taxi:updateLocation', coords);
      } else {
        taxiApi.updateLocation(coords.latitude, coords.longitude).catch(() => {});
      }
    },
  });

  useEffect(() => {
    loadTrip();
    startTracking();

    const socket = getSocket();
    if (socket) {
      socket.on('trip:locationUpdate', (data: any) => {
        if (data.role === 'client') {
          setClientLocation({ latitude: data.latitude, longitude: data.longitude });
        }
      });

      socket.on('trip:completed', () => {
        setTripStatus('completed');
        navigation.navigate('TaxiHomeMap');
      });
    }

    return () => {
      socket?.off('trip:locationUpdate');
      socket?.off('trip:completed');
    };
  }, []);

  const loadTrip = async () => {
    try {
      const res = await tripApi.getCurrentTrip();
      if (res.data.trip) {
        setTripStatus(res.data.trip.status);
        setClientInfo(res.data.otherParty);
        if (res.data.otherParty) {
          setClientLocation({
            latitude: res.data.otherParty.latitude,
            longitude: res.data.otherParty.longitude,
          });
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkArrived = async () => {
    try {
      await taxiApi.markArrived();
      setTripStatus('arrived');
      showToast('Arrivée confirmée — le client est notifié', 'success');
      const socket = getSocket();
      socket?.emit('taxi:arrived');
    } catch (err: any) {
      showToast(err.message || 'Erreur', 'error');
    }
  };

  const handleCompleteTrip = async () => {
    Alert.alert('Terminer le trajet', 'Confirmez la fin du trajet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          try {
            await taxiApi.completeTrip();
            showToast('Trajet terminé !', 'success');
            navigation.navigate('TaxiHomeMap');
          } catch (err: any) {
            showToast(err.message || 'Erreur', 'error');
          }
        },
      },
    ]);
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

  const region: Region | undefined = taxiLocation
    ? {
        latitude: taxiLocation.latitude,
        longitude: taxiLocation.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }
    : undefined;

  return (
    <View style={styles.container}>
      {region && (
        <MapView ref={mapRef} style={styles.map} region={region} showsUserLocation>
          {clientLocation && (
            <Marker coordinate={clientLocation} identifier="client">
              <View style={styles.clientIcon}>
                <Text style={{ fontSize: 28 }}>🙋</Text>
              </View>
            </Marker>
          )}
          {taxiLocation && clientLocation && (
            <RoutePolyline origin={taxiLocation} destination={clientLocation} />
          )}
        </MapView>
      )}

      {/* Status */}
      <SafeAreaView style={styles.topOverlay}>
        <View style={styles.statusBanner}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: tripStatus === 'arrived' ? COLORS.green : COLORS.primary },
            ]}
          />
          <Text style={styles.statusText}>
            {tripStatus === 'arrived' ? 'Arrivé chez le client' : 'En route vers le client'}
          </Text>
        </View>
      </SafeAreaView>

      {/* Bottom card */}
      <SafeAreaView style={styles.bottomOverlay}>
        <View style={styles.card}>
          {clientInfo && (
            <View style={styles.clientRow}>
              <View style={styles.clientIconBox}>
                <Text style={{ fontSize: 24 }}>🙋</Text>
              </View>
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>{clientInfo.fullName}</Text>
                {distance !== null && (
                  <Text style={styles.distance}>{formatDistance(distance)}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.waBtn}
                onPress={() => openWhatsApp(clientInfo.phone, 'Bebe Taxi — j\'arrive!')}
              >
                <Text style={styles.waBtnText}>📞 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}

          {tripStatus === 'accepted' || tripStatus === 'arriving' ? (
            <TouchableOpacity
              style={styles.arrivedBtn}
              onPress={handleMarkArrived}
              activeOpacity={0.85}
            >
              <Text style={styles.arrivedBtnText}>Je suis arrivé !</Text>
            </TouchableOpacity>
          ) : (
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
  map: StyleSheet.absoluteFill,
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
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  clientIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientDetails: { flex: 1, gap: 2 },
  clientName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.dark },
  distance: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  waBtn: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  waBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.white },
  arrivedBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  arrivedBtnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  completeBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  completeBtnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.white },
  clientIcon: { alignItems: 'center' },
});
