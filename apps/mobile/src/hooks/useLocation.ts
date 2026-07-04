import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { LOCATION_UPDATE_INTERVAL_MS } from '@bebe-taxi/shared';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface UseLocationOptions {
  onUpdate?: (location: LocationCoords) => void;
  autoStart?: boolean;
}

export function useLocation(options: UseLocationOptions = {}) {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { onUpdate, autoStart = false } = options;

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied');
      return false;
    }
    setPermissionGranted(true);
    return true;
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LocationCoords | null> => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      onUpdate?.(coords);
      return coords;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [onUpdate]);

  const startTracking = useCallback(async () => {
    if (!permissionGranted) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    await getCurrentLocation();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(getCurrentLocation, LOCATION_UPDATE_INTERVAL_MS);
  }, [permissionGranted, requestPermission, getCurrentLocation]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await requestPermission();
      if (autoStart) await startTracking();
    })();

    return () => stopTracking();
  }, []);

  return {
    location,
    permissionGranted,
    error,
    requestPermission,
    getCurrentLocation,
    startTracking,
    stopTracking,
  };
}
