import { API_URL } from '../config/env';
import { DirectionsResult, GeocodeResult, LatLng } from '@bebe-taxi/shared';

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  const data = await response.json().catch(() => ({} as { error?: string }));

  if (!response.ok) {
    throw new Error(data.error || 'Backend unavailable');
  }

  return data as T;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const query = new URLSearchParams({ address });
  return requestJson<GeocodeResult>(`/maps/geocode?${query.toString()}`);
}

export async function reverseGeocode(location: LatLng): Promise<GeocodeResult> {
  const query = new URLSearchParams({
    lat: String(location.latitude),
    lng: String(location.longitude),
  });
  return requestJson<GeocodeResult>(`/maps/reverse-geocode?${query.toString()}`);
}

export async function getRouteDirections(origin: LatLng, destination: LatLng): Promise<DirectionsResult> {
  const query = new URLSearchParams({
    originLat: String(origin.latitude),
    originLng: String(origin.longitude),
    destLat: String(destination.latitude),
    destLng: String(destination.longitude),
  });

  return requestJson<DirectionsResult>(`/maps/directions?${query.toString()}`);
}

export function getStraightLineCoordinates(origin: LatLng, destination: LatLng): LatLng[] {
  return [origin, destination];
}