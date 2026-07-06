import { useState, useEffect, useRef, useCallback } from 'react';
import { LOCATION_UPDATE_INTERVAL_MS } from '@bebe-taxi/shared';
import {
  getCurrentLocation as fetchCurrentLocation,
  LocationCoords,
  LocationServiceError,
  requestLocationPermission,
} from '../services/location.service';

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
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setError('Location permission denied');
        return false;
      }
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (error) {
      const message = error instanceof LocationServiceError ? error.message : 'Location permission denied';
      setError(message);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LocationCoords | null> => {
    try {
      const coords = await fetchCurrentLocation();
      setLocation(coords);
      onUpdate?.(coords);
      setError(null);
      return coords;
    } catch (e: any) {
      setError(e instanceof LocationServiceError ? e.message : 'GPS unavailable');
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
