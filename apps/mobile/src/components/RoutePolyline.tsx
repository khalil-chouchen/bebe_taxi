import React, { useEffect, useState } from 'react';
import { Polyline } from 'react-native-maps';
import { COLORS } from '../constants';
import { GOOGLE_MAPS_API_KEY, IS_DEV } from '../config/env';

interface LatLng {
  latitude: number;
  longitude: number;
}

interface RoutePolylineProps {
  origin: LatLng;
  destination: LatLng;
  color?: string;
  strokeWidth?: number;
}

async function fetchGoogleDirections(
  origin: LatLng,
  destination: LatLng,
  apiKey: string
): Promise<LatLng[]> {
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=driving&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.routes?.length) {
    return [];
  }

  return decodePolyline(data.routes[0].overview_polyline.points);
}

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
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
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

export default function RoutePolyline({
  origin,
  destination,
  color = COLORS.primary,
  strokeWidth = 4,
}: RoutePolylineProps) {
  const [coordinates, setCoordinates] = useState<LatLng[]>([origin, destination]);

  useEffect(() => {
    if (!origin || !destination) return;

    if (GOOGLE_MAPS_API_KEY) {
      fetchGoogleDirections(origin, destination, GOOGLE_MAPS_API_KEY)
        .then((pts) => {
          setCoordinates(pts.length > 0 ? pts : [origin, destination]);
        })
        .catch(() => setCoordinates([origin, destination]));
    } else {
      if (IS_DEV) {
        console.warn(
          '[RoutePolyline] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set — ' +
            'using straight-line fallback. Add your key to apps/mobile/.env.'
        );
      }
      setCoordinates([origin, destination]);
    }
  }, [origin.latitude, origin.longitude, destination.latitude, destination.longitude]);

  if (!coordinates.length) return null;

  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={color}
      strokeWidth={strokeWidth}
      lineDashPattern={[0]}
    />
  );
}
