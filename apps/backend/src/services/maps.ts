import axios from 'axios';
import { DirectionsResult, GeocodeResult, RouteCoordinate } from '@bebe-taxi/shared';
import { haversineDistanceKm, estimateEtaMinutes } from '@/utils/haversine';

class MapsServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim() || '';
const MAPS_PROVIDER = (process.env.MAPS_PROVIDER || 'google').toLowerCase();
const ENABLE_MAPS_FALLBACK = process.env.ENABLE_MAPS_FALLBACK !== 'false';

function formatDistanceMeters(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function buildStraightLineRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): DirectionsResult {
  const distanceKm = haversineDistanceKm(originLat, originLng, destLat, destLng);
  const distanceMeters = Math.round(distanceKm * 1000);
  const durationMinutes = estimateEtaMinutes(distanceKm);

  return {
    provider: 'fallback',
    distanceText: formatDistanceMeters(distanceMeters),
    distanceMeters,
    durationText: `${durationMinutes} min`,
    durationSeconds: durationMinutes * 60,
    coordinates: [
      { latitude: originLat, longitude: originLng },
      { latitude: destLat, longitude: destLng },
    ],
  };
}

function decodePolyline(encoded: string): RouteCoordinate[] {
  const points: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!address.trim()) {
    throw new MapsServiceError('address is required', 400);
  }

  if (!GOOGLE_MAPS_API_KEY || MAPS_PROVIDER !== 'google') {
    throw new MapsServiceError('maps provider not configured', 400);
  }

  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      address,
      key: GOOGLE_MAPS_API_KEY,
    },
    timeout: 12000,
  });

  const first = response.data?.results?.[0];
  if (!first?.geometry?.location) {
    throw new MapsServiceError('address not found', 404);
  }

  return {
    latitude: first.geometry.location.lat,
    longitude: first.geometry.location.lng,
    formattedAddress: first.formatted_address ?? address,
    provider: 'google',
  };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodeResult> {
  if (GOOGLE_MAPS_API_KEY && MAPS_PROVIDER === 'google') {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
      },
      timeout: 12000,
    });

    const first = response.data?.results?.[0];
    if (first?.geometry?.location) {
      return {
        latitude: first.geometry.location.lat,
        longitude: first.geometry.location.lng,
        formattedAddress: first.formatted_address ?? `${latitude}, ${longitude}`,
        provider: 'google',
      };
    }
  }

  return {
    latitude,
    longitude,
    formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    provider: 'fallback',
  };
}

async function fetchOsrmRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DirectionsResult | null> {
  try {
    const response = await axios.get(
      `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}`,
      {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: false,
        },
        timeout: 12000,
      }
    );

    const route = response.data?.routes?.[0];
    const coordinates =
      route?.geometry?.coordinates?.map(([lng, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lng,
      })) ?? [];

    if (!coordinates.length) return null;

    return {
      provider: 'osrm',
      distanceText: formatDistanceMeters(route.distance),
      distanceMeters: Math.round(route.distance),
      durationText: `${Math.max(1, Math.round(route.duration / 60))} min`,
      durationSeconds: Math.round(route.duration),
      coordinates,
    };
  } catch {
    return null;
  }
}

export async function getDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DirectionsResult> {
  if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
    throw new MapsServiceError('origin coordinates are required', 400);
  }
  if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) {
    throw new MapsServiceError('destination coordinates are required', 400);
  }

  if (GOOGLE_MAPS_API_KEY && MAPS_PROVIDER === 'google') {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: {
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
          mode: 'driving',
          key: GOOGLE_MAPS_API_KEY,
        },
        timeout: 12000,
      });

      const route = response.data?.routes?.[0];
      const leg = route?.legs?.[0];
      const encodedPolyline = route?.overview_polyline?.points;
      const coordinates = encodedPolyline ? decodePolyline(encodedPolyline) : [];

      if (leg && coordinates.length) {
        return {
          provider: 'google',
          distanceText: leg.distance?.text ?? formatDistanceMeters(leg.distance?.value ?? 0),
          distanceMeters: Math.round(leg.distance?.value ?? 0),
          durationText:
            leg.duration?.text ?? `${Math.max(1, Math.round((leg.duration?.value ?? 0) / 60))} min`,
          durationSeconds: Math.round(leg.duration?.value ?? 0),
          encodedPolyline,
          coordinates,
        };
      }
    } catch {
      // fall through to fallback providers
    }
  }

  const osrmRoute = ENABLE_MAPS_FALLBACK
    ? await fetchOsrmRoute(originLat, originLng, destLat, destLng)
    : null;

  if (osrmRoute) {
    return osrmRoute;
  }

  if (!ENABLE_MAPS_FALLBACK) {
    throw new MapsServiceError('route fallback disabled', 503);
  }

  return buildStraightLineRoute(originLat, originLng, destLat, destLng);
}

export { MapsServiceError };