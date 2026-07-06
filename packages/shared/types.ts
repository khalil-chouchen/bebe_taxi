export type UserRole = 'client' | 'taxi';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  provider: 'google' | 'fallback';
}

export interface DirectionsResult {
  provider: 'google' | 'osrm' | 'fallback';
  distanceText: string;
  distanceMeters: number;
  durationText: string;
  durationSeconds: number;
  encodedPolyline?: string;
  coordinates: RouteCoordinate[];
}

export type MapsProvider = 'default' | 'google';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterClientPayload {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

export interface RegisterTaxiPayload {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  taxiNumber: string;
  matricule: string;
  avatarBase64?: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface UserPublic {
  _id: string;
  role: UserRole;
  fullName: string;
  phone: string;
  email: string;
  isPhoneVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
}

// ─── Taxi ─────────────────────────────────────────────────────────────────────

export interface TaxiPublic {
  userId: string;
  taxiNumber: string;
  matricule: string;
  currentLocation: GeoPoint;
  isOnline: boolean;
  isAvailable: boolean;
  averageRating: number;
  totalReviews: number;
  fullName: string;
  phone: string;
  avatarUrl?: string;
}

export interface TaxiMapMarker {
  taxiId: string;
  fullName: string;
  phone: string;
  avatarUrl?: string;
  taxiNumber: string;
  matricule: string;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
}

// ─── Request ──────────────────────────────────────────────────────────────────

export type RequestStatus = 'searching' | 'accepted' | 'cancelled' | 'completed';

export interface TaxiRequestPublic {
  _id: string;
  clientId: string;
  clientLocation: GeoPoint;
  destinationLocation?: GeoPoint;
  status: RequestStatus;
  acceptedTaxiId?: string;
  createdAt: string;
  expiresAt: string;
}

export interface ClientMapMarker {
  requestId: string;
  clientId: string;
  clientName: string;
  latitude: number;
  longitude: number;
}

// ─── Offer ────────────────────────────────────────────────────────────────────

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface TaxiOfferPublic {
  _id: string;
  requestId: string;
  taxiId: string;
  distanceKm: number;
  etaMinutes: number;
  status: OfferStatus;
  createdAt: string;
  taxi?: TaxiPublic;
}

// ─── Trip ─────────────────────────────────────────────────────────────────────

export type TripStatus = 'accepted' | 'arriving' | 'arrived' | 'completed' | 'cancelled';

export interface TripPublic {
  _id: string;
  requestId: string;
  clientId: string;
  taxiId: string;
  startLocation: GeoPoint;
  destinationLocation?: GeoPoint;
  taxiStartLocation: GeoPoint;
  status: TripStatus;
  acceptedAt: string;
  arrivedAt?: string;
  completedAt?: string;
  client?: UserPublic;
  taxi?: TaxiPublic & { profile: TaxiPublic };
}

// ─── Review ───────────────────────────────────────────────────────────────────

export interface ReviewPayload {
  tripId: string;
  rating: number;
  comment?: string;
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface LocationUpdate {
  latitude: number;
  longitude: number;
}

export interface SendOfferPayload {
  requestId: string;
  distanceKm: number;
  etaMinutes: number;
}

export interface AcceptOfferPayload {
  offerId: string;
  requestId: string;
}
