import { Platform } from 'react-native';
import { PROVIDER_GOOGLE } from 'react-native-maps';
import { MAPS_PROVIDER } from './env';

export const MAP_PROVIDER =
  Platform.OS === 'android' && MAPS_PROVIDER === 'google' ? PROVIDER_GOOGLE : undefined;

export const MAPS_PROVIDER_LABEL = MAPS_PROVIDER;

export const MAPS_ROUTE_FALLBACK_MESSAGE = 'Route unavailable';