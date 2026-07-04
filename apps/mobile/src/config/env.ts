declare const __DEV__: boolean;

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const IS_DEV: boolean = __DEV__;

if (!API_URL) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_URL in apps/mobile/.env\n' +
      'Run "npm start" — the prestart script auto-detects your LAN IP.'
  );
}
if (!SOCKET_URL) {
  throw new Error(
    'Missing EXPO_PUBLIC_SOCKET_URL in apps/mobile/.env\n' +
      'Run "npm start" — the prestart script auto-detects your LAN IP.'
  );
}

export { API_URL, SOCKET_URL, GOOGLE_MAPS_API_KEY, IS_DEV };
