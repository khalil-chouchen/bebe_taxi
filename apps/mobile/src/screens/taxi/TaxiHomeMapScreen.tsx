import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TaxiStackParamList, ClientMapMarker } from '../../types';
import { COLORS, FONT_SIZE, SPACING, DEFAULT_REGION } from '../../constants';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from '../../hooks/useLocation';
import { taxiApi } from '../../services/api';
import { connectSocket, getSocket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import ClientMarker from '../../components/ClientMarker';
import BottomSheet from '../../components/BottomSheet';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDistance, formatEta, haversineDistanceKm } from '../../utils/haversine';
import RoutePolyline from '../../components/RoutePolyline';
import { MAP_PROVIDER } from '../../config/maps';

type Props = NativeStackScreenProps<TaxiStackParamList, 'TaxiHomeMap'>;

export default function TaxiHomeMapScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const mapRef = useRef<MapView>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [clientRequests, setClientRequests] = useState<ClientMapMarker[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ClientMapMarker | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const { location, startTracking, error } = useLocation({
    onUpdate: async (coords) => {
      setMyLocation(coords);
      if (isOnline) {
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('taxi:updateLocation', coords);
        } else {
          taxiApi.updateLocation(coords.latitude, coords.longitude).catch(() => {});
        }
      }
    },
  });

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error]);

  const fetchRequests = useCallback(async () => {
    if (!isOnline) return;
    try {
      const res = await taxiApi.getActiveRequests();
      setClientRequests(
        res.data.requests.map((r: any) => ({
          requestId: r.requestId,
          clientId: r.clientId,
          clientName: r.clientName,
          latitude: r.latitude,
          longitude: r.longitude,
          destinationLocation: r.destinationLocation,
          expiresAt: r.expiresAt,
        }))
      );
    } catch {}
  }, [isOnline]);

  useEffect(() => {
    startTracking();

    const setupSocket = async () => {
      const socket = await connectSocket();

      socket.on('request:new', (data: any) => {
        if (!isOnline) return;
        setClientRequests((prev) => {
          if (prev.find((r) => r.requestId === data.requestId)) return prev;
          return [
            ...prev,
            {
              requestId: data.requestId,
              clientId: data.clientId,
              clientName: data.clientName,
              latitude: data.latitude,
              longitude: data.longitude,
              destinationLocation: data.destinationLocation,
              expiresAt: data.expiresAt,
            },
          ];
        });
        showToast(`Nouveau client: ${data.clientName}`, 'info');
      });

      socket.on('request:cancelled', (data: any) => {
        setClientRequests((prev) =>
          prev.filter((r) => r.requestId !== data.requestId)
        );
        if (selectedRequest?.requestId === data.requestId) {
          setSheetVisible(false);
          setSelectedRequest(null);
        }
      });

      socket.on('offer:accepted', (data: any) => {
        showToast('Le client a accepté votre offre !', 'success');
        navigation.navigate('ActivePickup', { tripId: data.trip._id });
      });

      socket.on('offer:rejected', () => {
        showToast('Le client a choisi un autre taxi', 'info');
      });
    };

    setupSocket();

    return () => {
      const socket = getSocket();
      socket?.off('request:new');
      socket?.off('request:cancelled');
      socket?.off('offer:accepted');
      socket?.off('offer:rejected');
    };
  }, []);

  useEffect(() => {
    if (isOnline) fetchRequests();
    const interval = setInterval(() => {
      if (isOnline) fetchRequests();
    }, 8000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const toggleOnline = async (value: boolean) => {
    try {
      await taxiApi.setOnlineStatus(value);
      setIsOnline(value);
      const socket = getSocket();
      if (value) {
        socket?.emit('taxi:goOnline');
        showToast('Vous êtes en ligne', 'success');
        fetchRequests();
      } else {
        socket?.emit('taxi:goOffline');
        setClientRequests([]);
        showToast('Vous êtes hors ligne', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur', 'error');
    }
  };

  const handleClientPress = (request: ClientMapMarker) => {
    setSelectedRequest(request);
    setSheetVisible(true);
  };

  const handleSendOffer = async () => {
    if (!selectedRequest) return;
    setSendingOffer(true);
    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('taxi:sendOffer', { requestId: selectedRequest.requestId });
      } else {
        await taxiApi.sendOffer(selectedRequest.requestId);
      }
      showToast('Offre envoyée !', 'success');
      setSheetVisible(false);
    } catch (err: any) {
      showToast(err.message || 'Erreur envoi offre', 'error');
    } finally {
      setSendingOffer(false);
    }
  };

  if (!location) {
    return <LoadingSpinner fullScreen message="Récupération de votre position..." />;
  }

  const region: Region = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  const distanceToSelected =
    selectedRequest && myLocation
      ? haversineDistanceKm(
          myLocation.latitude, myLocation.longitude,
          selectedRequest.latitude, selectedRequest.longitude
        )
      : null;

  const routeOrigin = selectedRequest && myLocation ? myLocation : null;
  const routeDestination = selectedRequest
    ? { latitude: selectedRequest.latitude, longitude: selectedRequest.longitude }
    : null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        provider={MAP_PROVIDER}
        showsUserLocation
        showsMyLocationButton
        userInterfaceStyle="light"
      >
        {routeOrigin && routeDestination && (
          <RoutePolyline
            origin={routeOrigin}
            destination={routeDestination}
            onError={(message) => showToast(message, 'warning')}
          />
        )}

        {isOnline &&
          clientRequests.map((req) => (
            <ClientMarker
              key={req.requestId}
              requestId={req.requestId}
              latitude={req.latitude}
              longitude={req.longitude}
              label={req.clientName.split(' ')[0]}
              onPress={() => handleClientPress(req)}
            />
          ))}
      </MapView>

      {/* Header */}
      <SafeAreaView style={styles.headerWrapper}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{user?.fullName?.split(' ')[0]} 🚖</Text>
            <Text style={styles.subGreeting}>
              {isOnline
                ? `${clientRequests.length} client${clientRequests.length !== 1 ? 's' : ''} en attente`
                : 'Hors ligne'}
            </Text>
          </View>
          <View style={styles.onlineRow}>
            <Text style={styles.onlineLabel}>{isOnline ? 'En ligne' : 'Hors ligne'}</Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: COLORS.border, true: COLORS.green }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>
      </SafeAreaView>

      {/* Profile button */}
      <SafeAreaView style={styles.profileWrapper}>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('TaxiProfile')}
        >
          <Text style={styles.profileEmoji}>👤</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Status bar */}
      {!isOnline && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>
            Activez votre statut pour recevoir des demandes
          </Text>
        </View>
      )}

      {/* Client detail bottom sheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        height={300}
      >
        {selectedRequest && (
          <View style={styles.sheetContent}>
            <View style={styles.clientInfo}>
              <View style={styles.clientIconBox}>
                <Text style={{ fontSize: 28 }}>🙋</Text>
              </View>
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>{selectedRequest.clientName}</Text>
                {selectedRequest.destinationLocation && (
                  <Text style={styles.clientDest} numberOfLines={1}>
                    🎯 {selectedRequest.destinationLocation.latitude.toFixed(5)}, {selectedRequest.destinationLocation.longitude.toFixed(5)}
                  </Text>
                )}
                {distanceToSelected !== null && (
                  <>
                    <Text style={styles.clientDist}>
                      📍 {formatDistance(distanceToSelected)}
                    </Text>
                    <Text style={styles.clientEta}>
                      ⏱ Arrivée estimée : {formatEta(Math.ceil((distanceToSelected / 30) * 60))}
                    </Text>
                  </>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.offerBtn, sendingOffer && styles.btnDisabled]}
              onPress={handleSendOffer}
              disabled={sendingOffer}
              activeOpacity={0.85}
            >
              <Text style={styles.offerBtnText}>
                {sendingOffer ? 'Envoi...' : 'Envoyer une offre'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelSheetBtn}
              onPress={() => setSheetVisible(false)}
            >
              <Text style={styles.cancelSheetText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: StyleSheet.absoluteFillObject,
  headerWrapper: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    margin: SPACING.md,
    marginRight: 64,
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
  subGreeting: { fontSize: FONT_SIZE.sm, color: COLORS.mediumGray, marginTop: 2 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineLabel: { fontSize: FONT_SIZE.sm, color: COLORS.mediumGray },
  profileWrapper: { position: 'absolute', top: 0, right: 0 },
  profileBtn: {
    margin: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  profileEmoji: { fontSize: 22 },
  offlineBar: {
    position: 'absolute',
    bottom: 32,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: SPACING.md,
  },
  offlineText: { color: COLORS.white, textAlign: 'center', fontSize: FONT_SIZE.sm, fontWeight: '600' },
  sheetContent: { padding: SPACING.md, gap: SPACING.md },
  clientInfo: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  clientIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientDetails: { flex: 1, gap: 4 },
  clientName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  clientDest: { fontSize: FONT_SIZE.sm, color: COLORS.mediumGray },
  clientDist: { fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: '600' },
  clientEta: { fontSize: FONT_SIZE.sm, color: COLORS.mediumGray },
  offerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.6 },
  offerBtnText: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.dark },
  cancelSheetBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  cancelSheetText: { fontSize: FONT_SIZE.md, color: COLORS.mediumGray },
});
