import React, { useEffect, useRef, useState } from 'react';
import { Polyline } from 'react-native-maps';
import { COLORS } from '../constants';
import { getRouteDirections } from '../services/maps.service';

interface LatLng {
  latitude: number;
  longitude: number;
}

interface RoutePolylineProps {
  origin: LatLng;
  destination: LatLng;
  color?: string;
  strokeWidth?: number;
  onError?: (message: string) => void;
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
  onError,
}: RoutePolylineProps) {
  const [coordinates, setCoordinates] = useState<LatLng[]>([origin, destination]);
  const onErrorRef = useRef<RoutePolylineProps['onError']>(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!origin || !destination) return;

    let cancelled = false;

    getRouteDirections(origin, destination)
      .then((route) => {
        if (cancelled) return;
        if (route.coordinates.length > 0) {
          setCoordinates(route.coordinates);
        } else {
          setCoordinates([origin, destination]);
        }
      })
      .catch((error: Error) => {
        if (cancelled) return;
        onErrorRef.current?.(error.message || 'Route unavailable');
        setCoordinates([origin, destination]);
      });

    return () => {
      cancelled = true;
    };
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
