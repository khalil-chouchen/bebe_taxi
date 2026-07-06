import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export type LocationErrorCode = 'permission-denied' | 'gps-unavailable' | 'unknown';

export class LocationServiceError extends Error {
  code: LocationErrorCode;

  constructor(code: LocationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new LocationServiceError('permission-denied', 'Location permission denied');
    }

    return true;
  } catch (error) {
    if (error instanceof LocationServiceError) throw error;
    throw new LocationServiceError('unknown', 'Location permission denied');
  }
}

export async function getCurrentLocation(): Promise<LocationCoords> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      await requestLocationPermission();
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      throw new LocationServiceError('gps-unavailable', 'GPS unavailable');
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch (error) {
    if (error instanceof LocationServiceError) throw error;
    throw new LocationServiceError('unknown', 'GPS unavailable');
  }
}