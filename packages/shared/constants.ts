// Single source of truth for all shared constants — used by both backend and mobile.

// ─── Roles ────────────────────────────────────────────────────────────────────
export const ROLES = {
  CLIENT: 'client',
  TAXI: 'taxi',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ─── Socket event names ───────────────────────────────────────────────────────
export const SOCKET_EVENTS = {
  // Client → Server
  CLIENT_CREATE_REQUEST: 'client:createRequest',
  CLIENT_UPDATE_LOCATION: 'client:updateLocation',
  CLIENT_ACCEPT_OFFER: 'client:acceptOffer',
  CLIENT_CANCEL_REQUEST: 'client:cancelRequest',
  CLIENT_COMPLETE_TRIP: 'client:completeTrip',

  // Taxi → Server
  TAXI_UPDATE_LOCATION: 'taxi:updateLocation',
  TAXI_GO_ONLINE: 'taxi:goOnline',
  TAXI_GO_OFFLINE: 'taxi:goOffline',
  TAXI_SEND_OFFER: 'taxi:sendOffer',
  TAXI_ARRIVED: 'taxi:arrived',
  TAXI_COMPLETE_TRIP: 'taxi:completeTrip',

  // Server → Client / Taxi
  REQUEST_NEW: 'request:new',
  REQUEST_CANCELLED: 'request:cancelled',
  OFFER_NEW: 'offer:new',
  OFFER_ACCEPTED: 'offer:accepted',
  OFFER_REJECTED: 'offer:rejected',
  TRIP_STARTED: 'trip:started',
  TRIP_LOCATION_UPDATE: 'trip:locationUpdate',
  TRIP_ARRIVED: 'trip:arrived',
  TRIP_COMPLETED: 'trip:completed',
  ERROR: 'error',
} as const;

// ─── Request / Offer / Trip statuses ─────────────────────────────────────────
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export const OFFER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;

export const TRIP_STATUS = {
  ACTIVE: 'active',
  ARRIVED: 'arrived',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// ─── Thresholds & intervals ───────────────────────────────────────────────────
export const TAXI_ARRIVAL_RADIUS_METERS = 100;
export const REQUEST_EXPIRY_MINUTES = 10;
export const LOCATION_UPDATE_INTERVAL_MS = 4000;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const DEV_OTP_CODE = '123456';
