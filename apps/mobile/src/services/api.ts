import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/env';
import { TOKEN_STORAGE_KEY } from '../constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

// Normalize error messages
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string }>) => {
    const message =
      error.response?.data?.error ||
      (error.code === 'ERR_NETWORK' ? 'Backend unavailable' : error.message) ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string) =>
    api.post<{ success: boolean; devCode?: string }>('/auth/send-otp', { phone }),

  verifyOtp: (phone: string, code: string) =>
    api.post<{ success: boolean }>('/auth/verify-otp', { phone, code }),

  registerClient: (data: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
  }) => api.post('/auth/register-client', data),

  registerTaxi: (data: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
    taxiNumber: string;
    matricule: string;
    avatarBase64?: string;
  }) => api.post('/auth/register-taxi', data),

  login: (phone: string, password: string, role: 'client' | 'taxi') =>
    api.post('/auth/login', { phone, password, role }),

  me: () => api.get('/auth/me'),
};

// ─── Client ───────────────────────────────────────────────────────────────────

export const clientApi = {
  updateLocation: (latitude: number, longitude: number) =>
    api.post('/client/location', { latitude, longitude }),

  getAvailableTaxis: () => api.get('/client/available-taxis'),

  requestTaxi: (payload: {
    pickupLocation: { latitude: number; longitude: number };
    destinationLocation?: { latitude: number; longitude: number };
  }) => api.post('/client/request-taxi', payload),

  getOffers: (requestId: string) => api.get(`/client/offers/${requestId}`),

  acceptOffer: (offerId: string, requestId: string) =>
    api.post('/client/accept-offer', { offerId, requestId }),

  submitReview: (tripId: string, rating: number, comment?: string) =>
    api.post('/client/review', { tripId, rating, comment }),
};

// ─── Taxi ─────────────────────────────────────────────────────────────────────

export const taxiApi = {
  updateLocation: (latitude: number, longitude: number) =>
    api.post('/taxi/location', { latitude, longitude }),

  setOnlineStatus: (isOnline: boolean) =>
    api.post('/taxi/online', { isOnline }),

  getActiveRequests: () => api.get('/taxi/active-requests'),

  sendOffer: (requestId: string) => api.post('/taxi/send-offer', { requestId }),

  markArrived: () => api.post('/taxi/arrived'),

  completeTrip: () => api.post('/taxi/complete-trip'),
};

// ─── Trip ─────────────────────────────────────────────────────────────────────

export const tripApi = {
  getCurrentTrip: () => api.get('/trip/current'),

  cancelTrip: (requestId?: string) => api.post('/trip/cancel', { requestId }),
};

export default api;
