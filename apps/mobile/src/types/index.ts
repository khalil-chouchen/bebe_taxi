export type UserRole = 'client' | 'taxi';

export interface User {
  _id: string;
  role: UserRole;
  fullName: string;
  phone: string;
  email: string;
  isPhoneVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface TaxiProfile {
  userId: string;
  taxiNumber: string;
  matricule: string;
  isOnline: boolean;
  isAvailable: boolean;
  averageRating: number;
  totalReviews: number;
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
  averageRating?: number;
}

export interface ClientMapMarker {
  requestId: string;
  clientId: string;
  clientName: string;
  latitude: number;
  longitude: number;
  destinationLocation?: {
    latitude: number;
    longitude: number;
  };
  expiresAt?: string;
}

export type RequestStatus = 'searching' | 'accepted' | 'cancelled' | 'completed';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type TripStatus = 'accepted' | 'arriving' | 'arrived' | 'completed' | 'cancelled';

export interface TaxiOffer {
  _id: string;
  requestId: string;
  taxiId: string;
  distanceKm: number;
  etaMinutes: number;
  status: OfferStatus;
  createdAt: string;
  taxi?: {
    fullName: string;
    phone: string;
    avatarUrl?: string;
    taxiNumber: string;
    matricule: string;
    averageRating?: number;
    totalReviews?: number;
  };
}

export interface Trip {
  _id: string;
  requestId: string;
  clientId: string;
  taxiId: string;
  status: TripStatus;
  acceptedAt: string;
  arrivedAt?: string;
  completedAt?: string;
}

export interface ActiveTripData {
  trip: Trip;
  otherParty: {
    userId: string;
    fullName: string;
    phone: string;
    avatarUrl?: string;
    taxiNumber?: string;
    matricule?: string;
    latitude: number;
    longitude: number;
  };
}

export type AuthMode = 'login' | 'register';

// Navigation param lists
export type RootStackParamList = {
  Welcome: undefined;
  RoleSelection: { mode: AuthMode };
  Login: { role: UserRole; mode: AuthMode };
  OTPVerification: { phone: string; nextScreen: 'ClientRegister' | 'TaxiRegister' | 'Login' };
  ClientRegister: { phone: string };
  TaxiRegister: { phone: string };
  ClientApp: undefined;
  TaxiApp: undefined;
};

export type ClientStackParamList = {
  ClientHomeMap: undefined;
  TaxiOffers: { requestId: string };
  ActiveTrip: { tripId: string };
  Review: { tripId: string; taxiId: string };
  ClientProfile: undefined;
};

export type TaxiStackParamList = {
  TaxiHomeMap: undefined;
  ActivePickup: { tripId: string };
  TaxiProfile: undefined;
};
